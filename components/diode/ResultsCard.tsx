'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Alert, Button, Card, CardContent, CardMedia, Snackbar, Stack, Typography } from '@mui/material';
import * as React from 'react';
import CopyChip from '../common/CopyChip';
import { formatMilliAmps, formatOhms, formatVolts } from '../../lib/diode/parse';
import type { NeighborResult } from '../../lib/series/nearest';

type ResultField = 'vs' | 'vf' | 'if' | 'r';

export type ResultsCardProps = {
  vs?: number;
  vf?: number;
  ifA?: number;
  r?: number;
  computedField?: 'vs' | 'vf' | 'ifA' | 'r' | null;
  neighbors?: NeighborResult | null;
  insufficient?: boolean;
  warningMessages?: string[];
  infoMessages?: string[];
  errorMessage?: string | null;
};

const FIELD_TITLES: Record<ResultField, string> = {
  vs: 'Vs',
  vf: 'Vf',
  if: 'If',
  r: 'R'
};

const COPY_MESSAGE = 'Copied!';

function fieldValue(field: ResultField, value?: number): string {
  if (value === undefined) {
    return '—';
  }
  switch (field) {
    case 'vs':
    case 'vf':
      return formatVolts(value);
    case 'r':
      return formatOhms(value);
    case 'if':
      return formatMilliAmps(value);
    default:
      return '—';
  }
}

function toResultField(field: 'vs' | 'vf' | 'ifA' | 'r' | null | undefined): ResultField | null {
  if (!field) {
    return null;
  }
  return field === 'ifA' ? 'if' : field;
}

export default function ResultsCard({
  vs,
  vf,
  ifA,
  r,
  computedField,
  neighbors,
  insufficient = false,
  warningMessages = [],
  infoMessages = [],
  errorMessage
}: ResultsCardProps) {
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState(COPY_MESSAGE);

  const normalizedComputedField = toResultField(computedField);
  const showResults = !insufficient && [vs, vf, ifA, r].some((value) => typeof value === 'number');

  const handleCopyAll = React.useCallback(async () => {
    if (!showResults || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    const lines = [
      `Vs: ${fieldValue('vs', vs)}`,
      `Vf: ${fieldValue('vf', vf)}`,
      `If: ${fieldValue('if', ifA)}`,
      `R: ${fieldValue('r', r)}`
    ];

    if (normalizedComputedField === 'r' && neighbors) {
      const below = neighbors.below !== null ? formatOhms(neighbors.below) : '—';
      const above = neighbors.above !== null ? formatOhms(neighbors.above) : '—';
      lines.push(`E24 neighbors for R: ${below} (below), ${above} (above)`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setSnackbarMessage(COPY_MESSAGE);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy diode summary', error);
    }
  }, [neighbors, normalizedComputedField, r, showResults, vs, vf, ifA]);

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

  const renderField = (field: ResultField, value?: number) => {
    const highlight = normalizedComputedField === field;
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
    showResults && normalizedComputedField === 'r' && neighbors && (neighbors.below || neighbors.above);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardMedia
        component="img"
        image="/img/LED-current.svg"
        alt="LED current flow diagram"
        sx={{
          maxHeight: 220,
          width: '100%',
          objectFit: 'contain',
          backgroundColor: 'background.default',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          p: 2,
        }}
      />
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
              {renderField('vs', vs)}
              {renderField('vf', vf)}
              {renderField('if', ifA)}
              {renderField('r', r)}

              {showNeighbors && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Nearest E24
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {neighbors?.below && (
                      <CopyChip
                        label={`Below ${formatOhms(neighbors.below)}`}
                        valueToCopy={formatOhms(neighbors.below)}
                        onCopied={handleChipCopied}
                      />
                    )}
                    {neighbors?.above && (
                      <CopyChip
                        label={`Above ${formatOhms(neighbors.above)}`}
                        valueToCopy={formatOhms(neighbors.above)}
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
