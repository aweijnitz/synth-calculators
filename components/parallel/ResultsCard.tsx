'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Alert, Button, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import * as React from 'react';
import { formatOhms } from '../../lib/parallel/parse';

type Field = 'r1' | 'r2' | 'rParallel';

export type ResultsCardProps = {
  r1?: number;
  r2?: number;
  rParallel?: number;
  insufficient?: boolean;
  warningMessages?: string[];
  infoMessages?: string[];
};

const FIELD_TITLES: Record<Field, string> = {
  r1: 'R1',
  r2: 'R2',
  rParallel: 'R_parallel',
};

const COPY_SUCCESS = 'Copied to clipboard';

function fieldValue(value?: number): string {
  if (value === undefined) {
    return '—';
  }
  return formatOhms(value);
}

export default function ResultsCard({
  r1,
  r2,
  rParallel,
  insufficient = false,
  warningMessages = [],
  infoMessages = [],
}: ResultsCardProps) {
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState(COPY_SUCCESS);

  const showResult = !insufficient && typeof rParallel === 'number';

  const handleCopyAll = React.useCallback(async () => {
    if (!showResult || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    const lines = [`R1: ${fieldValue(r1)}`, `R2: ${fieldValue(r2)}`, `R_parallel: ${fieldValue(rParallel)}`];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setSnackbarMessage(COPY_SUCCESS);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy parallel resistor summary', error);
    }
  }, [r1, r2, rParallel, showResult]);

  const handleSnackbarClose = (_?: unknown, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h5" component="h2">
            Result
          </Typography>

          {insufficient && (
            <Typography variant="body2" color="text.secondary">
              Provide values for both resistors to see the equivalent resistance.
            </Typography>
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

          {showResult && (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  {FIELD_TITLES.rParallel}
                </Typography>
                <Typography variant="h3" component="p">
                  {fieldValue(rParallel)}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                {(['r1', 'r2'] as Array<'r1' | 'r2'>).map((field) => (
                  <Stack key={field} spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {FIELD_TITLES[field]}
                    </Typography>
                    <Typography variant="body1" component="p">
                      {fieldValue(field === 'r1' ? r1 : r2)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}

          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyAll}
            disabled={!showResult}
          >
            Copy All
          </Button>
        </Stack>
      </CardContent>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2500}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Card>
  );
}
