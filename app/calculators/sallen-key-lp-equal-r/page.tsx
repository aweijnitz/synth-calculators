'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Box, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import SkMultiResponse from '../../../components/charts/SkMultiResponse';
import InputsForm, { type EqualResistorInputs } from '../../../components/sklp_equal/InputsForm';
import ResultsCard from '../../../components/sklp_equal/ResultsCard';
import { formatFarads, parseFarads, parseOhms } from '../../../lib/rc/parse';
import { computeQ, sweepPot, type SweepPoint } from '../../../lib/sklp_equal/solve';

const DEBOUNCE_MS = 300;
const Q_LOW = 0.5;
const Q_HIGH = 5;
const SMALL_RESISTANCE_THRESHOLD = 200; // ohms
const POSITION_LABELS: Record<number, string> = {
  0: '0%',
  0.25: '25%',
  0.5: '50%',
  0.75: '75%',
  1: '100%',
};

type Field = 'c1' | 'c2' | 'rPotMax' | 'rSeriesTop' | 'rSeriesBottom';

type ParsedInputs = {
  values: Partial<Record<Field, number>>;
  errors: Partial<Record<Field, string>>;
};

type CalculationState = {
  sweeps: SweepPoint[];
  q?: number;
  insufficient: boolean;
};

function useDebouncedInputs(values: EqualResistorInputs): EqualResistorInputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function parseOptionalSeries(value: string): number | Error {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric === 0) {
    return 0;
  }
  return parseOhms(trimmed);
}

function parseInputs(inputs: EqualResistorInputs): ParsedInputs {
  const errors: ParsedInputs['errors'] = {};
  const values: ParsedInputs['values'] = {};

  const rawC1 = inputs.c1.trim();
  if (!rawC1) {
    errors.c1 = 'Please enter a value.';
  } else {
    const parsed = parseFarads(rawC1);
    if (parsed instanceof Error) {
      errors.c1 = parsed.message;
    } else {
      values.c1 = parsed;
    }
  }

  const rawC2 = inputs.c2.trim();
  if (!rawC2) {
    errors.c2 = 'Please enter a value.';
  } else {
    const parsed = parseFarads(rawC2);
    if (parsed instanceof Error) {
      errors.c2 = parsed.message;
    } else {
      values.c2 = parsed;
    }
  }

  const rawPot = inputs.rPotMax.trim();
  if (!rawPot) {
    errors.rPotMax = 'Please enter a value.';
  } else {
    const parsed = parseOhms(rawPot);
    if (parsed instanceof Error) {
      errors.rPotMax = parsed.message;
    } else {
      values.rPotMax = parsed;
    }
  }

  const rawTop = inputs.rSeriesTop.trim();
  if (rawTop) {
    const parsed = parseOptionalSeries(rawTop);
    if (parsed instanceof Error) {
      errors.rSeriesTop = parsed.message;
    } else {
      values.rSeriesTop = parsed;
    }
  } else {
    values.rSeriesTop = 0;
  }

  const rawBottom = inputs.rSeriesBottom.trim();
  if (rawBottom) {
    const parsed = parseOptionalSeries(rawBottom);
    if (parsed instanceof Error) {
      errors.rSeriesBottom = parsed.message;
    } else {
      values.rSeriesBottom = parsed;
    }
  } else {
    values.rSeriesBottom = 0;
  }

  return { values, errors };
}

function buildCalculation(parsed: ParsedInputs): CalculationState {
  const c1 = parsed.values.c1;
  const c2 = parsed.values.c2;
  const rPotMax = parsed.values.rPotMax;
  const rSeriesTop = parsed.values.rSeriesTop ?? 0;
  const rSeriesBottom = parsed.values.rSeriesBottom ?? 0;

  if (!c1 || !c2 || !rPotMax) {
    return { sweeps: [], insufficient: true };
  }

  const sweeps = sweepPot(rPotMax, c1, c2, rSeriesTop, rSeriesBottom);
  const q = computeQ(c1, c2);

  return { sweeps, q, insufficient: false };
}

function buildInfoMessages(state: CalculationState): string[] {
  const messages = new Set<string>();

  if (state.q !== undefined && Number.isFinite(state.q)) {
    if (state.q < Q_LOW) {
      messages.add('Q is below 0.5. Expect an overdamped response.');
    } else if (state.q > Q_HIGH) {
      messages.add('Q is above 5. Expect a very resonant response.');
    }
  }

  return Array.from(messages);
}

