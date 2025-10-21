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

export type PotBiasField = 'vsHi' | 'vsLo' | 'vTop' | 'vBot' | 'rPot';

export type PotBiasInputs = Record<PotBiasField, string>;

export type InputsFormProps = {
  values: PotBiasInputs;
  onChange: (field: PotBiasField, value: string) => void;
  errors: Partial<Record<PotBiasField, string>>;
  infoMessages?: string[];
  warningMessages?: string[];
  calculationError?: string | null;
};

const FIELD_LABELS: Record<PotBiasField, string> = {
  vsHi: 'V_SUP_HI (V)',
  vsLo: 'V_SUP_LO (V)',
  vTop: 'V_TOP_TARGET (V)',
  vBot: 'V_BOT_TARGET (V)',
  rPot: 'R_POT (Ω)'
};

const FIELD_HELPERS: Record<PotBiasField, string> = {
  vsHi: 'Supply high rail voltage.',
  vsLo: 'Supply low rail voltage.',
  vTop: 'Desired wiper voltage at the top end.',
  vBot: 'Desired wiper voltage at the bottom end.',
  rPot: 'Total potentiometer resistance; allow `k`, `M` suffixes.'
};

function helperText(field: PotBiasField, error?: string): string {
  if (error) {
    return error;
  }
  return FIELD_HELPERS[field];
}

export default function InputsForm({
  values,
  onChange,
  errors,
  infoMessages = [],
  warningMessages = [],
  calculationError
}: InputsFormProps) {
  const renderField = (field: PotBiasField) => {
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
              Potentiometer Biasing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter rail voltages, target wiper endpoints, and potentiometer value.
            </Typography>
          </Stack>

          <Stack spacing={2}>{(['vsHi', 'vsLo', 'vTop', 'vBot', 'rPot'] as PotBiasField[]).map(renderField)}</Stack>

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
