'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Box, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import FilterForm, { type FilterInputs } from '../../../components/rc/FilterForm';
import ResultsCard from '../../../components/rc/ResultsCard';
import FrequencyResponseChart from '../../../components/charts/FrequencyResponseChart';
import { parseFarads, parseHertz, parseOhms } from '../../../lib/rc/parse';
import { solveCutoff, type SolveCutoffArgs, type SolveCutoffResult } from '../../../lib/rc/solve';
import type { RcFilterField, RcFilterMode } from '../../../lib/rc/types';
import { E12_SERIES } from '../../../lib/series/e12';
import { E24_SERIES } from '../../../lib/series/e24';
import { nearestNeighbors, type NeighborResult } from '../../../lib/series/nearest';

const DEBOUNCE_MS = 300;
const MAX_RESISTANCE_OHMS = 100_000_000; // 100 MΩ
const MAX_CAPACITANCE_F = 10; // 10 F
const MAX_FREQUENCY_HZ = 100_000_000; // 100 MHz
const INCONSISTENT_WARNING = 'Inputs are inconsistent. Showing result based on the most recent change.';

const comboPriority: Record<'default' | RcFilterField, Array<{ required: [RcFilterField, RcFilterField]; compute: RcFilterField }>> = {
  default: [
    { required: ['r', 'c'], compute: 'fc' },
    { required: ['fc', 'r'], compute: 'c' },
    { required: ['fc', 'c'], compute: 'r' }
  ],
  r: [
    { required: ['r', 'fc'], compute: 'c' },
    { required: ['r', 'c'], compute: 'fc' },
    { required: ['fc', 'c'], compute: 'r' }
  ],
  c: [
    { required: ['c', 'fc'], compute: 'r' },
    { required: ['r', 'c'], compute: 'fc' },
    { required: ['fc', 'r'], compute: 'c' }
  ],
  fc: [
    { required: ['fc', 'r'], compute: 'c' },
    { required: ['fc', 'c'], compute: 'r' },
    { required: ['r', 'c'], compute: 'fc' }
  ]
};

type ParsedInputs = {
  numbers: Partial<Record<RcFilterField, number>>;
  errors: Partial<Record<RcFilterField, string>>;
  infoMessages: Set<string>;
};

type CalculationOutcome = {
  resolved: Partial<Record<RcFilterField, number>>;
  computedField: RcFilterField | null;
  warningMessage: string | null;
  errorMessage: string | null;
  infoMessages: Set<string>;
  insufficient: boolean;
  errors: Partial<Record<RcFilterField, string>>;
};

function useDebouncedInputs(values: FilterInputs): FilterInputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function parseInputs(inputs: FilterInputs): ParsedInputs {
  const numbers: Partial<Record<RcFilterField, number>> = {};
  const errors: Partial<Record<RcFilterField, string>> = {};
  const infoMessages = new Set<string>();

  const rawR = inputs.r.trim();
  if (rawR) {
    const parsed = parseOhms(rawR);
    if (parsed instanceof Error) {
      errors.r = parsed.message;
    } else {
      numbers.r = parsed;
      if (parsed > MAX_RESISTANCE_OHMS) {
        infoMessages.add('Resistance is outside the suggested range (0 < R ≤ 100 MΩ).');
      }
    }
  }

  const rawC = inputs.c.trim();
  if (rawC) {
    const parsed = parseFarads(rawC);
    if (parsed instanceof Error) {
      errors.c = parsed.message;
    } else {
      numbers.c = parsed;
      if (parsed > MAX_CAPACITANCE_F) {
        infoMessages.add('Capacitance is outside the suggested range (0 < C ≤ 10 F).');
      }
    }
  }

  const rawFc = inputs.fc.trim();
  if (rawFc) {
    const parsed = parseHertz(rawFc);
    if (parsed instanceof Error) {
      errors.fc = parsed.message;
    } else {
      numbers.fc = parsed;
      if (parsed > MAX_FREQUENCY_HZ) {
        infoMessages.add('Cutoff frequency is outside the suggested range (0 < f_c ≤ 100 MHz).');
      }
    }
  }

  return { numbers, errors, infoMessages };
}

