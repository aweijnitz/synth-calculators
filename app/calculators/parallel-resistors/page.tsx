'use client';

export const dynamic = 'force-dynamic';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Box, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import CalculatorHeader from '../../../components/common/CalculatorHeader';
import InputsForm, { type ParallelInputs } from '../../../components/parallel/InputsForm';
import ResultsCard from '../../../components/parallel/ResultsCard';
import { formatOhms, parseOhms } from '../../../lib/parallel/parse';
import { rParallel } from '../../../lib/parallel/solve';

const DEBOUNCE_MS = 300;
const MIN_RECOMMENDED_RESISTANCE = 1;
const MAX_RECOMMENDED_RESISTANCE = 100_000_000;
const DISPROPORTION_RATIO = 100;

const DEFAULT_INPUTS: ParallelInputs = {
  r1: '',
  r2: '',
};

type Field = keyof ParallelInputs;

type ParsedResult = {
  numbers: Partial<Record<Field, number>>;
  errors: Partial<Record<Field, string>>;
  infoMessages: Set<string>;
};

function useDebouncedInputs(values: ParallelInputs): ParallelInputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function parseInputs(raw: ParallelInputs): ParsedResult {
  const numbers: ParsedResult['numbers'] = {};
  const errors: ParsedResult['errors'] = {};
  const infoMessages = new Set<string>();

  (Object.keys(raw) as Field[]).forEach((field) => {
    const value = raw[field].trim();
    if (!value) {
      return;
    }
    const parsed = parseOhms(value);
    if (parsed instanceof Error) {
      errors[field] = parsed.message;
      return;
    }
    numbers[field] = parsed;
    if (parsed < MIN_RECOMMENDED_RESISTANCE || parsed > MAX_RECOMMENDED_RESISTANCE) {
      infoMessages.add(
        `${field.toUpperCase()} is outside the suggested range (1 Ω ≤ R ≤ 100 MΩ).`
      );
    }
  });

  return { numbers, errors, infoMessages };
}

function buildDisproportionNote(r1?: number, r2?: number): string | null {
  if (!r1 || !r2) {
    return null;
  }
  const larger = Math.max(r1, r2);
  const smaller = Math.min(r1, r2);
  if (smaller <= 0) {
    return null;
  }
  if (larger / smaller >= DISPROPORTION_RATIO) {
    return 'Result will be close to the smaller resistor.';
  }
  return null;
}

function useUrlSync(inputs: ParallelInputs) {
  const router = useRouter();
  const pathname = usePathname();
  const lastUrlRef = React.useRef<string>('');

  React.useEffect(() => {
    const params = new URLSearchParams();
    (Object.keys(inputs) as Field[]).forEach((field) => {
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

function ParallelResistorsContent() {
  const searchParams = useSearchParams();
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } = useColorScheme();

  const [inputs, setInputs] = React.useState<ParallelInputs>(() => ({
    r1: searchParams.get('r1') ?? DEFAULT_INPUTS.r1,
    r2: searchParams.get('r2') ?? DEFAULT_INPUTS.r2,
  }));

  const debouncedInputs = useDebouncedInputs(inputs);

  useUrlSync(debouncedInputs);

  const immediateParsed = React.useMemo(() => parseInputs(inputs), [inputs]);
  const debouncedParsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);

  const debouncedNumbers = debouncedParsed.numbers;
  const hasErrors = Boolean(debouncedParsed.errors.r1 || debouncedParsed.errors.r2);
  const hasValues = debouncedInputs.r1.trim() !== '' && debouncedInputs.r2.trim() !== '';
  const insufficient = !hasValues || hasErrors;

  const parallelValue = React.useMemo(() => {
    if (insufficient) {
      return undefined;
    }
    const r1 = debouncedNumbers.r1;
    const r2 = debouncedNumbers.r2;
    if (r1 === undefined || r2 === undefined) {
      return undefined;
    }
    try {
      return rParallel(r1, r2);
    } catch (error) {
      console.error('Failed to compute parallel resistance', error);
      return undefined;
    }
  }, [debouncedNumbers.r1, debouncedNumbers.r2, insufficient]);

  const warningMessages = React.useMemo(() => {
    const note = buildDisproportionNote(debouncedNumbers.r1, debouncedNumbers.r2);
    return note ? [note] : [];
  }, [debouncedNumbers.r1, debouncedNumbers.r2]);

  const handleChange = React.useCallback((field: Field, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleClear = React.useCallback((field: Field) => {
    setInputs((prev) => ({ ...prev, [field]: '' }));
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
      <CalculatorHeader title="Parallel Resistors" />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={4}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
                DIY Synth Tools
              </Typography>
              <Typography variant="h3" component="h1" gutterBottom>
                Parallel Resistors Calculator
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quickly find the equivalent resistance for two resistors in parallel.
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
                infoMessages={Array.from(immediateParsed.infoMessages).sort()}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <ResultsCard
                r1={debouncedNumbers.r1}
                r2={debouncedNumbers.r2}
                rParallel={parallelValue}
                insufficient={insufficient}
                warningMessages={warningMessages}
              />
            </Grid>
          </Grid>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Formula
            </Typography>
            <Typography variant="body2" color="text.secondary">
              R_parallel = 1 / (1 / R1 + 1 / R2) = (R1 × R2) / (R1 + R2)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Guard rails: 1 Ω ≤ R ≤ 100 MΩ. {parallelValue !== undefined ? `R_parallel ≈ ${formatOhms(parallelValue)}.` : ''}
            </Typography>
          </Box>
        </Stack>
      </Container>
    </>
  );
}

export default function ParallelResistorsPage() {
  return (
    <React.Suspense fallback={null}>
      <ParallelResistorsContent />
    </React.Suspense>
  );
}
