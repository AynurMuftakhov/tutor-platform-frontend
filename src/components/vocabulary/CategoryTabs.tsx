import React from 'react';
import { Tabs, Tab, Tooltip } from '@mui/material';

type Props = {
    value: string;
    onChange: (v: string) => void;
};

// Define a type for valid difficulty levels
type DifficultyLevel = 'ALL' | '1' | '2' | '3' | '4' | '5';

const difficultyLevels: DifficultyLevel[] = ['ALL', '1', '2', '3', '4', '5'];
const difficultyLabels: Record<DifficultyLevel, string> = {
    'ALL': 'All Levels',
    '1': 'Beginner (1)',
    '2': 'Elementary (2)',
    '3': 'Intermediate (3)',
    '4': 'Advanced (4)',
    '5': 'Expert (5)'
};

const CategoryTabs: React.FC<Props> = ({ value, onChange }) => (
    <Tabs
        value={value}
        onChange={(_, v) => onChange(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ 
            minHeight: 40,
            '& .MuiTabs-indicator': {
                backgroundColor: '#2573ff',
                height: 3,
                borderRadius: '3px 3px 0 0'
            }
        }}
    >
        {difficultyLevels.map(level => (
            <Tooltip key={level} title={level === 'ALL' ? 'Show all difficulty levels' : `Difficulty level ${level}`}>
                <Tab 
                    label={difficultyLabels[level]} 
                    value={level} 
                    sx={{ 
                        textTransform: 'capitalize',
                        fontWeight: (theme) => 
                            value === level ? 600 : (level === 'ALL' ? 400 : 500),
                        color: (theme) => 
                            value === level ? '#2573ff' : (level === 'ALL' ? 'inherit' : '#363740'),
                        borderRadius: '8px 8px 0 0',
                        transition: 'all 0.2s ease',
                        '&.Mui-selected': {
                            backgroundColor: 'rgba(37, 115, 255, 0.08)',
                        },
                        '&:hover': {
                            backgroundColor: 'rgba(37, 115, 255, 0.04)',
                            color: value !== level ? '#2573ff' : undefined
                        },
                        px: 2.5,
                        py: 1.5,
                        minHeight: 40
                    }} 
                />
            </Tooltip>
        ))}
    </Tabs>
);

export default CategoryTabs;
