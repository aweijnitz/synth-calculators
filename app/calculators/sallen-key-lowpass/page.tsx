'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Box, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import CalculatorHeader from '../../../components/common/CalculatorHeader';
import FrequencyResponseChart from '../../../components/charts/FrequencyResponseChart';
import FilterForm, { type RatioOption, type SallenKeyInputs } from '../../../components/sklp/FilterForm';
import ResultsCard, { type ResistorNeighbors } from '../../../components/sklp/ResultsCard';
import { formatFarads, parseFarads, parseHertz } from '../../../lib/rc/parse';
import { solveSallenKeyLP, buildRatioOptions } from '../../../lib/sklp/solve';
import { nearestNeighbors } from '../../../lib/series/nearest';
import { E24_SERIES } from '../../../lib/series/e24';

const DEBOUNCE_MS = 300;
const MIN_Q = 0.3;
const MAX_Q = 5;

type ParsedInputs = {
  fcHz?: number;
  q?: number;
  cBase?: number;
  errors: Partial<Record<'fc' | 'q' | 'cBase', string>>;
};

function useDebouncedInputs(values: SallenKeyInputs): SallenKeyInputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function parseQualityFactor(input: string): number | Error {
  const trimmed = input.trim();
  if (!trimmed) {
    return new Error('Please enter a value.');
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return new Error('Please enter a valid number.');
  }
  if (value <= 0) {
    return new Error('Please enter a value greater than zero.');
  }
  return value;
}

function parseInputs(inputs: SallenKeyInputs): ParsedInputs {
  const errors: ParsedInputs['errors'] = {};
  const parsed: ParsedInputs = { errors };

  const rawFc = inputs.fc.trim();
  if (rawFc) {
    const fc = parseHertz(rawFc);
    if (fc instanceof Error) {
      errors.fc = fc.message;
    } else {
      parsed.fcHz = fc;
    }
  } else {
    errors.fc = 'Please enter a value.';
  }

  const rawQ = inputs.q.trim();
  if (rawQ) {
    const q = parseQualityFactor(rawQ);
    if (q instanceof Error) {
      errors.q = q.message;
    } else {
      parsed.q = q;
    }
  } else {
    errors.q = 'Please enter a value.';
  }

  const rawCBase = inputs.cBase.trim();
  if (rawCBase) {
    const cBase = parseFarads(rawCBase);
    if (cBase instanceof Error) {
      errors.cBase = cBase.message;
    } else {
      parsed.cBase = cBase;
    }
  }

  return parsed;
}

function ratioOptions(): RatioOption[] {
  const options = buildRatioOptions();
  return options.map((option) => ({ value: option.value.toString(), label: option.label }));
}

function buildInfoMessages(parsed: ParsedInputs): string[] {
  const messages: string[] = [];
  if (parsed.cBase) {
    messages.push(`Seed capacitor ≈ ${formatFarads(parsed.cBase)} (used as a preference only).`);
  }
  messages.push('Caps searched from E6 preferred numbers. For unity gain, Q > 0.5 requires C1 ≥ 4Q² · C2.');
  return Array.from(new Set(messages));
}

function SallenKeyLowpassContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } = useColorScheme();

  const ratioList = React.useMemo(() => ratioOptions(), []);

  const [inputs, setInputs] = React.useState<SallenKeyInputs>(() => ({
    fc: searchParams.get('fc') ?? '440',
    q: searchParams.get('q') ?? '0.7',
    cBase: searchParams.get('cbase') ?? '',
    ratio: searchParams.get('ratio') ?? 'auto',
  }));

  const debouncedInputs = useDebouncedInputs(inputs);
  const lastUrlRef = React.useRef<string>('');

  const parsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);

  const ratioValue = React.useMemo(() => {
    if (!debouncedInputs.ratio || debouncedInputs.ratio === 'auto') {
      return undefined;
    }
    const numeric = Number(debouncedInputs.ratio);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
  }, [debouncedInputs.ratio]);

  const hasInsufficient = !parsed.fcHz || !parsed.q;

  const solverResult = React.useMemo(() => {
    if (hasInsufficient) {
      return new Error('Enter f_c and Q to compute values.');
    }
    return solveSallenKeyLP({ fcHz: parsed.fcHz!, Q: parsed.q!, cBase: parsed.cBase, ratio: ratioValue });
  }, [hasInsufficient, parsed.cBase, parsed.fcHz, parsed.q, ratioValue]);

  const infoMessages = React.useMemo(() => buildInfoMessages(parsed), [parsed]);

  const warningMessage = React.useMemo(() => {
    if (!parsed.q) {
      return null;
    }
    if (parsed.q < MIN_Q || parsed.q > MAX_Q) {
      return `Q outside suggested range (${MIN_Q} – ${MAX_Q}). Results may require extreme component values.`;
    }
    return null;
  }, [parsed.q]);

  const errorMessage = React.useMemo(() => {
    if (hasInsufficient) {
      return null;
    }
    if (solverResult instanceof Error) {
      return solverResult.message;
    }
    return null;
  }, [hasInsufficient, solverResult]);

  const neighbors = React.useMemo<ResistorNeighbors | null>(() => {
    if (solverResult instanceof Error) {
      return null;
    }
    const r1Neighbors = nearestNeighbors(solverResult.r1, E24_SERIES);
    const r2Neighbors = nearestNeighbors(solverResult.r2, E24_SERIES);
    return { r1: r1Neighbors, r2: r2Neighbors };
  }, [solverResult]);

  const handleInputChange = React.useCallback((field: keyof SallenKeyInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleClear = React.useCallback((field: 'fc' | 'q' | 'cBase') => {
    setInputs((prev) => ({ ...prev, [field]: '' }));
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
    if (debouncedInputs.fc.trim()) {
      params.set('fc', debouncedInputs.fc.trim());
    }
    if (debouncedInputs.q.trim()) {
      params.set('q', debouncedInputs.q.trim());
    }
    if (debouncedInputs.cBase.trim()) {
      params.set('cbase', debouncedInputs.cBase.trim());
    }
    if (debouncedInputs.ratio && debouncedInputs.ratio !== 'auto') {
      params.set('ratio', debouncedInputs.ratio);
    }
    const queryString = params.toString();
    const target = queryString ? `${pathname}?${queryString}` : pathname;
    if (target !== lastUrlRef.current) {
      router.replace(target as Route, { scroll: false });
      lastUrlRef.current = target;
    }
  }, [debouncedInputs, pathname, router]);

  return (
    <>
      <CalculatorHeader title="Sallen-Key Low-pass Calculator" />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={1}>
            <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
              Active Filters
            </Typography>
            <Typography variant="h3" component="h1">
              Sallen-Key Low-pass
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unity-gain 2nd-order topology solving for R1 and R2 using E6 capacitors.
            </Typography>
          </Stack>
          <IconButton aria-label="Toggle color scheme" onClick={handleToggleColorScheme} color="primary">
            {colorSchemeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Stack>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={6}>
            <FilterForm
              values={inputs}
              onChange={handleInputChange}
              onClear={handleClear}
              errors={parsed.errors}
              ratioOptions={ratioList}
              helperMessage="Provide f_c and Q. Optional capacitor seed steers the search."
              warningMessage={warningMessage}
              infoMessages={infoMessages}
              errorMessage={errorMessage}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ResultsCard
              c1={solverResult instanceof Error ? undefined : solverResult.c1}
              c2={solverResult instanceof Error ? undefined : solverResult.c2}
              r1={solverResult instanceof Error ? undefined : solverResult.r1}
              r2={solverResult instanceof Error ? undefined : solverResult.r2}
              fc={solverResult instanceof Error ? undefined : solverResult.fc}
              q={solverResult instanceof Error ? undefined : solverResult.Q}
              insufficient={hasInsufficient}
              warningMessage={warningMessage}
              infoMessages={infoMessages}
              errorMessage={errorMessage}
              neighbors={neighbors}
            />
          </Grid>
        </Grid>

        <FrequencyResponseChart
          mode="lowpass"
          fcHz={solverResult instanceof Error ? parsed.fcHz : solverResult.fc}
        />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Notes
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Unity-gain Sallen-Key: ω₀ = 1/√(R1R2C1C2) and Q = √(R1R2C1C2) / (C2 (R1 + R2)). Texas Instruments,{' '}
            <a href="https://www.ti.com/lit/an/sloa024b/sloa024b.pdf" target="_blank" rel="noreferrer">
              Sallen-Key design guide
            </a>
            .
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Capacitors searched from the E6 series (100 pF – 10 µF). For Q &gt; 0.5, ensure C1 ≥ 4Q² · C2 (unity gain constraint).
          </Typography>
        </Box>
      </Stack>
      </Container>
    </>
  );
}

export default function SallenKeyLowpassPage() {
  return (
    <React.Suspense fallback={null}>
      <SallenKeyLowpassContent />
    </React.Suspense>
  );
}
