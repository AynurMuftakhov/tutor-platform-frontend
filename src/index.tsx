import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { createTheme, ThemeProvider, responsiveFontSizes, CssBaseline } from '@mui/material';

// 2025 Modern Design System
let theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#2573ff',
            light: '#5a94ff',
            dark: '#1a5cd1',
            contrastText: '#ffffff'
        },
        secondary: {
            main: '#00d7c2',
            light: '#4de4d4',
            dark: '#00b3a1',
            contrastText: '#ffffff'
        },
        success: {
            main: '#22c55e',
            light: '#4aca75',
            dark: '#16a34a'
        },
        error: {
            main: '#ef4444',
            light: '#f87171',
            dark: '#dc2626'
        },
        warning: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706'
        },
        info: {
            main: '#3b82f6',
            light: '#60a5fa',
            dark: '#2563eb'
        },
        grey: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827'
        },
        text: {
            primary: '#1f2937',
            secondary: '#4b5563',
            disabled: '#9ca3af'
        },
        background: {
            default: '#eef4ff',
            paper: '#ffffff'
        },
        gradients: {
            lightRadial: 'radial-gradient(circle, #eef4ff 0%, #ffffff 100%)',
        },
        divider: 'rgba(0, 0, 0, 0.08)'
    },
    typography: {
        fontFamily: ['Inter', 'Roboto', 'sans-serif'].join(','),
        h1: {
            fontWeight: 700,
            fontSize: 'clamp(2.5rem, 4vw + 1rem, 4rem)',
            lineHeight: 1.2,
            letterSpacing: '-0.01em'
        },
        h2: {
            fontWeight: 700,
            fontSize: '2rem',
            lineHeight: 1.2,
            letterSpacing: '-0.01em'
        },
        h3: {
            fontWeight: 600,
            fontSize: '1.75rem',
            lineHeight: 1.3,
            letterSpacing: '-0.01em'
        },
        h4: {
            fontWeight: 600,
            fontSize: '1.5rem',
            lineHeight: 1.3,
            letterSpacing: '-0.01em'
        },
        h5: {
            fontWeight: 600,
            fontSize: '1.25rem',
            lineHeight: 1.4
        },
        h6: {
            fontWeight: 600,
            fontSize: '1rem',
            lineHeight: 1.4
        },
        subtitle1: {
            fontWeight: 500,
            fontSize: '1rem',
            lineHeight: 1.5
        },
        subtitle2: {
            fontWeight: 500,
            fontSize: '0.875rem',
            lineHeight: 1.5
        },
        body1: {
            fontSize: {
                xs: '1rem',
                xl: '1.125rem'
            },
            lineHeight: 1.5
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem'
        },
        caption: {
            fontSize: '0.75rem',
            lineHeight: 1.5
        },
        overline: {
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
        }
    },
    shape: {
        borderRadius: 12
    },
    shadows: [
        'none',
        '0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)',
        '0px 2px 4px rgba(0, 0, 0, 0.06), 0px 4px 6px rgba(0, 0, 0, 0.1)',
        '0px 4px 8px rgba(0, 0, 0, 0.06), 0px 8px 16px rgba(0, 0, 0, 0.1)',
        '0px 6px 12px rgba(0, 0, 0, 0.06), 0px 12px 24px rgba(0, 0, 0, 0.1)',
        'none', 'none', 'none', 'none', 'none',
        'none', 'none', 'none', 'none', 'none',
        'none', 'none', 'none', 'none', 'none',
        'none', 'none', 'none', 'none', 'none'
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: '8px 16px',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: 'none',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)'
                    }
                },
                contained: {
                    '&:hover': {
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)'
                    }
                },
                outlined: {
                    borderWidth: '1.5px',
                    '&:hover': {
                        borderWidth: '1.5px'
                    }
                },
                text: {
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 15,
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    '&:hover': {
                        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)'
                    }
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 16
                },
                elevation1: {
                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.1)'
                },
                elevation2: {
                    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05), 0px 1px 3px rgba(0, 0, 0, 0.1)'
                },
                elevation3: {
                    boxShadow: '0px 3px 12px rgba(0, 0, 0, 0.05), 0px 2px 6px rgba(0, 0, 0, 0.1)'
                }
            }
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 12,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#9ca3af'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderWidth: 2
                        }
                    }
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                }
            }
        },
        MuiAvatar: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'
                }
            }
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        transform: 'translateX(4px)'
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(37, 115, 255, 0.08)',
                        '&:hover': {
                            backgroundColor: 'rgba(37, 115, 255, 0.12)'
                        }
                    }
                }
            }
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    '& .MuiTabs-indicator': {
                        height: 3,
                        borderRadius: 1.5
                    }
                }
            }
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                        fontWeight: 600
                    }
                }
            }
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)'
                }
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 16,
                    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)'
                }
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: '1px solid rgba(0, 0, 0, 0.08)'
                }
            }
        },
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: 'rgba(0, 0, 0, 0.08)'
                }
            }
        },
        MuiSlider: {
            styleOverrides: {
                root: {
                    height: 6,
                    borderRadius: 3,
                    '& .MuiSlider-thumb': {
                        width: 16,
                        height: 16,
                        transition: 'all 0.2s ease',
                        '&:hover, &.Mui-focusVisible': {
                            boxShadow: '0px 0px 0px 8px rgba(37, 115, 255, 0.1)'
                        }
                    },
                    '& .MuiSlider-rail': {
                        opacity: 0.3
                    }
                }
            }
        }
    }
});

// Add custom properties for motion preferences
theme = createTheme(theme, {
    components: {
        ...theme.components,
        MuiCssBaseline: {
            styleOverrides: {
                '@media (prefers-reduced-motion: reduce)': {
                    '*': {
                        animationDuration: '0.01ms !important',
                        animationIterationCount: '1 !important',
                        transitionDuration: '0.01ms !important',
                        scrollBehavior: 'auto !important',
                    },
                },
                // Preload critical fonts
                '@font-face': [
                    {
                        fontFamily: 'Playfair Display',
                        fontStyle: 'normal',
                        fontWeight: 700,
                        fontDisplay: 'swap',
                        src: `url(https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDXK1hY.woff2) format('woff2')`,
                        unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
                    },
                    {
                        fontFamily: 'Inter',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        fontDisplay: 'swap',
                        src: `url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZs.woff) format('woff')`,
                        unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
                    },
                    {
                        fontFamily: 'Inter',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        fontDisplay: 'swap',
                        src: `url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZs.woff) format('woff')`,
                        unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
                    },
                ],
                'html': {
                    scrollBehavior: 'smooth',
                },
                'body': {
                    minHeight: '100vh',
                    overflowX: 'hidden',
                }
            },
        },
    },
});

// Apply responsive typography
theme = responsiveFontSizes(theme);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
                <App />
            </AuthProvider>
        </ThemeProvider>
    </React.StrictMode>
);
