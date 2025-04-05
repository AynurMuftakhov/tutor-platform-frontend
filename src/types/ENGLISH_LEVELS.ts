export const ENGLISH_LEVELS = {
    Beginner: {
        code: "A1",
        description: "Understands and uses very basic everyday expressions and phrases.",
    },
    Elementary: {
        code: "A2",
        description: "Can communicate in simple tasks and describe routine matters.",
    },
    Intermediate: {
        code: "B1",
        description: "Can handle most situations, describe experiences, and express opinions.",
    },
    "Upper-Intermediate": {
        code: "B2",
        description: "Can understand complex texts and interact with fluency and spontaneity.",
    },
    Advanced: {
        code: "C1",
        description: "Can express ideas fluently and use language flexibly for academic/professional purposes.",
    },
    Proficient: {
        code: "C2",
        description: "Can understand virtually everything and summarize from different sources.",
    },
} as const;

export type EnglishLevel = keyof typeof ENGLISH_LEVELS;