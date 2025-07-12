import React, { useState, useMemo } from 'react';
import {
  Box,
   Paper,
  Typography,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import { Add as AddIcon, AutoFixHigh as AIIcon } from '@mui/icons-material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import GapToken from './GapToken';
import { gapTokensToNodes, gapNodesToTokens, GAP_REGEX } from '../../utils/grammarUtils';

interface GrammarEditorProps {
  initialContent?: string;
  onSave: (html: string, answersJson: string) => void;
}

// --------------------------- helpers ----------------------------------------

/** returns next free sequential gap number in given html */
const nextGapNumberIn = (html: string) => {
  const nums = [...html.matchAll(GAP_REGEX)].map(m => Number(m[1]));
  return nums.length ? Math.max(...nums) + 1 : 1;
};

/** parses {{n[:answer]}} … into { [n]: [answer] } */
const extractAnswers = (html: string) => {
  const map: Record<number, string[]> = {};
  for (const m of html.matchAll(GAP_REGEX)) {
    const idx = Number(m[1]);
    const ans = m[2]?.trim() ?? 'answer';
    map[idx] = [ans];
  }
  return map;
};

// ------------------------- main component -----------------------------------

const GrammarEditor: React.FC<GrammarEditorProps> = ({
                                                       initialContent = 'Enter your text here. Use the toolbar to add gaps.',
                                                       onSave,
                                                     }) => {
  const [html, setHtml] = useState(initialContent);

  const editor = useEditor({
    extensions: [StarterKit, GapToken.configure({ mode: 'editor' })],
    content: gapTokensToNodes(initialContent),
    onUpdate: ({ editor }) => {
      const newHtml = gapNodesToTokens(editor.getHTML());
      setHtml(newHtml);
    },
  });

  // -------- insert/remove gaps ----------
  const insertGap = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ', ' ');

    editor
      .chain()
      .focus()
      .setGapToken({
        index: nextGapNumberIn(html),
        placeholder: selectedText.trim() || undefined,
      })
      .run();
  };

  useMemo(() => {
    const answerJson = JSON.stringify(extractAnswers(html), null, 2);
    onSave(html, answerJson);
  }, [html])

  return (
      <Box sx={{ width: '100%' }}>
        {/* toolbar */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ mr: 2 }}>
              Grammar Exercise Editor
            </Typography>

            {/* insert gap */}
            <Tooltip title="Insert gap (⌘/Ctrl + G)">
              <IconButton color="primary" size="small" onClick={insertGap}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* placeholder for future AI */}
            <Tooltip title="AI Suggest (coming soon)">
            <span>
              <IconButton size="small" disabled>
                <AIIcon fontSize="small" />
              </IconButton>
            </span>
            </Tooltip>

            <Box sx={{ flexGrow: 1 }} />
          </Box>

          <Divider sx={{ mb: 2 }} />

          <EditorContent editor={editor} />
        </Paper>
      </Box>
  );
};

export default GrammarEditor