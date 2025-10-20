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
import type { VoltageDividerField } from '../../lib/vdiv/solve';

export type DividerInputs = {
  vh: string;
  vl: string;
  r1: string;
  r2: string;
  vo: string;
};

export type DividerFormProps = {
  values: DividerInputs;
  onChange: (field: VoltageDividerField, value: string) => void;
  onClear: (field: VoltageDividerField) => void;
  errors: Partial<Record<VoltageDividerField, string>>;
  helperMessage?: string;
  warningMessages?: string[];
  infoMessages?: string[];
  calculationError?: string | null;
};

const FIELD_LABELS: Record<VoltageDividerField, string> = {
  vh: 'Volt_high (V)',
  vl: 'Volt_low (V)',
  r1: 'R1 (Ω)',
  r2: 'R2 (Ω)',
  vo: 'Volt_out (V)'
};

const FIELD_HELPERS: Record<VoltageDividerField, string> = {
  vh: 'Provide the upper voltage rail.',
  vl: 'Provide the lower voltage rail.',
  r1: 'Ohms; allow `k`, `M` (case-sensitive).',
  r2: 'Ohms; allow `k`, `M` (case-sensitive).',
  vo: 'Voltage measured at the junction of R1 and R2.'
};

function helperText(field: VoltageDividerField, error?: string): string {
  if (error) {
    return error;
  }
  return FIELD_HELPERS[field];
}

export default function DividerForm({
  values,
  onChange,
  onClear,
  errors,
  helperMessage,
  warningMessages = [],
  infoMessages = [],
  calculationError
}: DividerFormProps) {
  const renderField = (field: VoltageDividerField) => {
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
              Voltage Divider
            </Typography>
            {helperMessage && (
              <Typography variant="body2" color="text.secondary">
                {helperMessage}
              </Typography>
            )}
          </Stack>

          <Stack spacing={2}>{(['vh', 'vl', 'r1', 'r2', 'vo'] as VoltageDividerField[]).map(renderField)}</Stack>

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
