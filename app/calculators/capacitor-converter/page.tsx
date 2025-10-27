'use client';

export const dynamic = 'force-dynamic';

import { Box, Container, Grid, Stack, Typography } from '@mui/material';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import ConverterForm from '../../../components/capconv/ConverterForm';
import ResultsGrid from '../../../components/capconv/ResultsGrid';
import CalculatorHeader from '../../../components/common/CalculatorHeader';
import { MAX_FARADS, MIN_FARADS, parseCapacitance } from '../../../lib/capconv/parse';

const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

function useUrlSync(value: string) {
  const router = useRouter();
  const pathname = usePathname();
  const lastUrlRef = React.useRef<string>('');

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (value.trim()) {
      params.set('c', value);
    }
    const query = params.toString();
    const nextUrl = (query ? `${pathname}?${query}` : pathname) as Route;
    if (lastUrlRef.current !== nextUrl) {
      router.replace(nextUrl, { scroll: false });
      lastUrlRef.current = nextUrl;
    }
  }, [pathname, router, value]);
}

type ParseState = {
  value: number | null;
  error: string | null;
};

function parseForDisplay(raw: string): ParseState {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: null };
  }
  const parsed = parseCapacitance(raw);
  if (parsed instanceof Error) {
    return { value: null, error: parsed.message };
  }
  return { value: parsed, error: null };
}

function buildInfoMessages(valueF: number | null): string[] {
  if (valueF == null || !Number.isFinite(valueF)) {
    return [];
  }
  const messages: string[] = [];
  if (valueF < MIN_FARADS) {
    messages.push('This value is below about 1e-15 F, which is unusually small for practical capacitors.');
  }
  if (valueF > MAX_FARADS) {
    messages.push('This value is above 10 F, which is beyond typical single capacitor values.');
  }
  return messages;
}

function CapacitorConverterContent() {
  const searchParams = useSearchParams();
  const [rawInput, setRawInput] = React.useState(() => searchParams.get('c') ?? '');
  const debouncedInput = useDebouncedValue(rawInput, DEBOUNCE_MS);

  const immediate = React.useMemo(() => parseForDisplay(rawInput), [rawInput]);
  const debounced = React.useMemo(() => parseForDisplay(debouncedInput), [debouncedInput]);

  useUrlSync(debouncedInput);

  const infoMessages = React.useMemo(() => buildInfoMessages(immediate.value), [immediate.value]);

  const handleChange = React.useCallback((value: string) => {
    setRawInput(value);
  }, []);

  const handleClear = React.useCallback(() => {
    setRawInput('');
  }, []);

  return (
    <>
      <CalculatorHeader title="Capacitor Converter" overline="Synth calculators" />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={4}>
          <Box>
            <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
              Capacitor Tools
            </Typography>
            <Typography variant="h3" component="h1" gutterBottom>
              Capacitor Suffix Converter
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter a capacitance with or without a suffix to see synchronized values and closest single E6 matches.
            </Typography>
          </Box>

          <Grid container spacing={3} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <ConverterForm
                value={rawInput}
                onChange={handleChange}
                onClear={handleClear}
                errorMessage={immediate.error}
                infoMessages={infoMessages}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <ResultsGrid valueF={debounced.value} rawInput={debouncedInput} errorMessage={immediate.error} />
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </>
  );
}

export default function CapacitorConverterPage() {
  return (
    <React.Suspense fallback={null}>
      <CapacitorConverterContent />
    </React.Suspense>
  );
}
