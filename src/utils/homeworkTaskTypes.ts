import { HomeworkTaskType } from '../types/homework';

const TASK_TYPE_ORDER: HomeworkTaskType[] = ['GRAMMAR', 'READING', 'VOCAB', 'LISTENING', 'VIDEO', 'LINK'];

const TASK_TYPE_LABELS: Record<HomeworkTaskType, string> = {
    VOCAB: 'Vocabulary',
    LISTENING: 'Listening',
    READING: 'Composite',
    GRAMMAR: 'Grammar',
    VIDEO: 'Video',
    LINK: 'Link',
};

const normalizeType = (type?: string): HomeworkTaskType | null => {
    if (!type) return null;
    switch (type) {
        case 'VOCAB':
        case 'LISTENING':
        case 'READING':
        case 'GRAMMAR':
        case 'VIDEO':
        case 'LINK':
            return type;
        default:
            return type as HomeworkTaskType;
    }
};

export const getOrderedTaskTypes = (tasks?: Array<{ type?: HomeworkTaskType | string }>): HomeworkTaskType[] => {
    if (!tasks || tasks.length === 0) return [];
    const seen = new Set<HomeworkTaskType>();
    const present = tasks
        .map((t) => normalizeType(t?.type))
        .filter((t): t is HomeworkTaskType => Boolean(t));

    const ordered: HomeworkTaskType[] = [];
    TASK_TYPE_ORDER.forEach((type) => {
        if (present.includes(type) && !seen.has(type)) {
            seen.add(type);
            ordered.push(type);
        }
    });
    present.forEach((type) => {
        if (!seen.has(type)) {
            seen.add(type);
            ordered.push(type);
        }
    });
    return ordered;
};

export const getTaskTypeLabels = (tasks?: Array<{ type?: HomeworkTaskType | string }>): string[] =>
    getOrderedTaskTypes(tasks).map((type) => TASK_TYPE_LABELS[type] || type);

export const formatTaskTypeList = (tasks?: Array<{ type?: HomeworkTaskType | string }>, separator = ' • '): string =>
    getTaskTypeLabels(tasks).join(separator);
