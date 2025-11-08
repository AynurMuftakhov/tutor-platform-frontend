import type { LessonNoteFormat } from '../../../types/lessonNotes';

const stripLineTrailingWhitespace = (line: string) => line.replace(/[ \t]+$/g, '');

const collapseEdgeBlankLines = (lines: string[]) => {
    if (lines.length === 0) return lines;
    let start = 0;
    let end = lines.length;
    while (start < end - 1 && lines[start].trim() === '') {
        start += 1;
    }
    while (end > start + 1 && lines[end - 1].trim() === '') {
        end -= 1;
    }
    if (start === 0 && end === lines.length) {
        return lines;
    }
    return lines.slice(start, end);
};

export const normalizeFormat = (format?: LessonNoteFormat | null): LessonNoteFormat => {
    return format === 'plain' ? 'plain' : 'md';
};

export const normalizeLineEndings = (value: string): string => {
    if (!value) return '';
    return value.replace(/\r\n?/g, '\n');
};

const stripZeroWidth = (value: string): string => value.replace(/\u200B+/g, '');

export const canonicalizeContent = (input: string, format: LessonNoteFormat = 'md'): string => {
    const normalizedFormat = normalizeFormat(format);
    let text = normalizeLineEndings(stripZeroWidth(input ?? ''));
    if (!text) {
        return '';
    }

    const trailingMatch = text.match(/\n+$/);
    const trailingNewlines = trailingMatch ? trailingMatch[0].length : 0;
    const lines = text.split('\n').map(stripLineTrailingWhitespace);

    const collapsed = collapseEdgeBlankLines(lines);
    let result = collapsed.join('\n');

    if (!result) {
        return trailingNewlines > 0 ? '\n'.repeat(Math.min(trailingNewlines, 1)) : '';
    }

    if (trailingNewlines > 0) {
        const preserved = normalizedFormat === 'plain'
            ? Math.min(trailingNewlines, 1)
            : Math.min(trailingNewlines, 1);
        if (preserved > 0) {
            result += '\n'.repeat(preserved);
        }
    }

    return result;
};

const removeWhitespace = (value: string) => value.replace(/\s+/g, '');
const newlineSignature = (value: string) => value.replace(/[^\n]/g, '');

export interface ContentDiffMeta {
    equal: boolean;
    whitespaceOnly: boolean;
    newlineChanged: boolean;
    strictAppend: boolean;
    strictlyShorter: boolean;
    lengthDelta: number;
}

export const computeDiffMeta = (previous: string, next: string): ContentDiffMeta => {
    if (previous === next) {
        return {
            equal: true,
            whitespaceOnly: true,
            newlineChanged: false,
            strictAppend: false,
            strictlyShorter: false,
            lengthDelta: 0
        };
    }

    const prevNoWhitespace = removeWhitespace(previous);
    const nextNoWhitespace = removeWhitespace(next);
    const whitespaceOnly = prevNoWhitespace === nextNoWhitespace;

    const prevNewlines = newlineSignature(previous);
    const nextNewlines = newlineSignature(next);

    const strictAppend = next.startsWith(previous) && next.length > previous.length;

    return {
        equal: false,
        whitespaceOnly,
        newlineChanged: prevNewlines !== nextNewlines,
        strictAppend,
        strictlyShorter: next.length < previous.length,
        lengthDelta: next.length - previous.length
    };
};

export const fingerprintContent = (content: string, format: LessonNoteFormat): string => {
    const canonical = canonicalizeContent(content, format);
    const head = canonical.slice(0, 24);
    const tail = canonical.slice(-24);
    return `${normalizeFormat(format)}:${canonical.length}:${head}:${tail}`;
};
