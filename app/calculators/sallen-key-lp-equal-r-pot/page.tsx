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
import SkPotSweep from '../../../components/charts/SkPotSweep';
import InputsForm, { type Field, type Inputs } from '../../../components/sklp_equal_pot/InputsForm';
import ResultsCard from '../../../components/sklp_equal_pot/ResultsCard';
import { formatFarads, parseFarads, parseHertz, parseOhms } from '../../../lib/rc/parse';
import {
  DEFAULT_MAX_CAPACITANCE,
  DEFAULT_MIN_CAPACITANCE,
  pickE6CapsForF50,
  type PickedCapacitors,
} from '../../../lib/sklp_equal_pot/solve';

const DEBOUNCE_MS = 300;

type ParsedInputs = {
  values: Partial<Record<Field, number>>;
  errors: Partial<Record<Field, string>>;
};

function useDebouncedInputs(values: Inputs): Inputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function parseInputs(inputs: Inputs): ParsedInputs {
  const errors: ParsedInputs['errors'] = {};
  const values: ParsedInputs['values'] = {};

  const rawF = inputs.fTarget50.trim();
  if (!rawF) {
    errors.fTarget50 = 'Please enter a value.';
  } else {
    const parsedF = parseHertz(rawF);
    if (parsedF instanceof Error) {
      errors.fTarget50 = parsedF.message;
    } else {
      values.fTarget50 = parsedF;
    }
  }

  const rawR = inputs.rPotMax.trim();
  if (!rawR) {
    errors.rPotMax = 'Please enter a value.';
  } else {
    const parsedR = parseOhms(rawR);
    if (parsedR instanceof Error) {
      errors.rPotMax = parsedR.message;
    } else {
      values.rPotMax = parsedR;
    }
  }

  const rawC = inputs.cBase.trim();
  if (rawC) {
    const parsedC = parseFarads(rawC);
    if (parsedC instanceof Error) {
      errors.cBase = parsedC.message;
    } else {
      values.cBase = parsedC;
    }
  }

  return { values, errors };
}

function helperMessage(): string {
  return 'Searches E6 capacitors from roughly 10 pF to 10 µF. 50% position assumes 0.5 × Rpot.';
}

function buildInfoMessages(parsed: ParsedInputs, result: PickedCapacitors | null): string[] {
  const messages = new Set<string>();
  messages.add('Unity gain: Q = 0.5 · √(C1 / C2).');
  messages.add('Plot overlays 0%, 25%, 50%, 75%, 100% pot positions.');

  if (parsed.values.cBase) {
    messages.add(`Seed preference ≈ ${formatFarads(parsed.values.cBase)}.`);
  }

  if (result && !result.withinTolerance) {
    messages.add('Exact 2% match unavailable; closest option shown.');
  }

  return Array.from(messages);
}

function buildWarningMessage(parsed: ParsedInputs): string | null {
  const fTarget = parsed.values.fTarget50;
  const rPot = parsed.values.rPotMax;
  if (!fTarget || !rPot) {
    return null;
  }

  const r50 = 0.5 * rPot;
  if (r50 <= 0) {
    return null;
  }

  const geometricMean = 1 / (2 * Math.PI * r50 * fTarget);
  if (geometricMean < DEFAULT_MIN_CAPACITANCE) {
    return 'Target demands capacitors below ~10 pF. Expect noticeable error.';
  }
  if (geometricMean > DEFAULT_MAX_CAPACITANCE) {
    return 'Target demands capacitors above ~10 µF. Expect noticeable error.';
  }
  return null;
}

function SallenKeyEqualPotContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } = useColorScheme();

  const [inputs, setInputs] = React.useState<Inputs>(() => ({
    fTarget50: searchParams.get('f50') ?? '',
    rPotMax: searchParams.get('rpot') ?? '',
    cBase: searchParams.get('cbase') ?? '',
  }));

  const debouncedInputs = useDebouncedInputs(inputs);
  const lastUrlRef = React.useRef<string>('');

  const parsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);

  const pickResult = React.useMemo(() => {
    const fTarget = parsed.values.fTarget50;
    const rPot = parsed.values.rPotMax;
    if (!fTarget || !rPot) {
      return null;
    }
    return pickE6CapsForF50(fTarget, rPot, parsed.values.cBase);
  }, [parsed.values.cBase, parsed.values.fTarget50, parsed.values.rPotMax]);

  const infoMessages = React.useMemo(() => buildInfoMessages(parsed, pickResult), [parsed, pickResult]);
  const warningMessage = React.useMemo(() => buildWarningMessage(parsed), [parsed]);

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
    if (debouncedInputs.fTarget50.trim()) {
      params.set('f50', debouncedInputs.fTarget50.trim());
    }
    if (debouncedInputs.rPotMax.trim()) {
      params.set('rpot', debouncedInputs.rPotMax.trim());
    }
    if (debouncedInputs.cBase.trim()) {
      params.set('cbase', debouncedInputs.cBase.trim());
    }

    const query = params.toString();
    const nextUrl = (query ? `${pathname}?${query}` : pathname) as Route;
    if (nextUrl !== lastUrlRef.current) {
      router.replace(nextUrl);
      lastUrlRef.current = nextUrl;
    }
  }, [debouncedInputs, pathname, router]);

  const hasInsufficient = !parsed.values.fTarget50 || !parsed.values.rPotMax;

  return (
    <>
      <CalculatorHeader title="Sallen-Key LPF · Dual Pot" />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
              DIY Synth Tools
            </Typography>
            <Typography variant="h1" component="h1" gutterBottom>
              Sallen-Key LPF · Dual Pot
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Auto-picks E6 capacitors so the 50% rotation hits your desired cutoff, then previews the sweep.
            </Typography>
          </Box>
          <IconButton aria-label="Toggle color scheme" onClick={handleToggleColorScheme} size="large">
            {colorSchemeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Stack>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={6}>
            <InputsForm
              values={inputs}
              errors={parsed.errors}
              onChange={handleChange}
              helperMessage={helperMessage()}
              warningMessage={warningMessage}
              infoMessages={infoMessages}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ResultsCard
              loading={false}
              result={pickResult}
              fTarget50={parsed.values.fTarget50}
              rPotMax={parsed.values.rPotMax}
            />
          </Grid>
        </Grid>

        <SkPotSweep
          c1={pickResult?.c1}
          c2={pickResult?.c2}
          rPotMax={parsed.values.rPotMax}
          loading={hasInsufficient}
        />
      </Stack>
      </Container>
    </>
  );
}

export default function SallenKeyEqualPotPage() {
  return (
    <React.Suspense fallback={null}>
      <SallenKeyEqualPotContent />
    </React.Suspense>
  );
}
