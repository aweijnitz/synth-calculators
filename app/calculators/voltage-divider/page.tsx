'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Box, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import CalculatorHeader from '../../../components/common/CalculatorHeader';
import DividerForm, { type DividerInputs } from '../../../components/vdiv/DividerForm';
import ResultsCard from '../../../components/vdiv/ResultsCard';
import { parseOhms, parseVolts } from '../../../lib/vdiv/parse';
import {
  solveVoltageDivider,
  type VoltageDividerField,
  type VoltageDividerInputs,
  type VoltageDividerResult
} from '../../../lib/vdiv/solve';
import { E24_SERIES } from '../../../lib/series/e24';
import { nearestNeighbors, type NeighborResult } from '../../../lib/series/nearest';

const DEBOUNCE_MS = 300;
const MAX_RESISTANCE_OHMS = 100_000_000;
const MAX_VOLTAGE_MAGNITUDE = 1_000;
const INCONSISTENT_WARNING = 'Inputs are inconsistent. Showing result based on the most recent change.';
const RANGE_WARNING = 'Volt_out is outside the span between Volt_high and Volt_low. Please double-check your inputs.';
const FIELDS: readonly VoltageDividerField[] = ['vh', 'vl', 'r1', 'r2', 'vo'];

const DEFAULT_INPUTS: DividerInputs = {
  vh: '11.5',
  vl: '0',
  r1: '',
  r2: '',
  vo: ''
};

type ParsedInputs = {
  numbers: Partial<Record<VoltageDividerField, number>>;
  errors: Partial<Record<VoltageDividerField, string>>;
  infoMessages: Set<string>;
};

type CalculationOutcome = {
  resolved: Partial<Record<VoltageDividerField, number>>;
  computedField: VoltageDividerField | null;
  insufficient: boolean;
  warningMessages: string[];
  errorMessage: string | null;
  infoMessages: Set<string>;
  errors: Partial<Record<VoltageDividerField, string>>;
  helperNeeded: boolean;
};

function useDebouncedInputs(values: DividerInputs): DividerInputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function fieldLabel(field: VoltageDividerField): string {
  switch (field) {
    case 'vh':
      return 'Volt_high';
    case 'vl':
      return 'Volt_low';
    case 'vo':
      return 'Volt_out';
    default:
      return field.toUpperCase();
  }
}

function addResistanceInfo(field: VoltageDividerField, value: number, infoMessages: Set<string>) {
  if (value > MAX_RESISTANCE_OHMS) {
    infoMessages.add(`${field.toUpperCase()} is outside the suggested range (0 < R ≤ 100 MΩ).`);
  }
}

function addVoltageInfo(field: VoltageDividerField, value: number, infoMessages: Set<string>) {
  if (Math.abs(value) > MAX_VOLTAGE_MAGNITUDE) {
    infoMessages.add(`${fieldLabel(field)} is outside the suggested range (-1 kV ≤ V ≤ 1 kV).`);
  }
}

function parseInputs(values: DividerInputs): ParsedInputs {
  const numbers: Partial<Record<VoltageDividerField, number>> = {};
  const errors: Partial<Record<VoltageDividerField, string>> = {};
  const infoMessages = new Set<string>();

  const processVoltage = (field: VoltageDividerField) => {
    const raw = values[field].trim();
    if (!raw) {
      return;
    }
    const parsed = parseVolts(raw);
    if (parsed instanceof Error) {
      errors[field] = parsed.message;
      return;
    }
    numbers[field] = parsed;
    addVoltageInfo(field, parsed, infoMessages);
  };

  const processResistance = (field: 'r1' | 'r2') => {
    const raw = values[field].trim();
    if (!raw) {
      return;
    }
    const parsed = parseOhms(raw);
    if (parsed instanceof Error) {
      errors[field] = parsed.message;
      return;
    }
    numbers[field] = parsed;
    addResistanceInfo(field, parsed, infoMessages);
  };

  processVoltage('vh');
  processVoltage('vl');
  processVoltage('vo');
  processResistance('r1');
  processResistance('r2');

  return { numbers, errors, infoMessages };
}

