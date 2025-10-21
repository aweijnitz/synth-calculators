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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import * as React from 'react';

type Field = 'c1' | 'c2' | 'rPotMax' | 'rSeriesTop' | 'rSeriesBottom';

export type EqualResistorInputs = Record<Field, string> & { mode: 'lowpass' };

export type InputsFormProps = {
  values: EqualResistorInputs;
  errors: Partial<Record<Field, string>>;
  onChange: (field: Field, value: string) => void;
  onModeChange?: (mode: 'lowpass') => void;
  helperMessage?: string;
  warningMessage?: string | null;
  infoMessages?: string[];
};

const FIELD_LABELS: Record<Field, string> = {
  c1: 'Capacitor C1',
  c2: 'Capacitor C2',
  rPotMax: 'Potentiometer Max (per gang)',
  rSeriesTop: 'Series Resistor (top)',
  rSeriesBottom: 'Series Resistor (bottom)',
};

const FIELD_HELPERS: Record<Field, string> = {
  c1: 'Farads; allow `p`, `n`, `u`, `m` (case-sensitive).',
  c2: 'Farads; allow `p`, `n`, `u`, `m` (case-sensitive).',
  rPotMax: 'Ohms; allow `k`, `M` (case-sensitive).',
  rSeriesTop: 'Optional. Ohms; allow `k`, `M`. Default 0Ω.',
  rSeriesBottom: 'Optional. Ohms; allow `k`, `M`. Default 0Ω.',
};

const ORDER: Field[] = ['c1', 'c2', 'rPotMax', 'rSeriesTop', 'rSeriesBottom'];

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
  onModeChange,
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
            <ToggleButtonGroup
              color="primary"
              exclusive
              value={values.mode}
              onChange={(_, next) => {
                if (next) {
                  onModeChange?.(next);
                }
              }}
              aria-label="Filter mode"
              size="small"
            >
              <ToggleButton value="lowpass">Low-pass</ToggleButton>
            </ToggleButtonGroup>
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
