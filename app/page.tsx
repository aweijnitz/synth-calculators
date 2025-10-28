import { Box, Button, Container, Divider, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 8, sm: 12 } }}>
      <Stack spacing={{ xs: 6, sm: 8 }} alignItems="stretch">
        <Box textAlign={{ xs: 'left', sm: 'center' }}>
          <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
            Synth Tools
          </Typography>
          <Typography variant="h1" component="h1" gutterBottom>
            Synth Calculators
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Common calculators for DIY synth.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'column' }} spacing={2} alignItems="stretch">
          <Button
            component={Link}
            href="/calculators/parallel-resistors"
            variant="outlined"
            size="medium"
            sx={{ flex: 1 }}
          >
            Parallel Resistors Calculator
          </Button>
          <Button
            component={Link}
            href="/calculators/voltage-divider"
            variant="outlined"
            size="medium"
            sx={{ flex: 1 }}
          >
            Voltage Divider Calculator
          </Button>
          <Button
            component={Link}
            href="/calculators/opamp-gain"
            variant="outlined"
            size="medium"
            sx={{ flex: 1 }}
          >
            Op-Amp Gain Calculator
          </Button>
          <Button
            component={Link}
            href="/calculators/rc-filter"
            variant="outlined"
            size="medium"
            sx={{ flex: 1 }}
          >
            RC Filter Calculator
          </Button>
          <Button
            component={Link}
            href="/calculators/sallen-key-lowpass"
            variant="outlined"
            size="medium"
            sx={{ flex: 1 }}
          >
            Sallen-Key Low-pass
          </Button>
          <Button
            component={Link}
            href="/calculators/sallen-key-lp-equal-r-pot"
            variant="outlined"
            size="medium"
            sx={{ flex: 1 }}
          >
            Sallen-Key LP (Dual Gang Pot)
          </Button>
          <Button
            component={Link}
            href="/calculators/pot-bias"
            variant="outlined"
            size="medium"
            sx={{ flex: 1 }}
          >
            Pot Bias Calculator
          </Button>
                    <Button
            component={Link}
            href="/calculators/capacitor-converter"
            variant="outlined"
            size="medium"
            sx={{ flex: 1 }}
          >
            Capacitor Suffix Converter
          </Button>
        </Stack>
        <Divider flexItem />
      </Stack>
    </Container>
  );
}
