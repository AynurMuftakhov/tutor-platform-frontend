import React from 'react';
import { Box } from '@mui/material';
import { useRtc } from '../../context/RtcContext';
import DailyHost from './DailyHost';

/**
 * Pure RTC host registry with no side effects.
 * - Daily: renders the Daily React host full-bleed
 * - LiveKit: handled by VideoCallPage directly
 */
const RtcHost: React.FC<{ onLeft?: () => void | Promise<void> }> = ({ onLeft }) => {
  const { provider, effectiveProvider, providerReady, join } = useRtc();

  const currentProvider = effectiveProvider ?? provider;
  const canRenderDaily = providerReady && currentProvider === 'daily' && !!join?.url  && join?.token != undefined;

  if (!canRenderDaily) return null;

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <DailyHost url={join!.url} token={join!.token} onLeft={onLeft} />
    </Box>
  );
};

export default RtcHost;
