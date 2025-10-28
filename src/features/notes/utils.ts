import type { NotesServiceError } from '../../services/notesService';

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

export const getNoteSizeBytes = (value: string): number => {
    if (!textEncoder) {
        return value.length;
    }
    return textEncoder.encode(value).length;
};

export const formatByteSize = (bytes: number): string => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
};

export const resolveNotesErrorMessage = (error: NotesServiceError | null): string | null => {
    if (!error) {
        return null;
    }

    switch (error.status) {
        case 413:
            return 'Too large. Please shorten your notes.';
        case 403:
            return 'You don\'t have access to edit this lesson\'s notes.';
        case 404:
            return 'Lesson not found.';
        case 400:
        case 422:
            return 'Invalid request.';
        default:
            return error.message || 'Unable to save notes.';
    }
};
