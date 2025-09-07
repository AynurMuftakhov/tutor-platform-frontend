import React from 'react';

// No-op ControlsTray: Daily uses Prebuilt UI; LiveKit uses its own UI components.
const ControlsTray: React.FC<{ onLeave: () => void }> = () => {
  return null;
};

export default ControlsTray;
