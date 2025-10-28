import React from 'react';
import { Box } from '@mui/material';

interface SparklineProps {
    values: number[];
    width?: number;
    height?: number;
    color?: string;
    highlightIndex?: number;
    ariaLabel?: string;
}

const Sparkline: React.FC<SparklineProps> = ({
    values,
    width = 120,
    height = 32,
    color = '#2573ff',
    highlightIndex,
    ariaLabel = 'activity trend sparkline',
}) => {
    if (!values?.length) {
        return <Box component="span" aria-hidden="true" sx={{ display: 'inline-block', width, height }} />;
    }
    const max = Math.max(...values, 1);
    const step = width / Math.max(values.length - 1, 1);
    const points = values.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={ariaLabel} role="img">
            <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
            {typeof highlightIndex === 'number' && values[highlightIndex] !== undefined && (
                <circle
                    cx={highlightIndex * step}
                    cy={height - (values[highlightIndex] / max) * height}
                    r={3}
                    fill={color}
                />
            )}
        </svg>
    );
};

export default Sparkline;
