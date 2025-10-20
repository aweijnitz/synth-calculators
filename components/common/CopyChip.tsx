'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Chip } from '@mui/material';
import * as React from 'react';

export type CopyChipProps = {
  label: string;
  valueToCopy: string;
  onCopied?: (value: string) => void;
  disabled?: boolean;
};

export default function CopyChip({ label, valueToCopy, onCopied, disabled }: CopyChipProps) {
  const handleClick = React.useCallback(async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        return;
      }
      await navigator.clipboard.writeText(valueToCopy);
      onCopied?.(valueToCopy);
    } catch (error) {
      console.error('Failed to copy to clipboard', error);
    }
  }, [onCopied, valueToCopy]);

  return (
    <Chip
      icon={<ContentCopyIcon fontSize="small" />}
      label={label}
      variant="outlined"
      color="primary"
      onClick={handleClick}
      disabled={disabled}
      sx={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
  );
}