function isSignificantlyDifferent(provided: number, computed: number): boolean {
  const diff = Math.abs(provided - computed);
  if (diff < 1e-6) {
    return false;
  }
  const reference = Math.max(Math.abs(provided), Math.abs(computed), 1);
  return diff / reference > 0.005;
}

function computeOutcome(
  parsed: ParsedInputs,
  rawInputs: DividerInputs,
  lastEdited: VoltageDividerField | null
): CalculationOutcome {
  const numbers = parsed.numbers;
  const errors: Partial<Record<VoltageDividerField, string>> = { ...parsed.errors };
  const infoMessages = new Set(parsed.infoMessages);
  const emptyFields = FIELDS.filter((field) => rawInputs[field].trim() === '');
  const helperNeeded = emptyFields.length !== 1;
  const insufficient = emptyFields.length > 1;

  let computedField: VoltageDividerField | null = null;
  let solution: VoltageDividerResult | null = null;
  let solverError: Error | null = null;

  let target: VoltageDividerField | null = null;
  if (emptyFields.length === 1) {
    target = emptyFields[0];
  } else if (emptyFields.length === 0) {
    target = lastEdited ?? 'vo';
  }

  if (target) {
    const required = FIELDS.filter((field) => field !== target);
    const hasAllRequired = required.every((field) => typeof numbers[field] === 'number');
    if (hasAllRequired) {
      const solverInputs: VoltageDividerInputs = { lastChanged: lastEdited ?? undefined };
      required.forEach((field) => {
        solverInputs[field] = numbers[field]!;
      });
      const result = solveVoltageDivider(solverInputs);
      if (result instanceof Error) {
        solverError = result;
        if (!errors[target]) {
          errors[target] = result.message;
        }
      } else {
        solution = result;
        computedField = target;
      }
    }
  }

  const resolved: Partial<Record<VoltageDividerField, number>> = {};
  FIELDS.forEach((field) => {
    const fromSolution = solution?.[field];
    if (typeof fromSolution === 'number') {
      resolved[field] = fromSolution;
    } else if (typeof numbers[field] === 'number') {
      resolved[field] = numbers[field]!;
    }
  });

  if (typeof resolved.r1 === 'number') {
    addResistanceInfo('r1', resolved.r1, infoMessages);
  }
  if (typeof resolved.r2 === 'number') {
    addResistanceInfo('r2', resolved.r2, infoMessages);
  }
  if (typeof resolved.vh === 'number') {
    addVoltageInfo('vh', resolved.vh, infoMessages);
  }
  if (typeof resolved.vl === 'number') {
    addVoltageInfo('vl', resolved.vl, infoMessages);
  }
  if (typeof resolved.vo === 'number') {
    addVoltageInfo('vo', resolved.vo, infoMessages);
  }

  const warningMessages: string[] = [];
  if (computedField && emptyFields.length === 0) {
    const provided = numbers[computedField];
    const computedValue = resolved[computedField];
    if (typeof provided === 'number' && typeof computedValue === 'number' && isSignificantlyDifferent(provided, computedValue)) {
      warningMessages.push(INCONSISTENT_WARNING);
    }
  }

  if (
    typeof resolved.vh === 'number' &&
    typeof resolved.vl === 'number' &&
    typeof resolved.vo === 'number' &&
    typeof resolved.r1 === 'number' &&
    typeof resolved.r2 === 'number' &&
    resolved.r1 > 0 &&
    resolved.r2 > 0
  ) {
    const low = Math.min(resolved.vh, resolved.vl);
    const high = Math.max(resolved.vh, resolved.vl);
    if (resolved.vo < low - 1e-6 || resolved.vo > high + 1e-6) {
      warningMessages.push(RANGE_WARNING);
    }
  }

  return {
    resolved,
    computedField,
    insufficient,
    warningMessages,
    errorMessage: solverError ? solverError.message : null,
    infoMessages,
    errors,
    helperNeeded
  };
}

function VoltageDividerCalculatorContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } = useColorScheme();

  const [inputs, setInputs] = React.useState<DividerInputs>(() => ({
    vh: searchParams.get('vh') ?? DEFAULT_INPUTS.vh,
    vl: searchParams.get('vl') ?? DEFAULT_INPUTS.vl,
    r1: searchParams.get('r1') ?? DEFAULT_INPUTS.r1,
    r2: searchParams.get('r2') ?? DEFAULT_INPUTS.r2,
    vo: searchParams.get('vo') ?? DEFAULT_INPUTS.vo
  }));
  const [lastEdited, setLastEdited] = React.useState<VoltageDividerField | null>(null);
  const debouncedInputs = useDebouncedInputs(inputs);
  const lastUrlRef = React.useRef<string>('');

  const parsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);
  const outcome = React.useMemo(
    () => computeOutcome(parsed, debouncedInputs, lastEdited),
    [parsed, debouncedInputs, lastEdited]
  );

  const neighbors: NeighborResult | null = React.useMemo(() => {
    if (!outcome.computedField) {
      return null;
    }
    const field = outcome.computedField;
    if (field !== 'r1' && field !== 'r2') {
      return null;
    }
    const value = outcome.resolved[field];
    if (typeof value !== 'number' || value <= 0) {
      return null;
    }
    return nearestNeighbors(value, E24_SERIES);
  }, [outcome]);

  const handleInputChange = React.useCallback((field: VoltageDividerField, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setLastEdited(field);
  }, []);

  const handleClear = React.useCallback((field: VoltageDividerField) => {
    setInputs((prev) => ({ ...prev, [field]: '' }));
    setLastEdited(field);
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
    FIELDS.forEach((field) => {
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
  }, [debouncedInputs, pathname, router]);

  const helperMessage = outcome.helperNeeded ? 'Leave exactly one field empty to calculate it.' : undefined;
  const infoMessages = React.useMemo(() => Array.from(outcome.infoMessages), [outcome.infoMessages]);

  return (
    <>
      <CalculatorHeader title="Voltage Divider Calculator" />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={1}>
            <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
              Divider Tools
            </Typography>
            <Typography variant="h3" component="h1">
              Voltage Divider
            </Typography>
          </Stack>
          <IconButton aria-label="Toggle color scheme" onClick={handleToggleColorScheme} color="primary">
            {colorSchemeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Stack>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={6}>
            <DividerForm
              values={inputs}
              onChange={handleInputChange}
              onClear={handleClear}
              errors={outcome.errors}
              helperMessage={helperMessage}
              warningMessages={outcome.warningMessages}
              infoMessages={infoMessages}
              calculationError={outcome.errorMessage}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ResultsCard
              vh={typeof outcome.resolved.vh === 'number' ? outcome.resolved.vh : undefined}
              vl={typeof outcome.resolved.vl === 'number' ? outcome.resolved.vl : undefined}
              r1={typeof outcome.resolved.r1 === 'number' ? outcome.resolved.r1 : undefined}
              r2={typeof outcome.resolved.r2 === 'number' ? outcome.resolved.r2 : undefined}
              vo={typeof outcome.resolved.vo === 'number' ? outcome.resolved.vo : undefined}
              computedField={outcome.computedField}
              neighbors={neighbors}
              insufficient={outcome.insufficient}
              warningMessages={outcome.warningMessages}
              infoMessages={infoMessages}
              errorMessage={outcome.errorMessage}
            />
          </Grid>
        </Grid>

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Quick reference
          </Typography>
          <Typography variant="body2" color="text.secondary">
            V_out = V_l + (R2 / (R1 + R2)) · (V_h - V_l)
          </Typography>
        </Box>
      </Stack>
      </Container>
    </>
  );
}

export default function VoltageDividerCalculatorPage() {
  return (
    <React.Suspense fallback={null}>
      <VoltageDividerCalculatorContent />
    </React.Suspense>
  );
}
