import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      radius: {
        md: number;
        lg: number;
        xl: number;
      };
    };
  }
  // allow configuration using `createTheme`
  interface ThemeOptions {
    custom?: {
      radius?: {
        md?: number;
        lg?: number;
        xl?: number;
      };
    };
  }
}
