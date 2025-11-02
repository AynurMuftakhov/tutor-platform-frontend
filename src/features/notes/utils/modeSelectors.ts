export type NotesUIMode = 'docked-bottom' | 'docked-side' | 'floating';
export type NotesDataMode = 'realtime' | 'offline';

export const getNotesUIMode = (params: { isPhone: boolean; isTablet: boolean }): NotesUIMode => {
    if (params.isPhone) {
        return 'docked-bottom';
    }
    if (params.isTablet) {
        return 'docked-side';
    }
    return 'floating';
};
