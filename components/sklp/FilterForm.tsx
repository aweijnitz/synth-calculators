'use client';

import ClearIcon from '@mui/icons-material/Clear';
import {
  Alert,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import * as React from 'react';

export type SallenKeyInputs = {
  fc: string;
  q: string;
  cBase: string;
  ratio: string;
};

export type RatioOption = {
  value: string;
  label: string;
};

export type FilterFormProps = {
  values: SallenKeyInputs;
  onChange: (field: keyof SallenKeyInputs, value: string) => void;
  onClear: (field: 'fc' | 'q' | 'cBase') => void;
  errors: Partial<Record<'fc' | 'q' | 'cBase', string>>;
  ratioOptions: RatioOption[];
  helperMessage?: string;
  warningMessage?: string | null;
  infoMessages?: string[];
  errorMessage?: string | null;
};

const FIELD_LABELS: Record<'fc' | 'q' | 'cBase', string> = {
  fc: 'Cutoff Frequency (f_c)',
  q: 'Quality Factor (Q)',
  cBase: 'Capacitor Seed (C_base)',
};

const FIELD_HELPERS: Record<'fc' | 'q' | 'cBase', string> = {
  fc: 'Hertz; allow `k`, `M` (case-sensitive).',
  q: 'Unitless. Typical unity-gain values 0.3 – 5.',
  cBase: 'Farads; allow `p`, `n`, `u`, `m` (case-sensitive). Optional.',
};

function helperText(field: 'fc' | 'q' | 'cBase', error?: string): string {
  if (error) {
    return error;
  }
  return FIELD_HELPERS[field];
}

export default function FilterForm({
  values,
  onChange,
  onClear,
  errors,
  ratioOptions,
  helperMessage,
  warningMessage,
  infoMessages = [],
  errorMessage,
}: FilterFormProps) {
  const handleRatioChange = (event: SelectChangeEvent<string>) => {
    onChange('ratio', event.target.value);
  };

  const renderField = (field: 'fc' | 'q' | 'cBase') => {
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
              Sallen-Key Low-pass (Unity Gain)
            </Typography>
          </Stack>

          <Stack spacing={2}>
            {(['fc', 'q', 'cBase'] as const).map(renderField)}
            <FormControl fullWidth>
              <InputLabel id="sallen-key-ratio-label">C1:C2 Ratio</InputLabel>
              <Select
                labelId="sallen-key-ratio-label"
                label="C1:C2 Ratio"
                value={values.ratio}
                onChange={handleRatioChange}
              >
                <MenuItem value="auto">Auto (search E6)</MenuItem>
                {ratioOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack spacing={1}>
            {helperMessage && (
              <Typography variant="body2" color="text.secondary">
                {helperMessage}
              </Typography>
            )}
            {errorMessage && (
              <Alert severity="error" variant="outlined">
                {errorMessage}
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
