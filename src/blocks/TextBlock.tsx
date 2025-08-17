import React, { useEffect } from 'react';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BlockDefinition, BlockEditorProps, BlockStudentProps } from './registry';

export type TextContent = { html: string };

const Toolbar: React.FC<{ editor: any }> = ({ editor }) => {
  if (!editor) return null;
  return (
    <Stack direction="row" spacing={0.5} sx={{ p: 0.5 }}>
      <Tooltip title="Bold">
        <span>
          <IconButton size="small" onClick={() => editor.chain().focus().toggleBold().run()} color={editor.isActive('bold') ? 'primary' : 'default'}>
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Italic">
        <span>
          <IconButton size="small" onClick={() => editor.chain().focus().toggleItalic().run()} color={editor.isActive('italic') ? 'primary' : 'default'}>
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
};

const TextEditor: React.FC<BlockEditorProps<TextContent>> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content?.html || '<p>Start typing…</p>',
    onUpdate({ editor }) {
      onChange({ html: editor.getHTML() });
    },
    editorProps: {
      attributes: { 'aria-label': 'Text block editor' },
    },
  });

  // Sync external content into editor if it changes
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content?.html && content.html !== current) {
      editor.commands.setContent(content.html);
    }
  }, [content?.html, editor]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} onPointerDown={(e) => e.stopPropagation()}>
      <Toolbar editor={editor} />
      <Box sx={{ flex: 1, overflow: 'auto', px: 1, pb: 1 }}>
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

const TextStudent: React.FC<BlockStudentProps<TextContent>> = ({ content }) => {
  return (
    <Box sx={{ width: '100%' }}>
      {/* Render HTML safely; assuming trusted content from editor */}
      <div dangerouslySetInnerHTML={{ __html: content?.html || '' }} />
    </Box>
  );
};

export const TextBlockDef: BlockDefinition<TextContent> = {
  type: 'TEXT',
  icon: <TextFieldsIcon />,
  label: 'Text',
  description: 'Rich text with minimal formatting',
  defaultContent: { html: '<p>Start typing…</p>' },
  defaultSize: { w: 200, h: 120 },
  EditorComponent: TextEditor,
  StudentComponent: TextStudent,
  ajvSchema: {
    type: 'object',
    properties: { html: { type: 'string' } },
    required: ['html'],
    additionalProperties: false,
  },
};
