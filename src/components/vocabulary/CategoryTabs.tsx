import React from 'react';
import { Tabs, Tab } from '@mui/material';

type Props = {
    value: string;
    onChange: (v: string) => void;
};

const categories = ['ALL', 'noun', 'verb', 'adjective', 'adverb', 'phrasal‑verb', 'other'];

const CategoryTabs: React.FC<Props> = ({ value, onChange }) => (
    <Tabs
        value={value}
        onChange={(_, v) => onChange(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 40 }}
    >
        {categories.map(c => (
            <Tab key={c} label={c === 'ALL' ? 'All' : c} value={c} sx={{ textTransform: 'capitalize' }} />
        ))}
    </Tabs>
);

export default CategoryTabs;