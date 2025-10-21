'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AppBar, Button, Stack, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';
import * as React from 'react';

export type CalculatorHeaderProps = {
  title: string;
  overline?: string;
};

export default function CalculatorHeader({ title, overline }: CalculatorHeaderProps) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        top: 0,
        bgcolor: 'background.paper',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        zIndex: (theme) => theme.zIndex.appBar + 1,
      }}
    >
      <Toolbar
        variant="dense"
        disableGutters
        sx={{
          minHeight: 48,
          px: { xs: 2, sm: 3, md: 4 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Button
          component={Link}
          href="/"
          variant="text"
          size="small"
          startIcon={<ArrowBackIcon fontSize="small" />}
          color="primary"
          aria-label="Back to start page"
          sx={{ fontWeight: 600 }}
        >
          Start page
        </Button>
        <Stack spacing={0.25}>
          {overline && (
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
              {overline}
            </Typography>
          )}
          <Typography variant="subtitle1" component="span" color="text.primary">
            {title}
          </Typography>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
