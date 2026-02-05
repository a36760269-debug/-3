import Dexie, { Table } from 'dexie';
import { 
  ClassEntity, 
  Student, 
  Result, 
  AttendanceRecord, 
  LessonPlan,
  ClassProgress,
  CurriculumTopic,
  StudentProgress
} from '../types';

/**
 * Interface for key-value settings storage (Profile, PIN, etc.)
 */
export interface SettingEntry {
  key: string;
  value: any;
}

/**
 * Interface for saving free-text notes about students.
 */
export interface StudentNote {
  studentId: string;
  content: string;
  updatedAt: number;
}

/**
 * @class SmartTeacherDB
 * @extends Dexie
 * @description The main client-side database definition using Dexie.js (IndexedDB wrapper).
 * Handles data persistence for offline capability.
 */
export class SmartTeacherDB extends Dexie {
  // Table Definitions
  classes!: Table<ClassEntity>;
  students!: Table<Student>;
  results!: Table<Result>;
  attendance!: Table<AttendanceRecord>;
  lessons!: Table<LessonPlan>;
  settings!: Table<SettingEntry>;
  progress!: Table<ClassProgress>;
  studentProgress!: Table<StudentProgress>;
  curriculum!: Table<CurriculumTopic>;
  studentNotes!: Table<StudentNote>;

  constructor() {
    super('SmartTeacherDB');
    
    /**
     * Database Schema Version 6.
     * 
     * Indexing Strategy:
     * - `id`: Primary Key (UUID).
     * - `[compound+key]`: For efficient querying of specific combinations.
     * 
     * Key Logic for `results` table:
     * - `[studentId+subjectKey+type+term]`: Ensures a student cannot have duplicate grades
     *   for the same subject, type (Exam/Test), and term. This is critical for the "Upsert" logic.
     */
    (this as any).version(6).stores({
      classes: 'id, level',
      students: 'id, classId',
      results: 'id, classId, studentId, type, [studentId+subjectKey+type+term]', 
      attendance: 'id, classId, studentId, date, [studentId+date]',
      lessons: 'id, subject, level',
      settings: 'key',
      progress: 'id, classId, topicId, [classId+topicId]',
      studentProgress: 'id, studentId, topicId, [studentId+topicId]',
      curriculum: 'id, level, subject, [level+subject]',
      studentNotes: 'studentId'
    });
  }
}

// Singleton instance of the database
export const db = new SmartTeacherDB();
