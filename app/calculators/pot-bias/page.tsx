'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Box, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import InputsForm, { type PotBiasField, type PotBiasInputs } from '../../../components/potbias/InputsForm';
import ResultsCard from '../../../components/potbias/ResultsCard';
import { parseOhms, parseVolts } from '../../../lib/potbias/parse';
import { solvePotBias } from '../../../lib/potbias/solve';
import { E24_SERIES } from '../../../lib/series/e24';
import { nearestNeighbors } from '../../../lib/series/nearest';

const DEBOUNCE_MS = 300;
const MIN_RECOMMENDED_RESISTANCE = 100;
const MAX_RECOMMENDED_RESISTANCE = 100_000_000;

const DEFAULT_INPUTS: PotBiasInputs = {
  vsHi: '12',
  vsLo: '0',
  vTop: '8',
  vBot: '2',
  rPot: '10k'
};

const QUERY_KEYS: Record<PotBiasField, string> = {
  vsHi: 'vs_hi',
  vsLo: 'vs_lo',
  vTop: 'vtop',
  vBot: 'vbot',
  rPot: 'rpot'
};

type ParsedInputs = {
  numbers: Partial<Record<PotBiasField, number>>;
  errors: Partial<Record<PotBiasField, string>>;
  infoMessages: Set<string>;
};

type CalculationOutcome = {
  rTop?: number;
  rBottom?: number;
  errors: Partial<Record<PotBiasField, string>>;
  calculationError: string | null;
  insufficient: boolean;
  infoMessages: Set<string>;
  warningMessages: string[];
};

function useDebouncedInputs(values: PotBiasInputs): PotBiasInputs {
  const [debounced, setDebounced] = React.useState(values);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(values), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [values]);

  return debounced;
}

function parseInputs(inputs: PotBiasInputs): ParsedInputs {
  const numbers: Partial<Record<PotBiasField, number>> = {};
  const errors: Partial<Record<PotBiasField, string>> = {};
  const infoMessages = new Set<string>();

  (['vsHi', 'vsLo', 'vTop', 'vBot'] as PotBiasField[]).forEach((field) => {
    const raw = inputs[field].trim();
    if (!raw) {
      return;
    }
    const parsed = parseVolts(raw);
    if (parsed instanceof Error) {
      errors[field] = parsed.message;
      return;
    }
    numbers[field] = parsed;
  });

  const rPotRaw = inputs.rPot.trim();
  if (rPotRaw) {
    const parsed = parseOhms(rPotRaw);
    if (parsed instanceof Error) {
      errors.rPot = parsed.message;
    } else {
      numbers.rPot = parsed;
      if (parsed < MIN_RECOMMENDED_RESISTANCE || parsed > MAX_RECOMMENDED_RESISTANCE) {
        infoMessages.add('R_POT is outside the suggested range (100 Ω ≤ R ≤ 100 MΩ).');
      }
    }
  }

  return { numbers, errors, infoMessages };
}

function computeOutcome(parsed: ParsedInputs, rawInputs: PotBiasInputs): CalculationOutcome {
  const numbers = parsed.numbers;
  const errors: Partial<Record<PotBiasField, string>> = { ...parsed.errors };
  const infoMessages = new Set(parsed.infoMessages);
  const warningMessages: string[] = [];

  const missingFields = (Object.keys(rawInputs) as PotBiasField[]).filter((field) => rawInputs[field].trim() === '');
  if (missingFields.length > 0) {
    return {
      rTop: undefined,
      rBottom: undefined,
      errors,
      calculationError: null,
      insufficient: true,
      infoMessages,
      warningMessages
    };
  }

  const generalErrors: string[] = [];

  if (numbers.vsHi !== undefined && numbers.vsLo !== undefined && numbers.vsHi <= numbers.vsLo) {
    errors.vsHi = 'Must be greater than V_SUP_LO.';
    errors.vsLo = 'Must be less than V_SUP_HI.';
    generalErrors.push('V_SUP_HI must be greater than V_SUP_LO.');
  }

  if (numbers.vTop !== undefined && numbers.vBot !== undefined && numbers.vTop <= numbers.vBot) {
    errors.vTop = 'Must be greater than V_BOT_TARGET.';
    errors.vBot = 'Must be less than V_TOP_TARGET.';
    generalErrors.push('V_TOP_TARGET must be greater than V_BOT_TARGET.');
  }

  if (numbers.vTop !== undefined && numbers.vsHi !== undefined && numbers.vTop >= numbers.vsHi) {
    errors.vTop = 'Must be less than V_SUP_HI.';
    generalErrors.push('V_TOP_TARGET must be less than V_SUP_HI.');
  }

  if (numbers.vBot !== undefined && numbers.vsLo !== undefined && numbers.vBot <= numbers.vsLo) {
    errors.vBot = 'Must be greater than V_SUP_LO.';
    generalErrors.push('V_BOT_TARGET must be greater than V_SUP_LO.');
  }

  if (numbers.rPot !== undefined && numbers.rPot <= 0) {
    errors.rPot = 'Resistance must be greater than zero.';
    generalErrors.push('R_POT must be greater than zero.');
  }

  if (generalErrors.length > 0) {
    return {
      rTop: undefined,
      rBottom: undefined,
      errors,
      calculationError: generalErrors.join(' '),
      insufficient: false,
      infoMessages,
      warningMessages
    };
  }

  if (
    numbers.vsHi === undefined ||
    numbers.vsLo === undefined ||
    numbers.vTop === undefined ||
    numbers.vBot === undefined ||
    numbers.rPot === undefined
  ) {
    return {
      rTop: undefined,
      rBottom: undefined,
      errors,
      calculationError: 'Unable to compute results with the provided inputs.',
      insufficient: false,
      infoMessages,
      warningMessages
    };
  }

  const solution = solvePotBias({
    vsHi: numbers.vsHi,
    vsLo: numbers.vsLo,
    vTop: numbers.vTop,
    vBot: numbers.vBot,
    rPot: numbers.rPot
  });

  if (solution instanceof Error) {
    return {
      rTop: undefined,
      rBottom: undefined,
      errors,
      calculationError: solution.message,
      insufficient: false,
      infoMessages,
      warningMessages
    };
  }

  if (solution.rTop > MAX_RECOMMENDED_RESISTANCE || solution.rBottom > MAX_RECOMMENDED_RESISTANCE) {
    warningMessages.push('Target voltages are very close together; resulting bias resistors are very large.');
  }

  if (solution.rTop < MIN_RECOMMENDED_RESISTANCE || solution.rTop > MAX_RECOMMENDED_RESISTANCE) {
    infoMessages.add('R_TOP is outside the suggested range (100 Ω ≤ R ≤ 100 MΩ).');
  }

  if (solution.rBottom < MIN_RECOMMENDED_RESISTANCE || solution.rBottom > MAX_RECOMMENDED_RESISTANCE) {
    infoMessages.add('R_BOTTOM is outside the suggested range (100 Ω ≤ R ≤ 100 MΩ).');
  }

  return {
    rTop: solution.rTop,
    rBottom: solution.rBottom,
    errors,
    calculationError: null,
    insufficient: false,
    infoMessages,
    warningMessages
  };
}

function PotBiasCalculatorContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } = useColorScheme();

  const [inputs, setInputs] = React.useState<PotBiasInputs>(() => ({
    vsHi: searchParams.get(QUERY_KEYS.vsHi) ?? DEFAULT_INPUTS.vsHi,
    vsLo: searchParams.get(QUERY_KEYS.vsLo) ?? DEFAULT_INPUTS.vsLo,
    vTop: searchParams.get(QUERY_KEYS.vTop) ?? DEFAULT_INPUTS.vTop,
    vBot: searchParams.get(QUERY_KEYS.vBot) ?? DEFAULT_INPUTS.vBot,
    rPot: searchParams.get(QUERY_KEYS.rPot) ?? DEFAULT_INPUTS.rPot
  }));

  const debouncedInputs = useDebouncedInputs(inputs);
  const lastUrlRef = React.useRef<string>('');

  const parsed = React.useMemo(() => parseInputs(debouncedInputs), [debouncedInputs]);
  const outcome = React.useMemo(() => computeOutcome(parsed, debouncedInputs), [parsed, debouncedInputs]);

  const rTopNeighbors = React.useMemo(() => {
    if (typeof outcome.rTop !== 'number' || outcome.rTop <= 0) {
      return null;
    }
    return nearestNeighbors(outcome.rTop, E24_SERIES);
  }, [outcome.rTop]);

  const rBottomNeighbors = React.useMemo(() => {
    if (typeof outcome.rBottom !== 'number' || outcome.rBottom <= 0) {
      return null;
    }
    return nearestNeighbors(outcome.rBottom, E24_SERIES);
  }, [outcome.rBottom]);

  const infoMessages = React.useMemo(() => Array.from(outcome.infoMessages), [outcome.infoMessages]);

  const handleInputChange = React.useCallback((field: PotBiasField, value: string) => {
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
    (Object.keys(debouncedInputs) as PotBiasField[]).forEach((field) => {
      const raw = debouncedInputs[field].trim();
      if (raw) {
        params.set(QUERY_KEYS[field], raw);
      }
    });
    const queryString = params.toString();
    const target = queryString ? `${pathname}?${queryString}` : pathname;
    if (target !== lastUrlRef.current) {
      router.replace(target as Route, { scroll: false });
      lastUrlRef.current = target;
    }
  }, [debouncedInputs, pathname, router]);

  const parsedNumbers = parsed.numbers;

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={1}>
            <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
              Biasing Tools
            </Typography>
            <Typography variant="h3" component="h1">
              Potentiometer Biasing
            </Typography>
          </Stack>
          <IconButton aria-label="Toggle color scheme" onClick={handleToggleColorScheme} color="primary">
            {colorSchemeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Stack>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={6}>
            <InputsForm
              values={inputs}
              onChange={handleInputChange}
              errors={outcome.errors}
              infoMessages={infoMessages}
              warningMessages={outcome.warningMessages}
              calculationError={outcome.calculationError}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ResultsCard
              vsHi={parsedNumbers.vsHi}
              vsLo={parsedNumbers.vsLo}
              vTop={parsedNumbers.vTop}
              vBot={parsedNumbers.vBot}
              rPot={parsedNumbers.rPot}
              rTop={outcome.rTop}
              rBottom={outcome.rBottom}
              neighbors={{ rTop: rTopNeighbors, rBottom: rBottomNeighbors }}
              insufficient={outcome.insufficient}
              warningMessages={outcome.warningMessages}
              infoMessages={infoMessages}
              errorMessage={outcome.calculationError}
            />
          </Grid>
        </Grid>

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Reference
          </Typography>
          <Typography variant="body2" color="text.secondary">
            R_TOP = ((V_SUP_HI − V_TOP_TARGET) × R_POT) / (V_TOP_TARGET − V_BOT_TARGET)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            R_BOTTOM = ((V_BOT_TARGET − V_SUP_LO) × R_POT) / (V_TOP_TARGET − V_BOT_TARGET)
          </Typography>
        </Box>
      </Stack>
    </Container>
  );
}

export default function PotBiasCalculatorPage() {
  return (
    <React.Suspense fallback={null}>
      <PotBiasCalculatorContent />
    </React.Suspense>
  );
}
