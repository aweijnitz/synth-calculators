import { Box, Button, Container, Divider, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 8, sm: 12 } }}>
      <Stack spacing={{ xs: 6, sm: 8 }} alignItems="stretch">
        <Box textAlign={{ xs: 'left', sm: 'center' }}>
          <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
            DIY Synth Tools
          </Typography>
          <Typography variant="h1" component="h1" gutterBottom>
            Synth Calculators
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quick access to synthesizer tools and resources.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
          <Button
            component={Link}
            href="/calculators/opamp-gain"
            variant="contained"
            size="large"
            sx={{ flex: 1 }}
          >
            Op-Amp Gain Calculator
          </Button>
          <Button
            component={Link}
            href="/calculators/rc-filter"
            variant="outlined"
            size="large"
            sx={{ flex: 1 }}
          >
            RC Filter Calculator
          </Button>
          <Button
            component={Link}
            href="/calculators/voltage-divider"
            variant="outlined"
            size="large"
            sx={{ flex: 1 }}
          >
            Voltage Divider Calculator
          </Button>
        </Stack>
        <Divider flexItem />
      </Stack>
    </Container>
  );
}
