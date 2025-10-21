'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Box, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import CalculatorHeader from '../../../components/common/CalculatorHeader';
import CalculatorForm, { type CalculatorField, type CalculatorInputs } from '../../../components/opamp/CalculatorForm';
import ResultsCard from '../../../components/opamp/ResultsCard';
import { nearestE24Neighbors } from '../../../lib/opamp/e24';
import { inputImpedance, type OpAmpMode } from '../../../lib/opamp/impedance';
import { parseOhms } from '../../../lib/opamp/parse';
import { solveInverting, solveNonInverting, type SolveArgs, type SolveResult } from '../../../lib/opamp/solve';

const DEBOUNCE_MS = 300;
const MAX_RESISTOR_OHMS = 100_000_000;
const MIN_RESISTOR_INFO = 10;
const MAX_GAIN_MAGNITUDE = 1_000_000;
const INCONSISTENT_WARNING = 'Inputs are inconsistent. Showing result based on the most recent change.';

const comboPriority: Record<'default' | CalculatorField, Array<{ required: [CalculatorField, CalculatorField]; compute: CalculatorField }>> = {
  default: [
    { required: ['rin', 'rf'], compute: 'gain' },
    { required: ['gain', 'rin'], compute: 'rf' },
    { required: ['gain', 'rf'], compute: 'rin' }
  ],
  rin: [
    { required: ['gain', 'rin'], compute: 'rf' },
    { required: ['rin', 'rf'], compute: 'gain' },
    { required: ['gain', 'rf'], compute: 'rin' }
  ],
  rf: [
    { required: ['gain', 'rf'], compute: 'rin' },
    { required: ['rin', 'rf'], compute: 'gain' },
    { required: ['gain', 'rin'], compute: 'rf' }
  ],
  gain: [
    { required: ['gain', 'rin'], compute: 'rf' },
    { required: ['gain', 'rf'], compute: 'rin' },
    { required: ['rin', 'rf'], compute: 'gain' }
  ]
};

type ParsedInputs = {
  numbers: Partial<Record<CalculatorField, number>>;
  errors: Partial<Record<CalculatorField, string>>;
  infoMessages: Set<string>;
};

type CalculationOutcome = {
  resolved: Partial<SolveResult> & { gain?: number };
  computedField: CalculatorField | null;
  warningMessage: string | null;
  errorMessage: string | null;
  infoMessages: Set<string>;
  insufficient: boolean;
  errors: Partial<Record<CalculatorField, string>>;
};

function useDebouncedInputs(values: CalculatorInputs): CalculatorInputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function parseInputs(inputs: CalculatorInputs): ParsedInputs {
  const numbers: Partial<Record<CalculatorField, number>> = {};
  const errors: Partial<Record<CalculatorField, string>> = {};
  const infoMessages = new Set<string>();

  (['rin', 'rf'] as const).forEach((field) => {
    const raw = inputs[field].trim();
    if (!raw) {
      return;
    }
    const parsed = parseOhms(raw);
    if (parsed instanceof Error) {
      errors[field] = parsed.message;
      return;
    }
    numbers[field] = parsed;
    if (parsed > MAX_RESISTOR_OHMS) {
      infoMessages.add('This value is unusually large for typical audio op-amp circuits.');
    } else if (parsed < MIN_RESISTOR_INFO) {
      infoMessages.add('This value is unusually small for typical audio op-amp circuits.');
    }
  });

  const gainRaw = inputs.gain.trim();
  if (gainRaw) {
    const parsed = Number(gainRaw);
    if (!Number.isFinite(parsed)) {
      errors.gain = 'Please enter a valid number.';
    } else if (parsed === 0) {
      errors.gain = 'Please enter a value greater than zero.';
    } else {
      numbers.gain = parsed;
      if (Math.abs(parsed) > MAX_GAIN_MAGNITUDE) {
        infoMessages.add('This value is unusually large for typical audio op-amp circuits.');
      }
    }
  }

  return { numbers, errors, infoMessages };
}

function getComboOrder(lastEdited: CalculatorField | null): Array<{ required: [CalculatorField, CalculatorField]; compute: CalculatorField }> {
  const key = lastEdited ?? 'default';
  const seen = new Set<string>();
  const order: Array<{ required: [CalculatorField, CalculatorField]; compute: CalculatorField }> = [];
  comboPriority[key].forEach((combo) => {
    const signature = `${combo.required[0]}-${combo.required[1]}-${combo.compute}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      order.push(combo);
    }
  });
  comboPriority.default.forEach((combo) => {
    const signature = `${combo.required[0]}-${combo.required[1]}-${combo.compute}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      order.push(combo);
    }
  });
  return order;
}

