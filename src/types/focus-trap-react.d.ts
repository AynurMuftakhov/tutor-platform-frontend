declare module 'focus-trap-react' {
  import * as React from 'react';

  export interface FocusTrapProps extends React.HTMLAttributes<HTMLDivElement> {
    active?: boolean;
    paused?: boolean;
    focusTrapOptions?: Record<string, unknown>;
  }

  const FocusTrap: React.FC<FocusTrapProps>;

  export default FocusTrap;
}
