// Homework domain types matching backend

export type HomeworkTaskType = 'VIDEO' | 'READING' | 'GRAMMAR' | 'VOCAB' | 'LINK';
export type HomeworkTaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type SourceKind = 'MATERIAL' | 'LESSON_CONTENT' | 'EXTERNAL_URL' | 'VOCAB_LIST';

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
  tasks: TaskDto[];
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
    }
  >;
}

export interface UpdateProgressPayload {
  progressPct?: number;
  meta?: Record<string, unknown>;
}

export interface PageResult<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number; // page index
}