function mergeErrors(
  base: Partial<Record<CalculatorField, string>>,
  message: string,
  fallbackField: CalculatorField
) {
  const normalized = message.toLowerCase();
  if (normalized.includes('gain')) {
    base.gain = message;
    return;
  }
  if (normalized.includes('rin') || normalized.includes('input resistor')) {
    base.rin = message;
    return;
  }
  if (normalized.includes('rf') || normalized.includes('feedback')) {
    base.rf = message;
    return;
  }
  base[fallbackField] = message;
}

function computeOutcome(
  mode: OpAmpMode,
  parsed: ParsedInputs,
  lastEdited: CalculatorField | null
): CalculationOutcome {
  const numbers = parsed.numbers;
  const errors: Partial<Record<CalculatorField, string>> = { ...parsed.errors };
  const infoMessages = new Set(parsed.infoMessages);
  const providedCount = Object.values(numbers).filter((value) => value !== undefined).length;

  if (providedCount < 2) {
    return {
      resolved: {},
      computedField: null,
      warningMessage: null,
      errorMessage: null,
      infoMessages,
      insufficient: true,
      errors
    };
  }

  const combos = getComboOrder(lastEdited);
  let computedField: CalculatorField | null = null;
  let solution: SolveResult | null = null;
  let solverError: Error | null = null;

  for (const combo of combos) {
    if (!combo.required.every((field) => numbers[field] !== undefined)) {
      continue;
    }
    const args: SolveArgs = {};
    combo.required.forEach((field) => {
      args[field] = numbers[field];
    });
    const result = (mode === 'inverting' ? solveInverting : solveNonInverting)(args);
    if (result instanceof Error) {
      solverError = result;
      mergeErrors(errors, result.message, combo.compute);
      continue;
    }
    solution = result;
    computedField = combo.compute;
    break;
  }

  if (!solution) {
    return {
      resolved: {},
      computedField: null,
      warningMessage: null,
      errorMessage: solverError ? solverError.message : 'Unable to compute values with the current inputs.',
      infoMessages,
      insufficient: false,
      errors
    };
  }

  const resolved: Partial<SolveResult> & { gain?: number } = {
    gain: solution.gain,
    rin: solution.rin ?? numbers.rin,
    rf: solution.rf ?? numbers.rf
  };

  if (resolved.rin && (resolved.rin > MAX_RESISTOR_OHMS || resolved.rin < MIN_RESISTOR_INFO)) {
    infoMessages.add(
      resolved.rin > MAX_RESISTOR_OHMS
        ? 'This value is unusually large for typical audio op-amp circuits.'
        : 'This value is unusually small for typical audio op-amp circuits.'
    );
  }

  if (resolved.rf && (resolved.rf > MAX_RESISTOR_OHMS || resolved.rf < MIN_RESISTOR_INFO)) {
    infoMessages.add(
      resolved.rf > MAX_RESISTOR_OHMS
        ? 'This value is unusually large for typical audio op-amp circuits.'
        : 'This value is unusually small for typical audio op-amp circuits.'
    );
  }

  if (resolved.gain && Math.abs(resolved.gain) > MAX_GAIN_MAGNITUDE) {
    infoMessages.add('This value is unusually large for typical audio op-amp circuits.');
  }

  let warningMessage: string | null = null;
  if (computedField && numbers[computedField] !== undefined) {
    const provided = numbers[computedField]!;
    const computedValue = resolved[computedField as keyof SolveResult];
    if (typeof computedValue === 'number' && Math.abs(provided - computedValue) > 0.5) {
      warningMessage = INCONSISTENT_WARNING;
    }
  }

  return {
    resolved,
    computedField,
    warningMessage,
    errorMessage: null,
    infoMessages,
    insufficient: false,
    errors
  };
}

function OpAmpGainPageContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } = useColorScheme();

  const initialMode = (searchParams.get('mode') as OpAmpMode) === 'non-inverting' ? 'non-inverting' : 'inverting';
  const [mode, setMode] = React.useState<OpAmpMode>(initialMode);
  const [inputs, setInputs] = React.useState<CalculatorInputs>(() => ({
    rin: searchParams.get('rin') ?? '',
    rf: searchParams.get('rf') ?? '',
    gain: searchParams.get('gain') ?? ''
  }));
  const [lastEdited, setLastEdited] = React.useState<CalculatorField | null>(null);
  const debouncedInputs = useDebouncedInputs(inputs);
  const lastUrlRef = React.useRef<string>('');

  const parsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);
  const outcome = React.useMemo(() => computeOutcome(mode, parsed, lastEdited), [mode, parsed, lastEdited]);

  const neighbors = React.useMemo(() => {
    if (!outcome.computedField) {
      return null;
    }
    const value = outcome.resolved[outcome.computedField as keyof SolveResult];
    if (typeof value !== 'number' || value <= 0) {
      return null;
    }
    if (outcome.computedField === 'gain') {
      return null;
    }
    return nearestE24Neighbors(value);
  }, [outcome]);

  const impedance = React.useMemo(() => {
    const rinValue = typeof outcome.resolved.rin === 'number' ? outcome.resolved.rin : undefined;
    return inputImpedance(mode, rinValue);
  }, [mode, outcome.resolved.rin]);

  const handleInputChange = React.useCallback((field: CalculatorField, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setLastEdited(field);
  }, []);

  const handleClear = React.useCallback((field: CalculatorField) => {
    setInputs((prev) => ({ ...prev, [field]: '' }));
    setLastEdited(field);
  }, []);

  const handleModeChange = React.useCallback((nextMode: OpAmpMode) => {
    setMode(nextMode);
  }, []);

  const handleToggleColorScheme = React.useCallback(() => {
    if (!setColorSchemeMode) {
      return;
    }
    const next = colorSchemeMode === 'dark' ? 'light' : 'dark';
    setColorSchemeMode(next);
  }, [colorSchemeMode, setColorSchemeMode]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    (['rin', 'rf', 'gain'] as const).forEach((field) => {
      const raw = debouncedInputs[field].trim();
      if (raw) {
        params.set(field, raw);
      }
    });
    const queryString = params.toString();
    const target = queryString ? `${pathname}?${queryString}` : pathname;
    if (target !== lastUrlRef.current) {
      router.replace(target as Route, { scroll: false });
      lastUrlRef.current = target;
    }
  }, [debouncedInputs, mode, pathname, router]);

  const helperMessage = outcome.insufficient ? 'Enter any two values to compute the third.' : undefined;
  const infoMessages = Array.from(outcome.infoMessages);

  return (
    <>
      <CalculatorHeader title="Op-Amp Gain Calculator" />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={1}>
            <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
              Op-Amp Tools
            </Typography>
            <Typography variant="h3" component="h1">
              Gain Calculator
            </Typography>
          </Stack>
          <IconButton aria-label="Toggle color scheme" onClick={handleToggleColorScheme} color="primary">
            {colorSchemeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Stack>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={6}>
            <CalculatorForm
              mode={mode}
              onModeChange={handleModeChange}
              values={inputs}
              onChange={handleInputChange}
              onClear={handleClear}
              errors={outcome.errors}
              helperMessage={helperMessage}
              warningMessage={outcome.warningMessage}
              infoMessages={infoMessages}
              calculationError={outcome.errorMessage}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ResultsCard
              mode={mode}
              rin={typeof outcome.resolved.rin === 'number' ? outcome.resolved.rin : undefined}
              rf={typeof outcome.resolved.rf === 'number' ? outcome.resolved.rf : undefined}
              gain={typeof outcome.resolved.gain === 'number' ? outcome.resolved.gain : undefined}
              computedField={outcome.computedField}
              neighbors={neighbors}
              inputImpedance={impedance}
              insufficient={outcome.insufficient}
              warningMessage={outcome.warningMessage}
              infoMessages={infoMessages}
              errorMessage={outcome.errorMessage}
            />
          </Grid>
        </Grid>

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Notes
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Inverting: Gain = −Rf / Rin | Non-inverting: Gain = 1 + (Rf / Rin)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Gain_dB = 20 · log10(|Gain|)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            TL072 input impedance approximated as infinite at DC. Rail/headroom, bandwidth, and noise are out of scope for v1.
          </Typography>
        </Box>
      </Stack>
      </Container>
    </>
  );
}

export default function OpAmpGainPage() {
  return (
    <React.Suspense fallback={null}>
      <OpAmpGainPageContent />
    </React.Suspense>
  );
}
