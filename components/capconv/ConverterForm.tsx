'use client';

import ClearIcon from '@mui/icons-material/Clear';
import { Alert, Card, CardContent, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import * as React from 'react';

export type ConverterFormProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  errorMessage?: string | null;
  infoMessages?: string[];
};

const HELPER_TEXT = 'Accepts p, n, u, m (lowercase). Example: 22n';

export default function ConverterForm({ value, onChange, onClear, errorMessage, infoMessages = [] }: ConverterFormProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h5" component="h2">
              Capacitor Suffix Converter
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Convert a capacitance into pico, nano, micro, and farads instantly.
            </Typography>
          </Stack>

          <TextField
            label="Capacitance"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            fullWidth
            error={Boolean(errorMessage)}
            helperText={errorMessage ?? HELPER_TEXT}
            InputProps={{
              endAdornment: value ? (
                <InputAdornment position="end">
                  <IconButton aria-label="Clear capacitance" onClick={onClear} edge="end" size="small">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined
            }}
            autoComplete="off"
          />

          {infoMessages.length > 0 && (
            <Stack spacing={1}>
              {infoMessages.map((message) => (
                <Alert key={message} severity="info" variant="outlined">
                  {message}
                </Alert>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
