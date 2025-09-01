import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Paper, Stack, Tooltip } from '@mui/material';
import { EditorContent, BubbleMenu, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import { sanitizeHtml } from '../student/StudentRenderer';
import { useEditorStore } from '../editorStore';

interface Props {
    id: string; // block id
    html: string;
}

function useDebouncedCallback<T extends any[]>(fn: (...args: T) => void, delay: number) {
    const timeout = useRef<number | undefined>(undefined);
    return (...args: T) => {
        if (timeout.current) window.clearTimeout(timeout.current);
        timeout.current = window.setTimeout(() => fn(...args), delay);
    };
}

const TAG = 'TextInlineEditor';

const TextInlineEditor: React.FC<Props> = ({ id, html }) => {
    const { state, actions } = useEditorStore();
    const [active, setActive] = useState(false);

    const dberr = (...args: any[]) => {
        // eslint-disable-next-line no-console
        console.error(`[${TAG} ${id}]`, ...args);
    };

    // Stable portal container for BubbleMenu
    const bubblePortalRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = document.createElement('div');
        el.setAttribute('data-tiptap-bubble-portal', `true-${id}`);
        document.body.appendChild(el);
        bubblePortalRef.current = el;
        return () => {
            try {
                if (el.parentNode) el.parentNode.removeChild(el);
            } catch (e) {
                dberr('bubble portal remove failed', e);
            }
            bubblePortalRef.current = null;
        };
    }, [id]);

    // Deactivate when another block is selected
    useEffect(() => {
        if (state.selectedBlockId && state.selectedBlockId !== id) {
            setActive(false);
        }
    }, [state.selectedBlockId, id]);

    const editor = useEditor(
        {
            extensions: [StarterKit],
            content: html || '<p></p>',
            editorProps: {
                attributes: {
                    'aria-label': 'Text editor',
                    style: 'outline: none;',
                },
                handleDOMEvents: {
                    keydown: (_view, event) => {
                        const e = event as KeyboardEvent;
                        if (e.key === ' ') e.stopPropagation();
                        return false;
                    },
                },
            },
            onUpdate({ editor }) {
                if (!active) return;
                debouncedSave(editor.getHTML());
            }
        },
        [id]
    );

    // Toggle editability instead of unmounting
    useEffect(() => {
        if (!editor) return;
        editor.setEditable(active);
        if (!active) editor.commands.blur();
    }, [editor, active]);

    const debouncedSave = useDebouncedCallback((rawHtml: string) => {
        const safe = sanitizeHtml(rawHtml);
        actions.upsertBlock(id, { html: safe } as any);
    }, 400);

    const commands = useMemo(
        () => ({
            toggleBold: () => editor?.chain().focus().toggleBold().run(),
            toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
            toggleUnderline: () =>
                (editor && (editor.commands as any).toggleUnderline)
                    ? (editor.chain().focus() as any).toggleUnderline().run()
                    : undefined,
            toggleBulletList: () => editor?.chain().focus().toggleBulletList().run(),
            toggleOrderedList: () => editor?.chain().focus().toggleOrderedList().run(),
            setLink: () => {
                if (!editor) return;
                const has = Boolean((editor.commands as any).setLink);
                if (!has) return;
                const url = window.prompt('Enter URL');
                if (!url) return;
                (editor.chain().focus() as any).setLink({ href: url }).run();
            },
        }),
        [editor]
    );

    // Activate on click (overlay captures clicks when inactive)
    const activate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const showOverlays = state.overlaysVisible !== false;
        actions.setSelectedBlock(id);
        if (showOverlays) {
            setActive(true);
            setTimeout(() => editor?.commands.focus('end'), 0);
        }
    };

    return (
        <Box position="relative" onClick={(e) => e.stopPropagation()}>
            {editor && bubblePortalRef.current && (
                <BubbleMenu
                    editor={editor}
                    shouldShow={({ editor }) => {
                        const ok = editor.isEditable && editor.isFocused && !(editor as any).isDestroyed;
                        return ok;
                    }}
                    tippyOptions={{
                        duration: 120,
                        appendTo: () => bubblePortalRef.current as HTMLElement,
                        moveTransition: '',

                    }}
                >
                    <Paper elevation={3} sx={{ p: 0.5, borderRadius: 1 }}>
                        <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Bold">
                <span>
                  <IconButton
                      size="small"
                      onClick={commands.toggleBold}
                      color={editor.isActive('bold') ? 'primary' : 'default'}
                  >
                    <FormatBoldIcon fontSize="small" />
                  </IconButton>
                </span>
                            </Tooltip>
                            <Tooltip title="Italic">
                <span>
                  <IconButton
                      size="small"
                      onClick={commands.toggleItalic}
                      color={editor.isActive('italic') ? 'primary' : 'default'}
                  >
                    <FormatItalicIcon fontSize="small" />
                  </IconButton>
                </span>
                            </Tooltip>
                            <Tooltip title="Underline">
                <span>
                  <IconButton
                      size="small"
                      onClick={commands.toggleUnderline}
                      disabled={!((editor.commands as any).toggleUnderline)}
                      color={editor.isActive('underline') ? 'primary' : 'default'}
                  >
                    <FormatUnderlinedIcon fontSize="small" />
                  </IconButton>
                </span>
                            </Tooltip>
                            <Tooltip title="Bullet list">
                <span>
                  <IconButton
                      size="small"
                      onClick={commands.toggleBulletList}
                      color={editor.isActive('bulletList') ? 'primary' : 'default'}
                  >
                    <FormatListBulletedIcon fontSize="small" />
                  </IconButton>
                </span>
                            </Tooltip>
                            <Tooltip title="Numbered list">
                <span>
                  <IconButton
                      size="small"
                      onClick={commands.toggleOrderedList}
                      color={editor.isActive('orderedList') ? 'primary' : 'default'}
                  >
                    <FormatListNumberedIcon fontSize="small" />
                  </IconButton>
                </span>
                            </Tooltip>
                            <Tooltip title="Link">
                <span>
                  <IconButton
                      size="small"
                      onClick={commands.setLink}
                      disabled={!((editor.commands as any).setLink)}
                  >
                    <LinkIcon fontSize="small" />
                  </IconButton>
                </span>
                            </Tooltip>
                        </Stack>
                    </Paper>
                </BubbleMenu>
            )}

            <EditorContent
                editor={editor!}
                onKeyDownCapture={(e) => {
                    if (e.key === ' ') e.stopPropagation();
                }}
                onBlur={() => {
                    requestAnimationFrame(() => setActive(false));
                }}
                className="text-inline-editor-content"
            />

            {!active && (
                <Box
                    onClick={activate}
                    onMouseDown={(e) => e.stopPropagation()}
                    sx={{ position: 'absolute', inset: 0, cursor: 'text', background: 'transparent' }}
                />
            )}

            <style>{`
        .text-inline-editor-content p { margin: 0; margin-bottom: 10px; }
        .text-inline-editor-content ul, .text-inline-editor-content ol { padding-left: 24px; }
      `}</style>
        </Box>
    );
};

export default TextInlineEditor;