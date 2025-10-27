'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Snackbar,
  Stack,
  Typography
} from '@mui/material';
import * as React from 'react';
import CopyChip from '../common/CopyChip';
import { formatCap, type CapUnit } from '../../lib/capconv/parse';
import { nearestE6CapInUnit } from '../../lib/series/nearestE6Cap';

export type ResultsGridProps = {
  valueF: number | null;
  rawInput: string;
  errorMessage?: string | null;
};

const UNITS: CapUnit[] = ['pF', 'nF', 'uF', 'F'];

export default function ResultsGrid({ valueF, rawInput, errorMessage }: ResultsGridProps) {
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(null);

  const handleSnackbarClose = React.useCallback(() => {
    setSnackbarMessage(null);
  }, []);

  const handleCopy = React.useCallback((_: string) => {
    setSnackbarMessage('Copied!');
  }, []);

  const hasValue = typeof valueF === 'number' && Number.isFinite(valueF) && valueF > 0 && !errorMessage;

  const rows = React.useMemo(() => {
    if (!hasValue || valueF == null) {
      return [];
    }
    return UNITS.map((unit) => {
      const formattedValue = formatCap(valueF, unit);
      const e6 = nearestE6CapInUnit(valueF, unit);
      const errorAbsLabel = `${formatSigned(e6.errorAbsInUnit)} ${unit}`;
      const errorPctLabel = formatPercent(e6.errorRelPct);
      return {
        unit,
        formattedValue,
        e6,
        errorAbsLabel,
        errorPctLabel
      };
    });
  }, [hasValue, valueF]);

  const summary = React.useMemo(() => {
    if (!hasValue || !valueF) {
      return '';
    }
    const inputLine = `Input: ${formatInputLabel(rawInput, valueF)}`;
    const lines = rows.map((row) => `${row.unit}: ${row.formattedValue} | E6: ${row.e6.label} (${row.errorPctLabel})`);
    return [inputLine, ...lines].join('\n');
  }, [hasValue, rawInput, rows, valueF]);

  const handleCopyAll = React.useCallback(async () => {
    if (!summary) {
      return;
    }
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        return;
      }
      await navigator.clipboard.writeText(summary);
      setSnackbarMessage('Copied!');
    } catch (error) {
      console.error('Failed to copy summary', error);
    }
  }, [summary]);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h5" component="h2">
              Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Values are shown across pico, nano, micro, and farad scales with the closest single E6 capacitor.
            </Typography>
          </Stack>

          {!hasValue ? (
            <Box>
              {errorMessage ? (
                <Alert severity="error" variant="outlined">
                  {errorMessage}
                </Alert>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Enter a capacitance to see conversions.
                </Typography>
              )}
            </Box>
          ) : (
            <Grid container spacing={3} columns={{ xs: 1, sm: 1 }}>
              {rows.map((row) => (
                <Grid item xs={1} key={row.unit}>
                  <Stack spacing={1}>
                    <Typography variant="h6" component="p" sx={{ fontWeight: 600 }}>
                      {row.formattedValue}
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                      <CopyChip
                        label={row.e6.label}
                        valueToCopy={row.e6.label}
                        onCopied={handleCopy}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {row.errorAbsLabel} ({row.errorPctLabel})
                      </Typography>
                    </Stack>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          )}

          <Button variant="outlined" onClick={handleCopyAll} startIcon={<ContentCopyIcon />} disabled={!summary}>
            Copy All
          </Button>
        </Stack>
      </CardContent>
      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={snackbarMessage ?? ''}
      />
    </Card>
  );
}

function formatSigned(value: number): string {
  if (!Number.isFinite(value)) {
    return '--';
  }
  if (value === 0) {
    return '±0';
  }
  const abs = Math.abs(value);
  const exponent = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, 3 - exponent - 1);
  let formatted = abs.toFixed(decimals);
  if (decimals > 0 && formatted.includes('.')) {
    formatted = formatted.replace(/0+$/, '');
    if (formatted.endsWith('.')) {
      formatted = `${formatted}0`;
    }
  }
  return `${value > 0 ? '+' : '-'}${formatted}`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return '--';
  }
  if (value === 0) {
    return '±0.00%';
  }
  const sign = value > 0 ? '+' : '-';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatInputLabel(rawInput: string, valueF: number): string {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return `${formatCap(valueF, 'F')}`;
  }
  if (/[pnum]$/i.test(trimmed)) {
    if (/[pnum]$/.test(trimmed)) {
      return `${trimmed}F`;
    }
    return trimmed;
  }
  return `${trimmed} F`;
}
