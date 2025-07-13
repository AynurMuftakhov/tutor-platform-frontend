import type { Node as PMNode } from '@tiptap/pm/model';
import { Node as TiptapNode, type NodeViewRendererProps } from '@tiptap/core';

export interface GapTokenOptions {
  mode: 'editor' | 'player';
  onGapChange?: (index: number, value: string, itemId?: string) => void;
  disabled?: boolean;
  gapResults?: { index: number; isCorrect?: boolean; student?: string; correct: string }[];
}

export interface GapTokenAttrs {
  index: number;
  placeholder?: string;
  value?: string;
}

export const GapToken = TiptapNode.create<GapTokenOptions>({
  name: 'gapToken',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,

  addOptions() {
    return {
      mode: 'player' as const,
      onGapChange: () => { /* Default empty handler */ },
      disabled: false,
      gapResults: [],
    };
  },

  addAttributes() {
    return {
      index: { default: 0 },
      placeholder: { default: null },
      value: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'gap-token',
        getAttrs: (dom: HTMLElement) => ({
          index: parseInt(dom.getAttribute('data-index') || '0', 10),
          placeholder: dom.getAttribute('data-placeholder') || undefined,
          value: dom.getAttribute('data-value') || '',
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      'gap-token',
      {
        'data-index': node.attrs.index,
        'data-placeholder': node.attrs.placeholder,
        'data-value': node.attrs.value,
      },
    ];
  },

  addCommands() {
    return {
      setGapToken:
        (attrs: GapTokenAttrs) =>
        ({ commands }) => commands.insertContent({ type: this.name, attrs }),
    };
  },

  addNodeView() {
    const options = this.options;
    return ({ node, getPos, editor }: NodeViewRendererProps) => {
      const wrapper = document.createElement('span');
      const pmNode = node as PMNode;

      if (options.mode === 'editor') {
        const chip = document.createElement('span');
        chip.className = 'gap-token-chip';
        const label = pmNode.attrs.placeholder
          ? `${pmNode.attrs.placeholder}`
          : `${pmNode.attrs.index}`;
        chip.textContent = `{{${label}}}`;
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
        wrapper.appendChild(chip);
        return { dom: wrapper };
      }

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'gap-token-input';
      input.placeholder = '';
      input.value = pmNode.attrs.value || '';
      input.disabled = !!options.disabled;
      input.style.display = 'inline-block';
      input.style.minWidth = '80px';
      input.style.maxWidth = '150px';
      input.style.padding = '4px 8px';
      input.style.margin = '0 2px';
      input.style.border = '1px solid #ccc';
      input.style.borderRadius = '4px';
      input.style.fontSize = '0.875rem';

      const applyResult = () => {
        const res = options.gapResults?.find(r => r.index === pmNode.attrs.index - 1);
        if (!res) {
          input.style.borderColor = '#ccc';
          input.style.backgroundColor = '';
          input.title = '';
          return;
        }

        // Determine if the answer is correct
        // If isCorrect is provided, use it
        // Otherwise, compare student and correct values
        const isCorrect = res.isCorrect !== undefined
          ? res.isCorrect
          : (res.student === res.correct);

        if (isCorrect) {
          input.style.borderColor = '#4caf50';
          input.style.backgroundColor = 'rgba(76,175,80,0.1)';
          input.title = '';
        } else {
          input.style.borderColor = '#f44336';
          input.style.backgroundColor = 'rgba(244,67,54,0.1)';
          input.title = `Correct answer: ${res.correct}`;
        }
      };

      applyResult();

      input.addEventListener('input', e => {
        const val = (e.target as HTMLInputElement).value;
        editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(getPos(), undefined, { ...pmNode.attrs, value: val });
          return true;
        });

        // Find the closest parent element with a data-item-id attribute
        let itemId: string | undefined;
        let parent = input.parentElement;
        while (parent) {
          const dataItemId = parent.getAttribute('data-item-id');
          if (dataItemId) {
            itemId = dataItemId;
            break;
          }
          parent = parent.parentElement;
        }

        options.onGapChange?.(pmNode.attrs.index, val, itemId);
      });

      wrapper.appendChild(input);

      return {
        dom: wrapper,
        update(updatedNode: PMNode, _decorations?: unknown, _innerDecorations?: unknown): boolean {
          // Store the current focus state and cursor position
          const hasFocus = document.activeElement === input;
          const cursorStart = input.selectionStart;
          const cursorEnd = input.selectionEnd;

          input.value = updatedNode.attrs.value || '';
          input.disabled = !!options.disabled;
          applyResult();

          if (hasFocus) {
            // Use a more reliable approach to restore focus
            // We need to ensure this runs after React's updates
            requestAnimationFrame(() => {
              input.focus();
              try {
                input.setSelectionRange(cursorStart, cursorEnd);
              } catch (e) {
                console.error('Failed to set selection range:', e);
              }
            });
          }

          return true;
        },
      };
    };
  },
});

export default GapToken;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    gapToken: {
      /**
       * Set a gap token
       */
      setGapToken: (attrs: GapTokenAttrs) => ReturnType;
    }
  }
}
