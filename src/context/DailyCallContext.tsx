import { createContext, useContext } from 'react';
import type { DailyCall } from '@daily-co/daily-js';

export const DailyCallContext = createContext<DailyCall | null>(null);

export const useDailyCall = () => useContext(DailyCallContext);
