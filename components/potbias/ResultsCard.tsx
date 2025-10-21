'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardMedia,
  Snackbar,
  Stack,
  Typography
} from '@mui/material';
import * as React from 'react';
import CopyChip from '../common/CopyChip';
import { formatOhms, formatVolts } from '../../lib/potbias/parse';
import type { NeighborResult } from '../../lib/series/nearest';

export type ResultsCardProps = {
  vsHi?: number;
  vsLo?: number;
  vTop?: number;
  vBot?: number;
  rPot?: number;
  rTop?: number;
  rBottom?: number;
  neighbors?: {
    rTop?: NeighborResult | null;
    rBottom?: NeighborResult | null;
  };
  insufficient?: boolean;
  warningMessages?: string[];
  infoMessages?: string[];
  errorMessage?: string | null;
};

const COPY_MESSAGE = 'Copied!';

function formatResistance(value?: number): string {
  if (value === undefined) {
    return '—';
  }
  return formatOhms(value);
}

export default function ResultsCard({
  vsHi,
  vsLo,
  vTop,
  vBot,
  rPot,
  rTop,
  rBottom,
  neighbors,
  insufficient = false,
  warningMessages = [],
  infoMessages = [],
  errorMessage
}: ResultsCardProps) {
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState(COPY_MESSAGE);

  const showResults =
    !insufficient && typeof rTop === 'number' && typeof rBottom === 'number' && rTop > 0 && rBottom > 0;

  const handleCopyAll = React.useCallback(async () => {
    if (!showResults || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    const lines = [
      `V_SUP_HI: ${formatVolts(vsHi ?? Number.NaN)}`,
      `V_SUP_LO: ${formatVolts(vsLo ?? Number.NaN)}`,
      `V_TOP_TARGET: ${formatVolts(vTop ?? Number.NaN)}`,
      `V_BOT_TARGET: ${formatVolts(vBot ?? Number.NaN)}`,
      `R_POT: ${formatResistance(rPot)}`,
      `R_TOP: ${formatResistance(rTop)}${neighbors?.rTop ? buildNeighborSummary(neighbors.rTop) : ''}`,
      `R_BOTTOM: ${formatResistance(rBottom)}${neighbors?.rBottom ? buildNeighborSummary(neighbors.rBottom) : ''}`
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setSnackbarMessage(COPY_MESSAGE);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy potentiometer bias summary', error);
    }
  }, [neighbors, rBottom, rPot, rTop, showResults, vsHi, vsLo, vBot, vTop]);

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

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardMedia
        component="img"
        image="/img/pot-bias-calculator.svg"
        alt="Potentiometer biasing schematic"
        sx={{
          maxHeight: 220,
          width: '100%',
          objectFit: 'contain',
          backgroundColor: 'background.default',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          p: 2
        }}
      />
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h5" component="h2">
            Results
          </Typography>

          {insufficient && (
            <Typography variant="body2" color="text.secondary">
              Provide all inputs to compute the bias resistors.
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
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  R_TOP
                </Typography>
                <Typography variant="h4" component="p">
                  {formatResistance(rTop)}
                </Typography>
                {renderNeighborChips(neighbors?.rTop, handleChipCopied)}
              </Stack>

              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  R_BOTTOM
                </Typography>
                <Typography variant="h4" component="p">
                  {formatResistance(rBottom)}
                </Typography>
                {renderNeighborChips(neighbors?.rBottom, handleChipCopied)}
              </Stack>
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

function renderNeighborChips(neighbors: NeighborResult | null | undefined, onCopied: () => void) {
  if (!neighbors || (!neighbors.above && !neighbors.below)) {
    return null;
  }
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        Nearest E24
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {neighbors.below && (
          <CopyChip
            label={`Below ${formatOhms(neighbors.below)}`}
            valueToCopy={formatOhms(neighbors.below)}
            onCopied={onCopied}
          />
        )}
        {neighbors.above && (
          <CopyChip
            label={`Above ${formatOhms(neighbors.above)}`}
            valueToCopy={formatOhms(neighbors.above)}
            onCopied={onCopied}
          />
        )}
      </Stack>
    </Stack>
  );
}

function buildNeighborSummary(result: NeighborResult | null | undefined): string {
  if (!result) {
    return '';
  }
  const below = result.below ? formatOhms(result.below) : '—';
  const above = result.above ? formatOhms(result.above) : '—';
  return ` (E24: ${below}↓, ${above}↑)`;
}