function getComboOrder(lastEdited: RcFilterField | null) {
  const key = lastEdited ?? 'default';
  const seen = new Set<string>();
  const order: Array<{ required: [RcFilterField, RcFilterField]; compute: RcFilterField }> = [];

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

function isSignificantlyDifferent(field: RcFilterField, provided: number, computed: number): boolean {
  if (!Number.isFinite(provided) || !Number.isFinite(computed)) {
    return false;
  }
  const diff = Math.abs(provided - computed);
  if (provided === 0) {
    return diff > Number.EPSILON;
  }
  const relative = diff / provided;
  return relative > 0.01;
}

function computeOutcome(parsed: ParsedInputs, lastEdited: RcFilterField | null): CalculationOutcome {
  const numbers = parsed.numbers;
  const errors: Partial<Record<RcFilterField, string>> = { ...parsed.errors };
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
  let computedField: RcFilterField | null = null;
  let solution: SolveCutoffResult | null = null;
  let solverError: Error | null = null;

  for (const combo of combos) {
    if (!combo.required.every((field) => numbers[field] !== undefined)) {
      continue;
    }
    const args: SolveCutoffArgs = {};
    combo.required.forEach((field) => {
      args[field] = numbers[field];
    });
    const result = solveCutoff(args);
    if (result instanceof Error) {
      solverError = result;
      if (!errors[combo.compute]) {
        errors[combo.compute] = result.message;
      }
      continue;
    }
    solution = result;
    computedField = combo.compute;
    break;
  }

  if (!solution || solution instanceof Error) {
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

  const resolved: Partial<Record<RcFilterField, number>> = {
    r: typeof solution.r === 'number' ? solution.r : numbers.r,
    c: typeof solution.c === 'number' ? solution.c : numbers.c,
    fc: typeof solution.fc === 'number' ? solution.fc : numbers.fc
  };

  if (resolved.r && resolved.r > MAX_RESISTANCE_OHMS) {
    infoMessages.add('Resistance is outside the suggested range (0 < R ≤ 100 MΩ).');
  }
  if (resolved.c && resolved.c > MAX_CAPACITANCE_F) {
    infoMessages.add('Capacitance is outside the suggested range (0 < C ≤ 10 F).');
  }
  if (resolved.fc && resolved.fc > MAX_FREQUENCY_HZ) {
    infoMessages.add('Cutoff frequency is outside the suggested range (0 < f_c ≤ 100 MHz).');
  }

  let warningMessage: string | null = null;
  if (computedField && numbers[computedField] !== undefined) {
    const provided = numbers[computedField]!;
    const computedValue = resolved[computedField];
    if (typeof computedValue === 'number' && isSignificantlyDifferent(computedField, provided, computedValue)) {
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

function RcFilterCalculatorContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } = useColorScheme();

  const initialMode = (searchParams.get('mode') as RcFilterMode) === 'highpass' ? 'highpass' : 'lowpass';
  const [mode, setMode] = React.useState<RcFilterMode>(initialMode);
  const [inputs, setInputs] = React.useState<FilterInputs>(() => ({
    r: searchParams.get('r') ?? '',
    c: searchParams.get('c') ?? '',
    fc: searchParams.get('fc') ?? ''
  }));
  const [lastEdited, setLastEdited] = React.useState<RcFilterField | null>(null);
  const debouncedInputs = useDebouncedInputs(inputs);
  const lastUrlRef = React.useRef<string>('');

  const parsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);
  const outcome = React.useMemo(() => computeOutcome(parsed, lastEdited), [parsed, lastEdited]);

  const neighbors: NeighborResult | null = React.useMemo(() => {
    if (!outcome.computedField) {
      return null;
    }
    const value = outcome.resolved[outcome.computedField];
    if (typeof value !== 'number' || value <= 0) {
      return null;
    }
    if (outcome.computedField === 'r') {
      return nearestNeighbors(value, E24_SERIES);
    }
    if (outcome.computedField === 'c') {
      return nearestNeighbors(value, E12_SERIES);
    }
    return null;
  }, [outcome]);

  const handleInputChange = React.useCallback((field: RcFilterField, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setLastEdited(field);
  }, []);

  const handleClear = React.useCallback((field: RcFilterField) => {
    setInputs((prev) => ({ ...prev, [field]: '' }));
    setLastEdited(field);
  }, []);

  const handleModeChange = React.useCallback((nextMode: RcFilterMode) => {
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
    (['r', 'c', 'fc'] as RcFilterField[]).forEach((field) => {
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
  const infoMessages = React.useMemo(() => Array.from(outcome.infoMessages), [outcome.infoMessages]);

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={1}>
            <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
              Filter Tools
            </Typography>
            <Typography variant="h3" component="h1">
              Passive RC Filter
            </Typography>
          </Stack>
          <IconButton aria-label="Toggle color scheme" onClick={handleToggleColorScheme} color="primary">
            {colorSchemeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Stack>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={6}>
            <FilterForm
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
              r={typeof outcome.resolved.r === 'number' ? outcome.resolved.r : undefined}
              c={typeof outcome.resolved.c === 'number' ? outcome.resolved.c : undefined}
              fc={typeof outcome.resolved.fc === 'number' ? outcome.resolved.fc : undefined}
              computedField={outcome.computedField}
              neighbors={neighbors}
              insufficient={outcome.insufficient}
              warningMessage={outcome.warningMessage}
              infoMessages={infoMessages}
              errorMessage={outcome.errorMessage}
            />
          </Grid>
        </Grid>

        <FrequencyResponseChart
          mode={mode}
          rOhms={typeof outcome.resolved.r === 'number' ? outcome.resolved.r : undefined}
          cFarads={typeof outcome.resolved.c === 'number' ? outcome.resolved.c : undefined}
          fcHz={typeof outcome.resolved.fc === 'number' ? outcome.resolved.fc : undefined}
        />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Notes
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            1st-order RC cutoff: f_c = 1/(2πRC) (low-pass & high-pass).{' '}
            <a href="https://www.electronics-tutorials.ws/filter/filter_2.html" target="_blank" rel="noreferrer">
              Basic Electronics Tutorials
            </a>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            E12 (capacitors) & E24 (resistors) preferred number series.{' '}
            <a href="https://bourns.com/support/technical-articles/standard-values-used-in-capacitors-inductors-and-resistors" target="_blank" rel="noreferrer">
              Bourns
            </a>
          </Typography>
        </Box>
      </Stack>
    </Container>
  );
}

export default function RcFilterCalculatorPage() {
  return (
    <React.Suspense fallback={null}>
      <RcFilterCalculatorContent />
    </React.Suspense>
  );
}
