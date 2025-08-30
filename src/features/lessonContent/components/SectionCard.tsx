import React from 'react';
import { Box, Button, Card, CardContent, CardHeader, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import type { Section } from '../../../types/lessonContent';
import RowStrip from './RowStrip';
import { useEditorStore } from '../editorStore';

interface Props {
  section: Section;
  index: number;
  total: number;
  rowErrors: Record<string, string | undefined>;
}

const SectionCard: React.FC<Props> = ({ section, index, total, rowErrors }) => {
  const { actions } = useEditorStore();
  const addRow = () => actions.addRow(section.id);
  const deleteSection = () => actions.deleteSection(section.id);

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        title={<Typography variant="subtitle1" onClick={() => actions.setSelectedSection(section.id)} sx={{ cursor: 'pointer' }}>Section {index + 1}</Typography>}
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addRow}>+ Row</Button>
            <IconButton size="small" color="error" onClick={deleteSection} aria-label="Delete section"><DeleteOutline fontSize="inherit" /></IconButton>
          </Stack>
        }
      />
      <CardContent>
        {(section.rows || []).length === 0 ? (
          <Box sx={{ border: (t) => `1px dashed ${t.palette.divider}`, borderRadius: 1, p: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="caption">No rows yet. Click + Row to add one.</Typography>
          </Box>
        ) : (
          (section.rows || []).map((row, idx) => (
            <RowStrip key={row.id} sectionId={section.id} row={row} rowIndex={idx} rowsLength={section.rows.length} rowError={rowErrors[row.id]} />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default SectionCard;