function buildSeries(sweeps: SweepPoint[]): { label: string; fc: number }[] {
  return sweeps.map((point) => ({
    label: POSITION_LABELS[point.alpha] ?? `${Math.round(point.alpha * 100)}%`,
    fc: point.fc,
  }));
}

function SallenKeyEqualResistorContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } = useColorScheme();

  const [inputs, setInputs] = React.useState<EqualResistorInputs>(() => ({
    c1: searchParams.get('c1') ?? '',
    c2: searchParams.get('c2') ?? '',
    rPotMax: searchParams.get('rpot') ?? '',
    rSeriesTop: searchParams.get('rst') ?? '',
    rSeriesBottom: searchParams.get('rsb') ?? '',
    mode: 'lowpass',
  }));

  const debouncedInputs = useDebouncedInputs(inputs);
  const lastUrlRef = React.useRef<string>('');

  const parsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);
  const calculation = React.useMemo(() => buildCalculation(parsed), [parsed]);
  const infoMessages = React.useMemo(() => buildInfoMessages(calculation), [calculation]);

  const minResistance = React.useMemo(() => {
    if (calculation.sweeps.length === 0) {
      return undefined;
    }
    return Math.min(...calculation.sweeps.map((point) => point.R));
  }, [calculation.sweeps]);

  const resistanceWarning = React.useMemo(() => {
    if (!minResistance || !Number.isFinite(minResistance)) {
      return null;
    }
    if (minResistance <= SMALL_RESISTANCE_THRESHOLD) {
      return 'End-stop may push f_c very high. Add small series resistors to tame the sweep.';
    }
    return null;
  }, [minResistance]);

  const handleChange = React.useCallback((field: Field, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
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
    if (debouncedInputs.c1.trim()) {
      params.set('c1', debouncedInputs.c1.trim());
    }
    if (debouncedInputs.c2.trim()) {
      params.set('c2', debouncedInputs.c2.trim());
    }
    if (debouncedInputs.rPotMax.trim()) {
      params.set('rpot', debouncedInputs.rPotMax.trim());
    }
    if (debouncedInputs.rSeriesTop.trim()) {
      params.set('rst', debouncedInputs.rSeriesTop.trim());
    }
    if (debouncedInputs.rSeriesBottom.trim()) {
      params.set('rsb', debouncedInputs.rSeriesBottom.trim());
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    if (nextUrl !== lastUrlRef.current) {
      router.replace(nextUrl as Route);
      lastUrlRef.current = nextUrl;
    }
  }, [debouncedInputs, pathname, router]);

  const helperMessage = React.useMemo(() => {
    const c1Label = parsed.values.c1 ? formatFarads(parsed.values.c1) : '—';
    const c2Label = parsed.values.c2 ? formatFarads(parsed.values.c2) : '—';
    return `Dual-gang pot drives both resistors together. Q = 0.5·√(C1/C2). Current C1 = ${c1Label}, C2 = ${c2Label}.`;
  }, [parsed.values.c1, parsed.values.c2]);

  const sweeps = calculation.sweeps;
  const chartSeries = React.useMemo(() => buildSeries(sweeps), [sweeps]);

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
      <Stack spacing={{ xs: 4, sm: 6 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h3" component="h1">
              Sallen-Key Low-pass (Equal R)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unity-gain 2nd-order topology with R1 = R2 driven by a dual-gang potentiometer.
            </Typography>
          </Stack>
          <Box>
            <IconButton aria-label="Toggle color scheme" onClick={handleToggleColorScheme}>
              {colorSchemeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Box>
        </Stack>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={6} lg={5}>
            <InputsForm
              values={inputs}
              onChange={handleChange}
              errors={parsed.errors}
              helperMessage={helperMessage}
              warningMessage={resistanceWarning}
              infoMessages={infoMessages}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={7}>
            <ResultsCard
              c1={parsed.values.c1}
              c2={parsed.values.c2}
              q={calculation.q}
              sweeps={sweeps}
              insufficient={calculation.insufficient}
              warningMessage={resistanceWarning}
              infoMessages={infoMessages}
            />
          </Grid>
        </Grid>

        <SkMultiResponse series={chartSeries} showDb />
      </Stack>
    </Container>
  );
}

export default function SallenKeyEqualResistorPage() {
  return (
    <React.Suspense fallback={null}>
      <SallenKeyEqualResistorContent />
    </React.Suspense>
  );
}
