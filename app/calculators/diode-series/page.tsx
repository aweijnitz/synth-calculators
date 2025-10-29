'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Box, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import CalculatorHeader from '../../../components/common/CalculatorHeader';
import InputsForm, { type DiodeField, type DiodeInputs } from '../../../components/diode/InputsForm';
import ResultsCard from '../../../components/diode/ResultsCard';
import { formatOhms, formatVolts, parseCurrent, parseOhms, parseVolts } from '../../../lib/diode/parse';
import { solveDiodeSeries, type DiodeField as SolverField, type Inputs as SolverInputs } from '../../../lib/diode/solve';
import { E24_SERIES } from '../../../lib/series/e24';
import { nearestNeighbors, type NeighborResult } from '../../../lib/series/nearest';

const DEBOUNCE_MS = 300;
const INCONSISTENT_WARNING = 'Inputs are inconsistent. Showing result based on the most recent change.';
const FIELDS: readonly DiodeField[] = ['vs', 'vf', 'if', 'r'];
const DEFAULT_INPUTS: DiodeInputs = { vs: '', vf: '0.7', if: '', r: '' };
const CURRENT_INFO = 'If is outside the suggested range (0 < I <= 1 A).';
const RESISTOR_INFO = 'R is outside the suggested range (1 Ω <= R <= 100 MΩ).';
const SUPPLY_INFO = 'Vs is outside the suggested range (0 < Vs <= 1 kV).';

type ParsedInputs = {
  numbers: Partial<Record<DiodeField, number>>;
  errors: Partial<Record<DiodeField, string>>;
  infoMessages: Set<string>;
};

type CalculationOutcome = {
  resolved: Partial<Record<DiodeField, number>>;
  computedField: SolverField | null;
  insufficient: boolean;
  helperNeeded: boolean;
  warningMessages: string[];
  errorMessage: string | null;
  infoMessages: Set<string>;
  neighbors: NeighborResult | null;
};

function toSolverField(field: DiodeField): SolverField {
  return field === 'if' ? 'ifA' : field;
}

function useDebouncedInputs(values: DiodeInputs): DiodeInputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function addRangeInfo(field: DiodeField, value: number, infoMessages: Set<string>) {
  if (!Number.isFinite(value)) {
    return;
  }
  switch (field) {
    case 'if':
      if (value <= 0 || value > 1) {
        infoMessages.add(CURRENT_INFO);
      }
      break;
    case 'r':
      if (value < 1 || value > 100_000_000) {
        infoMessages.add(RESISTOR_INFO);
      }
      break;
    case 'vs':
      if (value <= 0 || value > 1_000) {
        infoMessages.add(SUPPLY_INFO);
      }
      break;
    default:
      break;
  }
}

function parseInputs(raw: DiodeInputs): ParsedInputs {
  const numbers: ParsedInputs['numbers'] = {};
  const errors: ParsedInputs['errors'] = {};
  const infoMessages = new Set<string>();

  FIELDS.forEach((field) => {
    const value = raw[field].trim();
    if (!value) {
      return;
    }

    let parsed: number | Error;
    switch (field) {
      case 'vs':
      case 'vf':
        parsed = parseVolts(value);
        break;
      case 'if':
        parsed = parseCurrent(value);
        break;
      case 'r':
        parsed = parseOhms(value);
        break;
      default:
        parsed = new Error('Unsupported field.');
    }

    if (parsed instanceof Error) {
      errors[field] = parsed.message;
      return;
    }

    numbers[field] = parsed;
    addRangeInfo(field, parsed, infoMessages);
  });

  return { numbers, errors, infoMessages };
}

function isSignificantlyDifferent(provided: number, computed: number): boolean {
  const diff = Math.abs(provided - computed);
  if (diff < 1e-9) {
    return false;
  }
  const reference = Math.max(Math.abs(provided), Math.abs(computed), 1);
  return diff / reference > 0.005;
}

function computeOutcome(
  parsed: ParsedInputs,
  rawInputs: DiodeInputs,
  lastEdited: DiodeField | null
): CalculationOutcome {
  const numbers = parsed.numbers;
  const infoMessages = new Set(parsed.infoMessages);
  const emptyFields = FIELDS.filter((field) => rawInputs[field].trim() === '');
  const helperNeeded = emptyFields.length !== 1;
  const hasErrors = Object.values(parsed.errors).some(Boolean);
  const insufficient = emptyFields.length > 1 || hasErrors;

  let target: DiodeField | null = null;
  if (emptyFields.length === 1) {
    target = emptyFields[0];
  } else if (emptyFields.length === 0) {
    target = lastEdited ?? 'vs';
  }

  let solverResult: ReturnType<typeof solveDiodeSeries> | null = null;
  if (target) {
    const required = FIELDS.filter((field) => field !== target);
    const hasAllRequired = required.every((field) => typeof numbers[field] === 'number');
    if (hasAllRequired) {
      const solverInputs: SolverInputs = { lastChanged: toSolverField(target) };
      FIELDS.forEach((field) => {
        const value = numbers[field];
        if (value === undefined) {
          return;
        }
        const key = field === 'if' ? 'ifA' : field;
        (solverInputs as Record<string, number>)[key] = value;
      });
      solverResult = solveDiodeSeries(solverInputs);
    }
  }

  const warningMessages: string[] = [];
  let errorMessage: string | null = null;
  let computedField: SolverField | null = null;
  let resolved: CalculationOutcome['resolved'] = {};
  let neighbors: NeighborResult | null = null;

  if (solverResult instanceof Error) {
    errorMessage = solverResult.message;
  } else if (solverResult) {
    computedField = (target ? toSolverField(target) : null) ?? null;
    resolved = {
      vs: solverResult.vs,
      vf: solverResult.vf,
      if: solverResult.ifA,
      r: solverResult.r
    };

    if (computedField === 'r' && typeof resolved.r === 'number') {
      neighbors = nearestNeighbors(resolved.r, E24_SERIES);
    }

    if (emptyFields.length === 0 && target) {
      const provided = numbers[target];
      const computedValue = resolved[target as keyof typeof resolved];
      if (typeof provided === 'number' && typeof computedValue === 'number' && isSignificantlyDifferent(provided, computedValue)) {
        warningMessages.push(INCONSISTENT_WARNING);
      }
    }
  }

  FIELDS.forEach((field) => {
    const solverValue = resolved[field];
    if (typeof solverValue === 'number') {
      addRangeInfo(field, solverValue, infoMessages);
    } else if (typeof numbers[field] === 'number') {
      resolved[field] = numbers[field]!;
    }
  });

  return {
    resolved,
    computedField,
    insufficient,
    helperNeeded,
    warningMessages,
    errorMessage,
    infoMessages,
    neighbors
  };
}

