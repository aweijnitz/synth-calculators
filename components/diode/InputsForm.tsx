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
  Typography
} from '@mui/material';
import * as React from 'react';

export type DiodeInputs = {
  vs: string;
  vf: string;
  if: string;
  r: string;
};

export type DiodeField = keyof DiodeInputs;

export type InputsFormProps = {
  values: DiodeInputs;
  onChange: (field: DiodeField, value: string) => void;
  onClear: (field: DiodeField) => void;
  errors: Partial<Record<DiodeField, string>>;
  helperMessage?: string;
  warningMessages?: string[];
  infoMessages?: string[];
  calculationError?: string | null;
};

const FIELD_LABELS: Record<DiodeField, string> = {
  vs: 'Vs (V)',
  vf: 'Vf (V)',
  if: 'If (A)',
  r: 'R (Ω)'
};

const FIELD_HELPERS: Record<DiodeField, string> = {
  vs: 'Supply voltage.',
  vf: 'Forward drop across the diode.',
  if: 'Amps; allow `m` for mA (e.g., `15m` = 0.015 A).',
  r: 'Ohms; allow `k`, `M` (case-sensitive).'
};

function helperText(field: DiodeField, error?: string): string {
  if (error) {
    return error;
  }
  return FIELD_HELPERS[field];
}

export default function InputsForm({
  values,
  onChange,
  onClear,
  errors,
  helperMessage,
  warningMessages = [],
  infoMessages = [],
  calculationError
}: InputsFormProps) {
  const renderField = (field: DiodeField) => {
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
                onClick={() => onClear(field)}
                edge="end"
                size="small"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined
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
              Diode Current & Resistor
            </Typography>
            {helperMessage && (
              <Typography variant="body2" color="text.secondary">
                {helperMessage}
              </Typography>
            )}
          </Stack>

          <Stack spacing={2}>{(['vs', 'vf', 'if', 'r'] as DiodeField[]).map(renderField)}</Stack>

          <Typography variant="body2" color="text.secondary">
            LEDs commonly have Vf between <strong>1.7 V</strong> and <strong>2.2 V</strong>.
          </Typography>

          <Stack spacing={1}>
            {calculationError && (
              <Alert severity="error" variant="outlined">
                {calculationError}
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
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
