'use client';

import ClearIcon from '@mui/icons-material/Clear';
import { Alert, Card, CardContent, IconButton, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import * as React from 'react';
import type { OpAmpMode } from '../../lib/opamp/impedance';

export type CalculatorField = 'rin' | 'rf' | 'gain';

export type CalculatorInputs = {
  rin: string;
  rf: string;
  gain: string;
};

export type CalculatorFormProps = {
  mode: OpAmpMode;
  onModeChange: (mode: OpAmpMode) => void;
  values: CalculatorInputs;
  onChange: (field: CalculatorField, value: string) => void;
  onClear: (field: CalculatorField) => void;
  errors: Partial<Record<CalculatorField, string>>;
  helperMessage?: string;
  warningMessage?: string | null;
  infoMessages?: string[];
  calculationError?: string | null;
};

const RESISTOR_HELPER = 'Ohms; allow `k` or `M` (case-sensitive). Example: 12k';
const GAIN_HELPER = 'Signed for inverting; positive magnitude shown in dB';

function renderHelper(field: CalculatorField, error?: string): string {
  if (error) {
    return error;
  }
  if (field === 'gain') {
    return GAIN_HELPER;
  }
  return RESISTOR_HELPER;
}

export default function CalculatorForm({
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
}: CalculatorFormProps) {
  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: OpAmpMode | null) => {
    if (!newMode) return;
    onModeChange(newMode);
  };

  const renderTextField = (field: CalculatorField, label: string) => {
    const value = values[field];
    const error = Boolean(errors[field]);
    return (
      <TextField
        key={field}
        label={label}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        fullWidth
        error={error}
        helperText={renderHelper(field, errors[field])}
        InputProps={{
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton aria-label={`Clear ${label}`} onClick={() => onClear(field)} edge="end" size="small">
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
              Op-Amp Gain Calculator
            </Typography>
            <ToggleButtonGroup
              color="primary"
              exclusive
              value={mode}
              onChange={handleModeChange}
              aria-label="Op-amp mode"
              size="small"
            >
              <ToggleButton value="inverting">Inverting</ToggleButton>
              <ToggleButton value="non-inverting">Non-inverting</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack spacing={2}>{[
            renderTextField('rin', 'Rin'),
            renderTextField('rf', 'Rf'),
            renderTextField('gain', 'Gain (V/V)')
          ]}</Stack>

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
