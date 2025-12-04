import { createTheme } from '@mui/material/styles';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
  typography: {
    fontFamily: inter.style.fontFamily,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff0055', // Vibrant Pink/Red
      light: '#ff4081',
      dark: '#c50042',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00e5ff', // Cyan/Electric Blue
      light: '#6effff',
      dark: '#00b2cc',
      contrastText: '#000000',
    },
    background: {
      default: '#000000',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    error: {
      main: '#ff1744',
    },
    success: {
      main: '#00e676',
    },
    warning: {
      main: '#ffea00',
    },
    info: {
      main: '#2979ff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #ff0055 30%, #ff4081 90%)',
          boxShadow: '0 3px 5px 2px rgba(255, 0, 85, .3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #c50042 30%, #ff0055 90%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(45deg, #00e5ff 30%, #6effff 90%)',
          boxShadow: '0 3px 5px 2px rgba(0, 229, 255, .3)',
        }
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default gradient overlay in dark mode
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
          backgroundImage: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        autoComplete: 'off',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ff0055',
            },
            // Fix browser autofill background color
            '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
              WebkitBoxShadow: '0 0 0 100px rgba(20,20,20,1) inset !important',
              WebkitTextFillColor: '#ffffff !important',
              caretColor: '#ffffff',
              borderRadius: 'inherit',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#b0b0b0',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#ff0055',
          },
        }
      }
    },
    MuiOutlinedInput: {
      defaultProps: {
        autoComplete: 'off',
      },
    },
    MuiInputBase: {
      defaultProps: {
        autoComplete: 'off',
      },
    }
  },
});

export default theme;
