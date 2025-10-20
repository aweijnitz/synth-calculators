'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Alert, Button, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import * as React from 'react';
import CopyChip from '../common/CopyChip';
import { formatOhms, formatVolts } from '../../lib/vdiv/parse';
import type { VoltageDividerField } from '../../lib/vdiv/solve';
import type { NeighborResult } from '../../lib/series/nearest';

export type ResultsCardProps = {
  vh?: number;
  vl?: number;
  r1?: number;
  r2?: number;
  vo?: number;
  computedField?: VoltageDividerField | null;
  neighbors?: NeighborResult | null;
  insufficient?: boolean;
  warningMessages?: string[];
  infoMessages?: string[];
  errorMessage?: string | null;
};

const FIELD_TITLES: Record<VoltageDividerField, string> = {
  vh: 'Volt_high',
  vl: 'Volt_low',
  r1: 'R1',
  r2: 'R2',
  vo: 'Volt_out'
};

const COPY_MESSAGE = 'Copied to clipboard';

function fieldValue(field: VoltageDividerField, value?: number): string {
  if (value === undefined) {
    return '—';
  }
  if (field === 'r1' || field === 'r2') {
    return formatOhms(value);
  }
  return formatVolts(value);
}

export default function ResultsCard({
  vh,
  vl,
  r1,
  r2,
  vo,
  computedField,
  neighbors,
  insufficient = false,
  warningMessages = [],
  infoMessages = [],
  errorMessage
}: ResultsCardProps) {
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState(COPY_MESSAGE);

  const showResults = !insufficient && [vh, vl, r1, r2, vo].some((value) => typeof value === 'number');

  const handleCopyAll = React.useCallback(async () => {
    if (!showResults || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    const lines = [
      `Volt_high: ${fieldValue('vh', vh)}`,
      `Volt_low: ${fieldValue('vl', vl)}`,
      `R1: ${fieldValue('r1', r1)}`,
      `R2: ${fieldValue('r2', r2)}`,
      `Volt_out: ${fieldValue('vo', vo)}`
    ];

    if (computedField && (computedField === 'r1' || computedField === 'r2') && neighbors) {
      const below = neighbors.below !== null ? fieldValue(computedField, neighbors.below) : '—';
      const above = neighbors.above !== null ? fieldValue(computedField, neighbors.above) : '—';
      lines.push(`E24 neighbors for ${computedField.toUpperCase()}: ${below} (below), ${above} (above)`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setSnackbarMessage(COPY_MESSAGE);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy voltage divider summary', error);
    }
  }, [computedField, neighbors, r1, r2, showResults, vh, vl, vo]);

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

  const renderField = (field: VoltageDividerField, value?: number) => {
    const highlight = computedField === field;
    return (
      <Stack key={field} spacing={0.5}>
        <Typography variant="subtitle2" color="text.secondary">
          {FIELD_TITLES[field]}
        </Typography>
        <Typography variant={highlight ? 'h4' : 'h6'} component="p">
          {fieldValue(field, value)}
        </Typography>
      </Stack>
    );
  };

  const showNeighbors =
    showResults && computedField && (computedField === 'r1' || computedField === 'r2') && neighbors && (neighbors.below || neighbors.above);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h5" component="h2">
            Results
          </Typography>

          {insufficient && (
            <Typography variant="body2" color="text.secondary">
              Leave exactly one field empty to calculate it.
            </Typography>
          )}

          {errorMessage && (
            <Alert severity="error" variant="outlined">
              {errorMessage}
            </Alert>
          )}

          {warningMessages.map((message) => (
            <Alert key={message} severity="warning" variant="outlined">
              {message}
            </Alert>
          ))}

          {infoMessages.map((message) => (
            <Alert key={message} severity="info" variant="outlined">
              {message}
            </Alert>
          ))}

          {showResults && (
            <Stack spacing={2}>
              {renderField('vh', vh)}
              {renderField('vl', vl)}
              {renderField('r1', r1)}
              {renderField('r2', r2)}
              {renderField('vo', vo)}

              {showNeighbors && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Nearest E24
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

          <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={handleCopyAll} disabled={!showResults}>
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
