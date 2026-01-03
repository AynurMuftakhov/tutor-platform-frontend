export type { PageResult } from './index';

// Homework domain types matching backend

export type HomeworkTaskType = 'VIDEO' | 'READING' | 'GRAMMAR' | 'VOCAB' | 'LINK' | 'LISTENING';
export type HomeworkTaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type SourceKind =
  | 'MATERIAL'
  | 'LESSON_CONTENT'
  | 'EXTERNAL_URL'
  | 'VOCAB_LIST'
  | 'GENERATED_AUDIO';

export interface TaskDto {
  id: string;
  ordinal: number;
  type: HomeworkTaskType;
  sourceKind: SourceKind;
  title: string;
  instructions?: string;
  contentRef: Record<string, unknown>;
  status: HomeworkTaskStatus;
  progressPct: number;
  startedAt?: string; // ISO date
  completedAt?: string; // ISO date
  meta: Record<string, unknown>;
}

export interface AssignmentDto {
  id: string;
  teacherId: string;
  studentId: string;
  title: string;
  instructions?: string;
  dueAt?: string; // ISO date
  createdAt: string; // ISO date
  assignedAt?: string; // ISO date
  tasks: TaskDto[];
}

// List item DTO for list endpoints (no tasks array)
export interface AssignmentListItemDto {
  id: string;
  title: string;
  createdAt: string; // ISO datetime
  assignedAt?: string; // ISO datetime
  dueAt?: string | null; // ISO datetime
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  progressPct: number; // 0..100
  completed: boolean;
  overdue: boolean;
  studentId?: string; // present on tutor list
  instructions?: string; // may be present when view=full
  tasks?: TaskDto[]; // present when view=full
}

// Create payloads (frontend helpers)
export interface CreateAssignmentDto {
  studentId: string;
  title: string;
  instructions?: string;
  dueAt?: string; // ISO date
  idempotencyKey?: string;
  tasks: Array<
    Pick<TaskDto, 'type' | 'sourceKind' | 'title' | 'instructions'> & {
      contentRef: Record<string, unknown>;
      ordinal?: number;
      meta?: Record<string, unknown>;
      // Backend supports direct vocab IDs on task creation
      vocabWordIds?: string[];
    }
  >;
}

export interface UpdateProgressPayload {
  // overall progress percentage 0..100
  progressPct: number;
  // optional richer stats for tasks like VOCAB
  stats?: {
    total: number;
    attemptedCount: number;
    correctCount: number;
    masteredCount: number;
  };
  // for vocab: current mastered set to support resume
  masteredWordIds?: string[];
  // telemetry hint for last action
  lastEvent?: { wordId: string; correct: boolean };
  // additional info
  meta?: Record<string, unknown>;
}

