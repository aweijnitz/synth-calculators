'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Alert, Button, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import * as React from 'react';
import CopyChip from '../common/CopyChip';
import { formatFarads, formatHertz, formatOhms } from '../../lib/rc/parse';
import type { NeighborResult } from '../../lib/series/nearest';

export type ResistorNeighbors = {
  r1: NeighborResult | null;
  r2: NeighborResult | null;
};

export type ResultsCardProps = {
  c1?: number;
  c2?: number;
  r1?: number;
  r2?: number;
  fc?: number;
  q?: number;
  insufficient?: boolean;
  warningMessage?: string | null;
  infoMessages?: string[];
  errorMessage?: string | null;
  neighbors?: ResistorNeighbors | null;
};

const COPY_MESSAGE = 'Copied to clipboard';

function formatQualityFactor(value?: number): string {
  if (!Number.isFinite(value ?? Number.NaN) || (value ?? 0) <= 0) {
    return '—';
  }
  return (value as number).toFixed((value as number) >= 10 ? 2 : 3);
}

export default function ResultsCard({
  c1,
  c2,
  r1,
  r2,
  fc,
  q,
  insufficient = false,
  warningMessage,
  infoMessages = [],
  errorMessage,
  neighbors,
}: ResultsCardProps) {
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState(COPY_MESSAGE);

  const handleSnackbarClose = (_?: unknown, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const showResults = !insufficient && typeof r1 === 'number' && typeof r2 === 'number';

  const handleCopyAll = React.useCallback(async () => {
    if (!showResults || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    const lines = [
      `C1: ${formatFarads(c1 ?? NaN)}`,
      `C2: ${formatFarads(c2 ?? NaN)}`,
      `R1: ${formatOhms(r1 ?? NaN)}`,
      `R2: ${formatOhms(r2 ?? NaN)}`,
      `Recomputed f_c: ${formatHertz(fc ?? NaN)}`,
      `Recomputed Q: ${formatQualityFactor(q)}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setSnackbarMessage(COPY_MESSAGE);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy Sallen-Key summary', error);
    }
  }, [c1, c2, fc, q, r1, r2, showResults]);

  const handleChipCopied = React.useCallback((label: string) => {
    setSnackbarMessage(`${label} copied`);
    setSnackbarOpen(true);
  }, []);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h5" component="h2">
            Results
          </Typography>

          {insufficient && (
            <Typography variant="body2" color="text.secondary">
              Enter f_c and Q to compute capacitor/resistor values.
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
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Capacitors
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="h6" component="p">
                    C1 = {formatFarads(c1 ?? NaN)}
                  </Typography>
                  <Typography variant="h6" component="p">
                    C2 = {formatFarads(c2 ?? NaN)}
                  </Typography>
                </Stack>
              </Stack>

              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Resistors
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="h6" component="p">
                    R1 = {formatOhms(r1 ?? NaN)}
                  </Typography>
                  <Typography variant="h6" component="p">
                    R2 = {formatOhms(r2 ?? NaN)}
                  </Typography>
                </Stack>
              </Stack>

              {neighbors && (neighbors.r1 || neighbors.r2) && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Nearest E24 Values
                  </Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {neighbors.r1?.below && (
                        <CopyChip
                          label={`R1 below ${formatOhms(neighbors.r1.below)}`}
                          valueToCopy={formatOhms(neighbors.r1.below)}
                          onCopied={handleChipCopied}
                        />
                      )}
                      {neighbors.r1?.above && (
                        <CopyChip
                          label={`R1 above ${formatOhms(neighbors.r1.above)}`}
                          valueToCopy={formatOhms(neighbors.r1.above)}
                          onCopied={handleChipCopied}
                        />
                      )}
                      {neighbors.r2?.below && (
                        <CopyChip
                          label={`R2 below ${formatOhms(neighbors.r2.below)}`}
                          valueToCopy={formatOhms(neighbors.r2.below)}
                          onCopied={handleChipCopied}
                        />
                      )}
                      {neighbors.r2?.above && (
                        <CopyChip
                          label={`R2 above ${formatOhms(neighbors.r2.above)}`}
                          valueToCopy={formatOhms(neighbors.r2.above)}
                          onCopied={handleChipCopied}
                        />
                      )}
                    </Stack>
                  </Stack>
                </Stack>
              )}

              <Typography variant="body2" color="text.secondary">
                Recomputed f_c = {formatHertz(fc ?? NaN)} · Q = {formatQualityFactor(q)}
              </Typography>
            </Stack>
          )}

          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyAll}
            disabled={!showResults}
          >
            Copy Summary
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
