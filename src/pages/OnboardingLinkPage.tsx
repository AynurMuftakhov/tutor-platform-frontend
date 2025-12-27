import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { consumeOnboardingToken, validateOnboardingToken } from '../services/api';
import { keycloak } from '../services/keycloak';
import {
  Alert,
  Box,
  Button,
  Container,
  Fade,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';

interface TokenValidation {
  valid: boolean;
  username?: string;
  displayName?: string;
}

const OnboardingLinkPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const HOME_REDIRECT = `${window.location.origin}/dashboard`;
  const [status, setStatus] = useState<'checking' | 'invalid' | 'form' | 'success' | 'error'>('checking');
  const [validation, setValidation] = useState<TokenValidation | null>(null);
  const [username, setUsername] = useState('');

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  const mismatch = useMemo(() => confirm.length > 0 && password !== confirm, [password, confirm]);
  // Submission is allowed if username is provided; password rules are handled by backend
  const canSubmit = username.trim().length > 0 && password.length > 0 && confirm.length > 0 && !mismatch && !submitting;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setStatus('invalid');
        return;
      }

      try {
        const res = await validateOnboardingToken(token);
        if (cancelled) return;
        if (!res.valid) {
          setStatus('invalid');
        } else {
          setValidation(res);
          // Do not auto-fill synthetic usernames; keep empty if it looks machine-generated
          if (res.username && !/^[a-z0-9._-]{6,}$/.test(res.username)) {
            setUsername('');
          } else {
            setUsername(res.username || '');
          }
          setStatus('form');
        }
      } catch (e) {
        if (!cancelled) setStatus('invalid');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [token]);

  const handleConsume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirm || password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!token || !validation) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await consumeOnboardingToken(token, password, username.trim());
      setStatus('success');
      // Very short note before redirecting to Keycloak sign-in with hint
      setTimeout(() => {
        keycloak.login({ loginHint: username.trim(), redirectUri: HOME_REDIRECT });
      }, 800);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setErrorMsg('This username is already taken. Please choose another one.');
        setStatus('error');
      } else {
        // Avoid exposing raw token or internal messages
        const message: string = (err?.response?.data?.message || '').toString().toLowerCase();
        if (message.includes('invalid') || message.includes('used') || message.includes('revoked')) {
          setStatus('invalid');
        } else {
          setErrorMsg('Failed to set password. Please try again.');
          setStatus('error');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderInvalid = () => (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        This link is invalid or already used.
      </Typography>
      <Stack spacing={2} alignItems="center" mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => keycloak.login({ redirectUri: HOME_REDIRECT })}
        >
          Go to Sign-in
        </Button>
      </Stack>
    </Paper>
  );

  const renderForm = () => (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
      {validation?.displayName && (
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Welcome, {validation.displayName}
        </Typography>
      )}
      <Typography variant="h5" gutterBottom>
        Set your password to continue.
      </Typography>

      <Box component="form" noValidate onSubmit={handleConsume} mt={2}>
        <Stack spacing={2}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            required
            inputProps={{ 'aria-describedby': 'username-helper', 'aria-live': 'polite' }}
          />
          <Typography id="username-helper" variant="caption" color="text.secondary">
            This will be your login. You can change it later in your profile.
          </Typography>

          <TextField
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
          />

        <TextField
            label="Confirm password"
            type="password"
            fullWidth
            margin="dense"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch}
            helperText={mismatch ? "Passwords do not match" : " "}
            autoComplete="new-password"
            required
        />

          {errorMsg && (
            <Alert severity="error" role="alert" aria-live="assertive">{errorMsg}</Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            disabled={!canSubmit}
          >
            {submitting ? 'Saving…' : 'Continue'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );

  const renderSuccess = () => (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Password set. You’ll be redirected to sign-in…
      </Typography>
      {username && (
        <Typography variant="body2" color="text.secondary">
          Your login is {username}. You’ll be redirected to sign-in.
        </Typography>
      )}
    </Paper>
  );

  return (
    <Fade in timeout={400}>
      <Container maxWidth="sm" sx={{ display: 'flex', minHeight: '100%', alignItems: 'center' }}>
        <Box sx={{ width: '100%' }}>
          {status === 'checking' && (
            <Paper elevation={1} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="body1">Validating link…</Typography>
            </Paper>
          )}
          {status === 'invalid' && renderInvalid()}
          {status === 'form' && renderForm()}
          {status === 'success' && renderSuccess()}
          {status === 'error' && renderForm()}
        </Box>
      </Container>
    </Fade>
  );
}
;

export default OnboardingLinkPage;
