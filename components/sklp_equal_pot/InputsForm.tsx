'use client';

import ClearIcon from '@mui/icons-material/Clear';
import {
  Alert,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import * as React from 'react';

export type Field = 'fTarget50' | 'rPotMax' | 'cBase';

export type Inputs = Record<Field, string>;

export type InputsFormProps = {
  values: Inputs;
  errors: Partial<Record<Field, string>>;
  onChange: (field: Field, value: string) => void;
  helperMessage?: string;
  warningMessage?: string | null;
  infoMessages?: string[];
};

const FIELD_LABELS: Record<Field, string> = {
  fTarget50: 'Target f₀ @ 50%',
  rPotMax: 'Dual-gang Pot Value',
  cBase: 'Capacitor Seed (optional)',
};

const FIELD_HELPERS: Record<Field, string> = {
  fTarget50: 'Hz; allow `k`, `M` (case-sensitive).',
  rPotMax: 'Ω; allow `k`, `M` (case-sensitive).',
  cBase: 'Farads; allow `p`, `n`, `u`, `m` (case-sensitive).',
};

const ORDER: Field[] = ['fTarget50', 'rPotMax', 'cBase'];

function helperText(field: Field, error?: string): string {
  if (error) {
    return error;
  }
  return FIELD_HELPERS[field];
}

export default function InputsForm({
  values,
  errors,
  onChange,
  helperMessage,
  warningMessage,
  infoMessages = [],
}: InputsFormProps) {
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
              <IconButton
                aria-label={`Clear ${FIELD_LABELS[field]}`}
                onClick={() => onChange(field, '')}
                edge="end"
                size="small"
              >
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
              Sallen-Key LPF (R1 = R2)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unity gain · Dual-gang pot sweep
            </Typography>
          </Stack>

          <Stack spacing={2}>{ORDER.map(renderField)}</Stack>

          <Stack spacing={1}>
            {helperMessage && (
              <Typography variant="body2" color="text.secondary">
                {helperMessage}
              </Typography>
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
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
