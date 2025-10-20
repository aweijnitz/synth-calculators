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
  Typography
} from '@mui/material';
import * as React from 'react';
import type { RcFilterField, RcFilterMode } from '../../lib/rc/types';

export type FilterInputs = {
  r: string;
  c: string;
  fc: string;
};

export type FilterFormProps = {
  mode: RcFilterMode;
  onModeChange: (mode: RcFilterMode) => void;
  values: FilterInputs;
  onChange: (field: RcFilterField, value: string) => void;
  onClear: (field: RcFilterField) => void;
  errors: Partial<Record<RcFilterField, string>>;
  helperMessage?: string;
  warningMessage?: string | null;
  infoMessages?: string[];
  calculationError?: string | null;
};

const FIELD_LABELS: Record<RcFilterField, string> = {
  r: 'Resistance (R)',
  c: 'Capacitance (C)',
  fc: 'Cutoff Frequency (f_c)'
};

const FIELD_HELPERS: Record<RcFilterField, string> = {
  r: 'Ohms; allow `k`, `M` (case-sensitive).',
  c: 'Farads; allow `p`, `n`, `u`, `m` (case-sensitive).',
  fc: 'Hertz; allow `k`, `M` (case-sensitive).'
};

function helperText(field: RcFilterField, error?: string): string {
  if (error) {
    return error;
  }
  return FIELD_HELPERS[field];
}

export default function FilterForm({
  mode,
  onModeChange,
  values,
  onChange,
  onClear,
  errors,
  helperMessage,
  warningMessage,
  infoMessages = [],
  calculationError
}: FilterFormProps) {
  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: RcFilterMode | null) => {
    if (!newMode) return;
    onModeChange(newMode);
  };

  const renderField = (field: RcFilterField) => {
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
              RC Filter Calculator
            </Typography>
            <ToggleButtonGroup
              color="primary"
              exclusive
              value={mode}
              onChange={handleModeChange}
              aria-label="RC filter mode"
              size="small"
            >
              <ToggleButton value="lowpass">Low-pass</ToggleButton>
              <ToggleButton value="highpass">High-pass</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack spacing={2}>{(['r', 'c', 'fc'] as RcFilterField[]).map(renderField)}</Stack>

          <Stack spacing={1}>
            {helperMessage && (
              <Typography variant="body2" color="text.secondary">
                {helperMessage}
              </Typography>
            )}
            {calculationError && (
              <Alert severity="error" variant="outlined">
                {calculationError}
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
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
