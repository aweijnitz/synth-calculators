import { Box, Button, Container, Divider, Stack, Typography } from '@mui/material';

export default function HomePage() {
  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 8, sm: 12 } }}>
      <Stack spacing={{ xs: 6, sm: 8 }} alignItems="stretch">
        <Box textAlign={{ xs: 'left', sm: 'center' }}>
          <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
            Material Design 3
          </Typography>
          <Typography variant="h1" component="h1" gutterBottom>
            Synth Calculators
          </Typography>
          <Typography variant="body1" color="text.secondary">
            A responsive, mobile-first foundation for building synthesizer tools with
            Next.js and Material Design 3.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
          <Button variant="contained" size="large" sx={{ flex: 1 }}>
            Get Started
          </Button>
          <Button variant="outlined" size="large" sx={{ flex: 1 }}>
            Learn More
          </Button>
        </Stack>

        <Divider flexItem />

        <Box bgcolor="var(--mui-palette-surface-container-low)" borderRadius={3} p={{ xs: 3, sm: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Built for expansion
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customize this starter with new calculators, responsive layouts, and Material
            Design 3 components tailored to your workflow.
          </Typography>
        </Box>
      </Stack>
    </Container>
  );
}
