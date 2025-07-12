import { Node, type NodeViewRendererProps } from '@tiptap/core';

export interface GapTokenOptions {
  mode: 'editor' | 'player';
  onGapChange?: (index: number, value: string) => void;
  disabled?: boolean;
  gapResults?: { index: number; isCorrect: boolean; correct: string }[];
}

export interface GapTokenAttrs {
  index: number;
  placeholder?: string;
  value?: string;
}

export const GapToken = Node.create<GapTokenOptions>({
  name: 'gapToken',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,

  addOptions() {
    return {
      mode: 'player' as const,
      onGapChange: () => {},
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

      if (options.mode === 'editor') {
        const chip = document.createElement('span');
        chip.className = 'gap-token-chip';
        const label = node.attrs.placeholder
          ? `${node.attrs.index}:${node.attrs.placeholder}`
          : `${node.attrs.index}`;
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
      input.placeholder = node.attrs.placeholder || `Gap ${node.attrs.index}`;
      input.value = node.attrs.value || '';
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
        const res = options.gapResults?.find(r => r.index === node.attrs.index);
        if (!res) {
          input.style.borderColor = '#ccc';
          input.style.backgroundColor = '';
          input.title = '';
          return;
        }
        if (res.isCorrect) {
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
          tr.setNodeMarkup(getPos(), undefined, { ...node.attrs, value: val });
          return true;
        });
        options.onGapChange?.(node.attrs.index, val);
      });

      wrapper.appendChild(input);

      return {
        dom: wrapper,
        update(updated) {
          input.value = updated.attrs.value || '';
          input.disabled = !!options.disabled;
          applyResult();
          return true;
        },
      };
    };
  },
});

export default GapToken;
