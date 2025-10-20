'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Alert, Button, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import * as React from 'react';
import CopyChip from '../common/CopyChip';
import { formatFarads, formatHertz, formatOhms } from '../../lib/rc/parse';
import type { NeighborResult } from '../../lib/series/nearest';
import type { RcFilterField, RcFilterMode } from '../../lib/rc/types';

export type ResultsCardProps = {
  mode: RcFilterMode;
  r?: number;
  c?: number;
  fc?: number;
  computedField?: RcFilterField | null;
  neighbors?: NeighborResult | null;
  insufficient?: boolean;
  warningMessage?: string | null;
  infoMessages?: string[];
  errorMessage?: string | null;
};

const COPY_MESSAGE = 'Copied to clipboard';

function modeLabel(mode: RcFilterMode): string {
  return mode === 'lowpass' ? 'Low-pass' : 'High-pass';
}

function fieldValue(field: RcFilterField, value?: number): string {
  if (value === undefined) {
    return '—';
  }
  if (field === 'r') {
    return formatOhms(value);
  }
  if (field === 'c') {
    return formatFarads(value);
  }
  return formatHertz(value);
}

export default function ResultsCard({
  mode,
  r,
  c,
  fc,
  computedField,
  neighbors,
  insufficient = false,
  warningMessage,
  infoMessages = [],
  errorMessage
}: ResultsCardProps) {
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState(COPY_MESSAGE);

  const showResults = !insufficient && (r !== undefined || c !== undefined || fc !== undefined);

  const handleCopyAll = React.useCallback(async () => {
    if (!showResults || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    const lines = [
      `Mode: ${modeLabel(mode)}`,
      `Resistance (R): ${fieldValue('r', r)}`,
      `Capacitance (C): ${fieldValue('c', c)}`,
      `Cutoff Frequency (f_c): ${fieldValue('fc', fc)}`
    ];

    if (computedField && neighbors && (neighbors.below || neighbors.above)) {
      const below = neighbors.below !== null ? fieldValue(computedField, neighbors.below) : '—';
      const above = neighbors.above !== null ? fieldValue(computedField, neighbors.above) : '—';
      const label = computedField === 'r' ? 'E24' : 'E12';
      lines.push(`${label} neighbors for ${computedField.toUpperCase()}: ${below} (below), ${above} (above)`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setSnackbarMessage(COPY_MESSAGE);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy RC filter summary', error);
    }
  }, [c, computedField, fc, mode, neighbors, r, showResults]);

  const handleChipCopied = React.useCallback(() => {
    setSnackbarMessage(COPY_MESSAGE);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = (_?: unknown, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const renderField = (field: RcFilterField, value?: number) => {
    const highlight = computedField === field;
    const label = FIELD_TITLES[field];
    return (
      <Stack key={field} spacing={0.5}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant={highlight ? 'h4' : 'h6'} component="p">
          {fieldValue(field, value)}
        </Typography>
      </Stack>
    );
  };

  const showNeighbors =
    showResults && computedField && (computedField === 'r' || computedField === 'c') && neighbors && (neighbors.below || neighbors.above);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h5" component="h2">
            Results
          </Typography>

          {insufficient && (
            <Typography variant="body2" color="text.secondary">
              Enter any two values to compute the third.
            </Typography>
          )}

          {errorMessage && (
            <Alert severity="error" variant="outlined">
              {errorMessage}
            </Alert>
          )}

          {warningMessage && (
            <Alert severity="warning" variant="outlined">
              {warningMessage}
            </Alert>
          )}

          {infoMessages.map((message) => (
            <Alert key={message} severity="info" variant="outlined">
              {message}
            </Alert>
          ))}

          {showResults && (
            <Stack spacing={2}>
              {renderField('r', r)}
              {renderField('c', c)}
              {renderField('fc', fc)}

              {showNeighbors && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {computedField === 'r' ? 'Nearest E24' : 'Nearest E12'}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {neighbors?.below && (
                      <CopyChip
                        label={`Below ${fieldValue(computedField, neighbors.below)}`}
                        valueToCopy={fieldValue(computedField, neighbors.below)}
                        onCopied={handleChipCopied}
                      />
                    )}
                    {neighbors?.above && (
                      <CopyChip
                        label={`Above ${fieldValue(computedField, neighbors.above)}`}
                        valueToCopy={fieldValue(computedField, neighbors.above)}
                        onCopied={handleChipCopied}
                      />
                    )}
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}

          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyAll}
            disabled={!showResults}
          >
            Copy All
          </Button>
        </Stack>
      </CardContent>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        message={snackbarMessage}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Card>
  );
}

const FIELD_TITLES: Record<RcFilterField, string> = {
  r: 'Resistance (R)',
  c: 'Capacitance (C)',
  fc: 'Cutoff Frequency (f_c)'
};
