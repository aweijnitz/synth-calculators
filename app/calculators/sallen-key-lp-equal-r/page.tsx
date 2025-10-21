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
import { formatFarads, formatHertz, parseFarads, parseHertz, parseOhms } from '../../../lib/rc/parse';
import {
  computeQ,
  solveCapacitorsForTarget,
  sweepPot,
  type CapacitorSelection,
  type SweepPoint,
} from '../../../lib/sklp_equal/solve';

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

type Field = 'fcTarget' | 'rPotMax' | 'cBase';

type ParsedInputs = {
  values: Partial<Record<Field, number>>;
  errors: Partial<Record<Field, string>>;
};

type CalculationState = {
  sweeps: SweepPoint[];
  q?: number;
  selection?: CapacitorSelection;
  insufficient: boolean;
  errorMessage?: string | null;
};

function useDebouncedInputs(values: EqualResistorInputs): EqualResistorInputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function parseInputs(inputs: EqualResistorInputs): ParsedInputs {
  const errors: ParsedInputs['errors'] = {};
  const values: ParsedInputs['values'] = {};

  const rawFc = inputs.fcTarget.trim();
  if (!rawFc) {
    errors.fcTarget = 'Please enter a value.';
  } else {
    const parsed = parseHertz(rawFc);
    if (parsed instanceof Error) {
      errors.fcTarget = parsed.message;
    } else {
      values.fcTarget = parsed;
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

  const rawCBase = inputs.cBase.trim();
  if (rawCBase) {
    const parsed = parseFarads(rawCBase);
    if (parsed instanceof Error) {
      errors.cBase = parsed.message;
    } else {
      values.cBase = parsed;
    }
  }

  return { values, errors };
}

function buildCalculation(parsed: ParsedInputs): CalculationState {
  const fcTarget = parsed.values.fcTarget;
  const rPotMax = parsed.values.rPotMax;
  const cBase = parsed.values.cBase;

  if (!fcTarget || !rPotMax) {
    return { sweeps: [], insufficient: true, errorMessage: null };
  }

  const selection = solveCapacitorsForTarget({ targetFcHz: fcTarget, rPotMax, cBase });
  if (selection instanceof Error) {
    return { sweeps: [], insufficient: false, errorMessage: selection.message };
  }

  const sweeps = sweepPot(rPotMax, selection.c1, selection.c2);
  const q = computeQ(selection.c1, selection.c2);

  return { sweeps, q, selection, insufficient: false, errorMessage: null };
}

function buildInfoMessages(state: CalculationState, fcTarget?: number): string[] {
  const messages = new Set<string>();
  messages.add('Capacitors derived from the E6 preferred series (100 pF – 10 µF).');

  if (fcTarget && state.selection) {
    const deviation = Math.abs(state.selection.deviation) * 100;
    if (deviation > 1) {
      messages.add(
        `Closest E6 pair yields f_c ≈ ${formatHertz(state.selection.fc50)} at 50% (Δ ≈ ${deviation.toFixed(1)}%).`,
      );
    }
  }

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
    fcTarget: searchParams.get('fc') ?? '',
    rPotMax: searchParams.get('rpot') ?? '',
    cBase: searchParams.get('cbase') ?? '',
    mode: 'lowpass',
  }));

  const debouncedInputs = useDebouncedInputs(inputs);
  const lastUrlRef = React.useRef<string>('');

  const parsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);
  const calculation = React.useMemo(() => buildCalculation(parsed), [parsed]);
  const infoMessages = React.useMemo(
    () => buildInfoMessages(calculation, parsed.values.fcTarget),
    [calculation, parsed.values.fcTarget],
  );

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
      return 'End-stop may push f_c very high. Consider adding small series resistors to tame the sweep.';
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
    if (debouncedInputs.fcTarget.trim()) {
      params.set('fc', debouncedInputs.fcTarget.trim());
    }
    if (debouncedInputs.rPotMax.trim()) {
      params.set('rpot', debouncedInputs.rPotMax.trim());
    }
    if (debouncedInputs.cBase.trim()) {
      params.set('cbase', debouncedInputs.cBase.trim());
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    if (nextUrl !== lastUrlRef.current) {
      router.replace(nextUrl as Route);
      lastUrlRef.current = nextUrl;
    }
  }, [debouncedInputs, pathname, router]);

  const helperMessage = React.useMemo(() => {
    const fragments = ['Dual-gang pot drives both resistors. Q = 0.5·√(C1/C2).'];
    if (parsed.values.cBase) {
      fragments.push(`Seed capacitor ≈ ${formatFarads(parsed.values.cBase)}.`);
    }
    return fragments.join(' ');
  }, [parsed.values.cBase]);

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
              c1={calculation.selection?.c1}
              c2={calculation.selection?.c2}
              q={calculation.q}
              sweeps={sweeps}
              insufficient={calculation.insufficient}
              warningMessage={resistanceWarning}
              infoMessages={infoMessages}
              errorMessage={calculation.errorMessage}
              targetFcHz={parsed.values.fcTarget}
              fc50Hz={calculation.selection?.fc50}
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
