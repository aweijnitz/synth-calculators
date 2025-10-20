'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Alert, Button, Card, CardContent, CardMedia, Snackbar, Stack, Typography } from '@mui/material';
import * as React from 'react';
import CopyChip from '../common/CopyChip';
import type { CalculatorField } from './CalculatorForm';
import { formatDb, formatGain, formatOhms } from '../../lib/opamp/parse';
import type { E24Neighbors } from '../../lib/opamp/e24';
import type { OpAmpMode } from '../../lib/opamp/impedance';

export type ResultsCardProps = {
  mode: OpAmpMode;
  rin?: number;
  rf?: number;
  gain?: number;
  computedField?: CalculatorField | null;
  neighbors?: E24Neighbors | null;
  inputImpedance: string;
  insufficient?: boolean;
  warningMessage?: string | null;
  infoMessages?: string[];
  errorMessage?: string | null;
};

const COPY_MESSAGE = 'Copied to clipboard';

export default function ResultsCard({
  mode,
  rin,
  rf,
  gain,
  computedField,
  neighbors,
  inputImpedance,
  insufficient = false,
  warningMessage,
  infoMessages = [],
  errorMessage
}: ResultsCardProps) {
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState(COPY_MESSAGE);

  const diagramSrc = mode === 'inverting' ? '/img/inverting_opamp.svg' : '/img/non-inverting_opamp.svg';
  const diagramAlt = mode === 'inverting' ? 'Inverting op-amp schematic' : 'Non-inverting op-amp schematic';

  const handleCopyAll = React.useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard || gain === undefined) {
      return;
    }

    const lines = [
      `Mode: ${mode === 'inverting' ? 'Inverting' : 'Non-inverting'}`,
      `Rin: ${rin !== undefined ? formatOhms(rin) : '—'}`,
      `Rf: ${rf !== undefined ? formatOhms(rf) : '—'}`,
      gain !== undefined ? `Gain: ${formatGain(gain)} V/V (${formatDb(gain)})` : 'Gain: —',
      `Zin: ${inputImpedance}`
    ];

    if (computedField && neighbors && (neighbors.below || neighbors.above)) {
      const label = computedField === 'rf' ? 'Rf' : 'Rin';
      const below = neighbors.below ? formatOhms(neighbors.below) : '—';
      const above = neighbors.above ? formatOhms(neighbors.above) : '—';
      lines.push(`E24 neighbors for ${label}: ${below} (below), ${above} (above)`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setSnackbarMessage(COPY_MESSAGE);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy summary', error);
    }
  }, [computedField, gain, inputImpedance, neighbors, rin, rf, mode]);

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

  const showResults = !insufficient && gain !== undefined;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardMedia
        component="img"
        image={diagramSrc}
        alt={diagramAlt}
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
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Gain (V/V)
                </Typography>
                <Typography variant="h4" component="p">
                  {gain !== undefined ? formatGain(gain) : '—'}
                </Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Gain (dB)
                </Typography>
                <Typography variant="h6" component="p">
                  {gain !== undefined ? formatDb(gain) : '—'}
                </Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Rin
                </Typography>
                <Typography>{rin !== undefined ? formatOhms(rin) : '—'}</Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Rf
                </Typography>
                <Typography>{rf !== undefined ? formatOhms(rf) : '—'}</Typography>
              </Stack>
              {computedField && neighbors && (neighbors.below || neighbors.above) && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Nearest E24
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {neighbors.below && (
                      <CopyChip
                        label={`Below ${formatOhms(neighbors.below)}`}
                        valueToCopy={formatOhms(neighbors.below)}
                        onCopied={handleChipCopied}
                      />
                    )}
                    {neighbors.above && (
                      <CopyChip
                        label={`Above ${formatOhms(neighbors.above)}`}
                        valueToCopy={formatOhms(neighbors.above)}
                        onCopied={handleChipCopied}
                      />
                    )}
                  </Stack>
                </Stack>
              )}
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Input impedance
                </Typography>
                <Typography>{inputImpedance}</Typography>
              </Stack>
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
