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

/** 
 * Renumbers all gaps in the HTML content based on their position in the text.
 * This ensures gaps are numbered sequentially from 1 regardless of creation order.
 */
const renumberGapsInOrder = (html: string): string => {
  // Find all gaps with their original indices and positions
  const gaps: Array<{
    originalIndex: number;
    placeholder: string;
    fullMatch: string;
    position: number;
  }> = [];

  let match;
  while ((match = GAP_REGEX.exec(html)) !== null) {
    gaps.push({
      originalIndex: Number(match[1]),
      placeholder: match[2] || '',
      fullMatch: match[0],
      position: match.index,
    });
  }

  // Sort gaps by their position in the text
  gaps.sort((a, b) => a.position - b.position);

  // Create a mapping from original indices to new indices
  const indexMap: Record<number, number> = {};
  gaps.forEach((gap, i) => {
    indexMap[gap.originalIndex] = i + 1; // New indices start from 1
  });

  // Replace all gaps with their new indices
  let result = html;
  for (const gap of gaps) {
    const newIndex = indexMap[gap.originalIndex];
    const newGap = gap.placeholder 
      ? `{{${newIndex}:${gap.placeholder}}}`
      : `{{${newIndex}}}`;

    // Replace only the first occurrence (which should be at the specified position)
    const beforeMatch = result.substring(0, gap.position);
    const afterMatch = result.substring(gap.position + gap.fullMatch.length);
    result = beforeMatch + newGap + afterMatch;

    // Update positions for remaining gaps
    for (let i = gaps.indexOf(gap) + 1; i < gaps.length; i++) {
      if (gaps[i].position > gap.position) {
        gaps[i].position = gaps[i].position - gap.fullMatch.length + newGap.length;
      }
    }
  }

  return result;
};

/** parses {{n[:answer]}} … into { [n]: [answer1, answer2, ...] } */
const extractAnswers = (html: string) => {
  const map: Record<number, string[]> = {};

  // Find all gaps with their indices, answers, and positions
  const gaps: Array<{
    index: number;
    answerText: string;
    position: number;
  }> = [];

  let match;
  while ((match = GAP_REGEX.exec(html)) !== null) {
    gaps.push({
      index: Number(match[1]),
      answerText: match[2]?.trim() ?? 'answer',
      position: match.index,
    });
  }

  // Sort gaps by their position in the text
  gaps.sort((a, b) => a.position - b.position);

  // Process gaps in order of their position
  gaps.forEach((gap, i) => {
    // Split by pipe character to support multiple answers
    const answers = gap.answerText.split('|').map(a => a.trim());
    // Use the sequential index (i+1) as the key, not the original index
    map[i + 1] = answers;
  });

  return map;
};

/** Formats answers into a string with semicolons between gaps and pipes between answers */
const formatAnswersString = (answersMap: Record<number, string[]>) => {
  // Sort the gap indices to ensure consistent order (1, 2, 3, ...)
  const sortedIndices = Object.keys(answersMap).map(Number).sort((a, b) => a - b);

  // For each gap, join its answers with pipes, then join all gaps with semicolons
  return sortedIndices
    .map(idx => answersMap[idx].join('|'))
    .join(';');
};

// ------------------------- main component -----------------------------------

const GrammarEditor: React.FC<GrammarEditorProps> = ({
                                                       initialContent = 'Enter your text here. Use the toolbar to add gaps.',
                                                       onSave,
                                                     }) => {
  // Renumber any existing gaps in the initial content
  const processedInitialContent = renumberGapsInOrder(initialContent);
  const [html, setHtml] = useState(processedInitialContent);

  const editor = useEditor({
    extensions: [StarterKit, GapToken.configure({ mode: 'editor' })],
    content: gapTokensToNodes(processedInitialContent),
    onUpdate: ({ editor }) => {
      // Convert editor content to HTML with gap tokens
      const newHtml = gapNodesToTokens(editor.getHTML());

      // Renumber gaps based on their position in the text
      const renumberedHtml = renumberGapsInOrder(newHtml);

      // Update the state with the renumbered HTML
      setHtml(renumberedHtml);

      // If the HTML changed after renumbering, update the editor content
      if (renumberedHtml !== newHtml) {
        // We need to use setTimeout to avoid recursive updates
        setTimeout(() => {
          editor.commands.setContent(gapTokensToNodes(renumberedHtml));
        }, 0);
      }
    },
  });

  // -------- insert/remove gaps ----------
  const insertGap = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ', ' ');

    // Insert gap with a temporary index
    editor
      .chain()
      .focus()
      .setGapToken({
        index: nextGapNumberIn(html),
        placeholder: selectedText.trim() || undefined,
      })
      .run();

    // The onUpdate handler will take care of renumbering the gaps
    // and updating the editor content if necessary
  };

  useMemo(() => {
    const answersMap = extractAnswers(html);
    const answerString = formatAnswersString(answersMap);
    onSave(html, answerString);
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
