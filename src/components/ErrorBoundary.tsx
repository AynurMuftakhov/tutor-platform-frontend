import React from 'react';
import { Box, Button, Typography, alpha, useTheme } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundaryInner extends React.Component<
    ErrorBoundaryProps & { theme: Record<string, unknown> },
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps & { theme: Record<string, unknown> }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        px: 3,
                        textAlign: 'center',
                        bgcolor: 'background.default',
                    }}
                >
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: '#FFF3E0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                        }}
                    >
                        <ErrorOutlineIcon sx={{ fontSize: 40, color: '#F57C00' }} />
                    </Box>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        Something went wrong
                    </Typography>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ mb: 4, maxWidth: 440 }}
                    >
                        An unexpected error occurred. Please try reloading the page
                        or navigating back to the dashboard.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            onClick={this.handleReload}
                            sx={{ borderRadius: 2, px: 4 }}
                        >
                            Reload Page
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={this.handleGoHome}
                            sx={{ borderRadius: 2, px: 4 }}
                        >
                            Go to Dashboard
                        </Button>
                    </Box>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <Box
                            sx={{
                                mt: 4,
                                p: 2,
                                bgcolor: '#FFF8E1',
                                borderRadius: 2,
                                maxWidth: 600,
                                width: '100%',
                                textAlign: 'left',
                                overflow: 'auto',
                            }}
                        >
                            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                {this.state.error.message}
                                {'\n\n'}
                                {this.state.error.stack}
                            </Typography>
                        </Box>
                    )}
                </Box>
            );
        }

        return this.props.children;
    }
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback }) => {
    return (
        <ErrorBoundaryInner fallback={fallback} theme={{}}>
            {children}
        </ErrorBoundaryInner>
    );
};

export default ErrorBoundary;
