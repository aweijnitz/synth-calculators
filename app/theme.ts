import { experimental_extendTheme as extendTheme } from '@mui/material/styles';

const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#6750A4'
        },
        secondary: {
          main: '#625B71'
        },
        background: {
          default: '#FEF7FF',
          paper: '#FFFBFE'
        },
        surfaceTint: '#6750A4'
      }
    },
    dark: {
      palette: {
        primary: {
          main: '#D0BCFF'
        },
        secondary: {
          main: '#CCC2DC'
        },
        background: {
          default: '#1C1B1F',
          paper: '#1C1B1F'
        },
        surfaceTint: '#D0BCFF'
      }
    }
  },
  typography: {
    fontFamily: 'var(--font-roboto-flex)',
    h1: {
      fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
      fontWeight: 600,
      lineHeight: 1.1
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6
    }
  },
  shape: {
    borderRadius: 16
  }
});

export default theme;
