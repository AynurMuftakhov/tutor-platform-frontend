import { Extension } from '@tiptap/core';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';

// Cache for storing input elements to prevent recreation
const inputCache: Record<string, HTMLInputElement> = {};

export type GapTokenOptions = {
    mode: 'editor' | 'player';
    onGapChange?: (index: number, value: string) => void;
    // This will now receive the entire answers state for all items
    allAnswers?: Record<string, Record<number, string>>;
    disabled?: boolean;
    // The ID of the current grammar item
    itemId?: string;
    gapResults?: {
        index: number;
        isCorrect: boolean;
        correct: string;
    }[];
};

/**
 * TipTap extension that recognizes {{n}} placeholders and renders them as:
 * - Editor mode: an inline Chip with the index
 * - Player mode: a MUI TextField tied to state
 */
export const GapTokenExtension = Extension.create<GapTokenOptions>({
    name: 'gapToken',

    addOptions() {
        return {
            mode: 'editor' as 'editor' | 'player',
            onGapChange: () => {
                // no-op
            },
            // Initialize allAnswers and itemId
            allAnswers: {},
            disabled: false,
            gapResults: [],
            itemId: undefined,
        };
    },

    addProseMirrorPlugins() {
        // Destructure all options, including allAnswers and itemId
        const { mode, onGapChange, allAnswers, disabled, itemId, gapResults } = this.options;

        // Create a plugin key that we can use to access the plugin state
        const pluginKey = new PluginKey('gapToken');

        return [
            new Plugin({
                key: pluginKey,
                // Add state to track focused input
                state: {
                    init() {
                        return {
                            focusedGapIndex: null,
                            selectionStart: null,
                            selectionEnd: null,
                        };
                    },
                    apply(tr, prev) {
                        return prev; // State is updated via direct mutation in view.update
                    }
                },
                // Add view.update to capture focus before decorations are recreated
                view(view) {
                    return {
                        update: (view, prevState) => {
                            // Capture focus state before update
                            if (document.activeElement && document.activeElement.classList.contains('gap-token-input')) {
                                const input = document.activeElement as HTMLInputElement;
                                const gapIndex = parseInt(input.getAttribute('data-gap-index') || '-1', 10);

                                if (gapIndex !== -1) {
                                    const pluginState = pluginKey.getState(view.state);
                                    if (pluginState) {
                                        pluginState.focusedGapIndex = gapIndex;
                                        pluginState.selectionStart = input.selectionStart;
                                        pluginState.selectionEnd = input.selectionEnd;
                                    }
                                }
                            }
                        }
                    };
                },
                props: {
                    decorations(state, view?: EditorView) {
                        const { doc } = state;
                        const decorations: Decoration[] = [];

                        // Get plugin state to check for focused input
                        const pluginState = pluginKey.getState(state);

                        // Regular expression to find {{n}} and {{n:text}} patterns
                        const gapRegex = /\{\{(\d+)(?::([^}]+))?\}\}/g;

                        // Get the answers for the current item using the itemId
                        const itemAnswers = allAnswers?.[itemId!] || {}; // Use itemId to access the correct item's answers

                        doc.descendants((node: ProseMirrorNode, pos: number) => {
                            if (node.isText) {
                                const text = node.text || '';
                                let match: RegExpExecArray | null;

                                // Reset regex state
                                gapRegex.lastIndex = 0;

                                while ((match = gapRegex.exec(text)) !== null) {
                                    const start = pos + match.index;
                                    const end = start + match[0].length;
                                    const gapIndex = parseInt(match[1], 10);
                                    const answer = match[2] ?? '';

                                    // Find result for this gap if available
                                    const result = gapResults?.find(r => r.index === gapIndex);

                                    if (mode === 'editor') {
                                        // In editor mode, replace with a chip
                                        decorations.push(
                                            Decoration.widget(start, () => {
                                                const chip = document.createElement('span');
                                                chip.className = 'gap-token-chip';

                                                // already captured earlier
                                                chip.textContent = `{${answer ? answer : ''}}`;

                                                chip.style.display = 'inline-flex';
                                                chip.style.alignItems = 'center';
                                                chip.style.padding = '0 2px';
                                                chip.style.borderRadius = '4px';
                                                chip.style.backgroundColor = '#fffbe6';
                                                chip.style.border = '1px dashed #ffb74d';
                                                chip.style.color = '#1976d2';
                                                chip.style.fontFamily = 'monospace';
                                                chip.style.fontSize = '0.875rem';
                                                chip.style.margin = '0 2px';
                                                chip.style.cursor = 'default';

                                                // Set data attributes for CSS targeting
                                                chip.setAttribute('data-gap', gapIndex.toString());
                                                if (answer) {
                                                    chip.setAttribute('data-answer', answer);
                                                }
                                                return chip;
                                            }),
                                            Decoration.inline(start, end, {
                                                class: 'gap-token-hidden',
                                                style: 'display: none',
                                            })
                                        );
                                    } else if (mode === 'player') {
                                        // In player mode, replace with an input field
                                        decorations.push(
                                            Decoration.widget(start, () => {
                                                // Create a unique key for this input
                                                const inputKey = `${itemId}-${gapIndex}`;

                                                // Check if we already have an input element for this key
                                                let input = inputCache[inputKey];

                                                // If not, create a new one and store it in the cache
                                                if (!input) {
                                                    input = document.createElement('input');
                                                    input.type = 'text';
                                                    input.className = 'gap-token-input';
                                                    input.setAttribute('aria-label', `Gap ${gapIndex}`);
                                                    input.setAttribute('data-gap-index', gapIndex.toString());

                                                    // Style the input
                                                    input.style.display = 'inline-block';
                                                    input.style.minWidth = '80px';
                                                    input.style.maxWidth = '150px';
                                                    input.style.padding = '4px 8px';
                                                    input.style.margin = '0 2px';
                                                    input.style.border = '1px solid #ccc';
                                                    input.style.borderRadius = '4px';
                                                    input.style.fontSize = '0.875rem';

                                                    // Handle input changes
                                                    input.addEventListener('input', (e) => {
                                                        if (onGapChange) {
                                                            // Call the onGapChange callback with the gap index and new value
                                                            onGapChange(gapIndex, (e.target as HTMLInputElement).value);
                                                        }
                                                    });

                                                    // Store in cache
                                                    inputCache[inputKey] = input;
                                                }

                                                // Update properties that might change
                                                input.placeholder = `Gap ${gapIndex}`;
                                                input.value = itemAnswers?.[gapIndex] ?? '';
                                                input.disabled = !!disabled;

                                                // Apply result styling if available
                                                if (result) {
                                                    if (result.isCorrect) {
                                                        input.style.borderColor = '#4caf50';
                                                        input.style.borderBottomWidth = '2px';
                                                        input.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
                                                    } else {
                                                        input.style.borderColor = '#f44336';
                                                        input.style.borderBottomWidth = '2px';
                                                        input.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';

                                                        // Add tooltip with correct answer
                                                        input.title = `Correct answer: ${result.correct}`;
                                                    }
                                                } else {
                                                    // Reset styles if no result
                                                    input.style.borderColor = '#ccc';
                                                    input.style.borderBottomWidth = '1px';
                                                    input.style.backgroundColor = '';
                                                    input.title = '';
                                                }

                                                // If this was the focused input before update, restore focus and selection
                                                if (pluginState && pluginState.focusedGapIndex === gapIndex) {
                                                    // Use setTimeout to ensure this happens after the DOM is updated
                                                    setTimeout(() => {
                                                        input.focus();
                                                        if (pluginState.selectionStart !== null && pluginState.selectionEnd !== null) {
                                                            input.setSelectionRange(pluginState.selectionStart, pluginState.selectionEnd);
                                                        }
                                                    }, 0);
                                                }

                                                return input;
                                            }, {
                                                key: `${itemId}-${gapIndex}`
                                            }),
                                            Decoration.inline(start, end, {
                                                class: 'gap-token-hidden',
                                                style: 'display: none',
                                            })
                                        );
                                    }
                                }
                            }
                            return true;
                        });

                        return DecorationSet.create(doc, decorations);
                    },
                },
            }),
        ];
    },
});
