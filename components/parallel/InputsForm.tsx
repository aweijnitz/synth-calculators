'use client';

import ClearIcon from '@mui/icons-material/Clear';
import { Alert, Card, CardContent, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import * as React from 'react';

type Field = 'r1' | 'r2';

export type ParallelInputs = Record<Field, string>;

export type InputsFormProps = {
  values: ParallelInputs;
  onChange: (field: Field, value: string) => void;
  onClear: (field: Field) => void;
  errors?: Partial<Record<Field, string>>;
  infoMessages?: string[];
};

const FIELD_LABELS: Record<Field, string> = {
  r1: 'R1 (Ω)',
  r2: 'R2 (Ω)',
};

const FIELD_HELPERS: Record<Field, string> = {
  r1: 'Ohms; allow `k` or `M` (case-sensitive).',
  r2: 'Ohms; allow `k` or `M` (case-sensitive).',
};

function helperText(field: Field, error?: string): string {
  if (error) {
    return error;
  }
  return FIELD_HELPERS[field];
}

export default function InputsForm({ values, onChange, onClear, errors = {}, infoMessages = [] }: InputsFormProps) {
  const renderField = (field: Field) => {
    const value = values[field];
    const error = errors[field];

    return (
      <TextField
        key={field}
        label={FIELD_LABELS[field]}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        fullWidth
        error={Boolean(error)}
        helperText={helperText(field, error)}
        InputProps={{
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton aria-label={`Clear ${FIELD_LABELS[field]}`} onClick={() => onClear(field)} edge="end" size="small">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
      />
    );
  };

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h5" component="h2">
              Parallel Resistors
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter two resistor values to compute their equivalent parallel resistance.
            </Typography>
          </Stack>

          <Stack spacing={2}>{(['r1', 'r2'] as Field[]).map(renderField)}</Stack>

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
