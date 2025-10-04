import { EnglishLevel } from '../../types/ENGLISH_LEVELS';

export interface Student {
  id: string;
  avatar?: string;
  name: string;
  email?: string;
  level: EnglishLevel;
  homeworkDone: boolean;
  nextLesson?: string;
}