function useUrlSync(inputs: DiodeInputs) {
  const router = useRouter();
  const pathname = usePathname();
  const lastUrlRef = React.useRef<string>('');

  React.useEffect(() => {
    const params = new URLSearchParams();
    FIELDS.forEach((field) => {
      const raw = inputs[field].trim();
      if (raw) {
        params.set(field, raw);
      }
    });
    const query = params.toString();
    const nextUrl = (query ? `${pathname}?${query}` : pathname) as Route;
    if (nextUrl !== lastUrlRef.current) {
      router.replace(nextUrl, { scroll: false });
      lastUrlRef.current = nextUrl;
    }
  }, [inputs, pathname, router]);
}

function DiodeSeriesContent() {
  const searchParams = useSearchParams();
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } = useColorScheme();

  const [inputs, setInputs] = React.useState<DiodeInputs>(() => ({
    vs: searchParams.get('vs') ?? DEFAULT_INPUTS.vs,
    vf: searchParams.get('vf') ?? DEFAULT_INPUTS.vf,
    if: searchParams.get('if') ?? DEFAULT_INPUTS.if,
    r: searchParams.get('r') ?? DEFAULT_INPUTS.r
  }));
  const [lastEdited, setLastEdited] = React.useState<DiodeField | null>(null);

  const debouncedInputs = useDebouncedInputs(inputs);
  useUrlSync(debouncedInputs);

  const immediateParsed = React.useMemo(() => parseInputs(inputs), [inputs]);
  const debouncedParsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);

  const outcome = React.useMemo(
    () => computeOutcome(debouncedParsed, debouncedInputs, lastEdited),
    [debouncedInputs, debouncedParsed, lastEdited]
  );

  const handleChange = React.useCallback((field: DiodeField, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setLastEdited(field);
  }, []);

  const handleClear = React.useCallback((field: DiodeField) => {
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

  return (
    <>
      <CalculatorHeader title="Diode Current & Resistor Calculator" />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={4}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
                DIY Synth Tools
              </Typography>
              <Typography variant="h3" component="h1" gutterBottom>
                Series Diode Calculator
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Provide any three values to solve the missing supply, drop, current, or resistor.
              </Typography>
            </Box>
            <IconButton aria-label="Toggle color scheme" onClick={handleToggleColorScheme} color="primary">
              {colorSchemeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Stack>

          <Grid container spacing={3} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <InputsForm
                values={inputs}
                onChange={handleChange}
                onClear={handleClear}
                errors={immediateParsed.errors}
                helperMessage={outcome.helperNeeded ? 'Leave exactly one field empty to calculate it.' : undefined}
                warningMessages={outcome.warningMessages}
                infoMessages={Array.from(immediateParsed.infoMessages).sort()}
                calculationError={outcome.errorMessage}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <ResultsCard
                vs={outcome.resolved.vs}
                vf={outcome.resolved.vf}
                ifA={outcome.resolved.if}
                r={outcome.resolved.r}
                computedField={outcome.computedField}
                neighbors={outcome.neighbors}
                insufficient={outcome.insufficient}
                warningMessages={outcome.warningMessages}
                infoMessages={Array.from(outcome.infoMessages).sort()}
                errorMessage={outcome.errorMessage}
              />
            </Grid>
          </Grid>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Formula
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vs = Vf + If × R
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {'Guard rails: 0 < I <= 1 A, 1 Ω <= R <= 100 MΩ, 0 < Vs <= 1 kV.'}
              {typeof outcome.resolved.r === 'number' ? ` R ≈ ${formatOhms(outcome.resolved.r)}.` : ''}
              {typeof outcome.resolved.vs === 'number' ? ` Vs ≈ ${formatVolts(outcome.resolved.vs)}.` : ''}
            </Typography>
          </Box>
        </Stack>
      </Container>
    </>
  );
}

export default function DiodeSeriesPage() {
  return (
    <React.Suspense fallback={null}>
      <DiodeSeriesContent />
    </React.Suspense>
  );
}
