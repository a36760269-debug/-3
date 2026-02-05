
/**
 * @file types.ts
 * @description Defines the core data models and enumerations for the Smart Teacher Assistant application.
 * This file serves as the contract for data structures used across the app (DB, UI, Logic).
 */

// --- ENUMS ---

/**
 * Defines the type of assessment result.
 * Used to categorize grades in the database and UI.
 */
export enum ResultType {
  EXERCISE = 'EXERCISE', // Daily exercises or homework
  TEST = 'TEST',         // Periodic tests
  EXAM = 'EXAM',         // End-of-term official exams (Used for ranking)
}

/**
 * Represents the daily attendance status of a student.
 */
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
}

/**
 * Official Mauritanian Primary School Levels (Année Fondamentale).
 * AF1 = 1st Year, ..., AF6 = 6th Year.
 */
export enum ClassLevel {
  AF1 = 'AF1',
  AF2 = 'AF2',
  AF3 = 'AF3',
  AF4 = 'AF4',
  AF5 = 'AF5',
  AF6 = 'AF6',
}

// --- ENTITIES ---

/**
 * Represents a Student entity.
 * @property id - Unique UUID.
 * @property rimNumber - National student ID (numéro RIM).
 * @property classId - Foreign key linking to ClassEntity.
 */
export interface Student {
  id: string; 
  rimNumber?: string; 
  fullName: string; 
  parentName: string; 
  parentPhone?: string; 
  classId: string; 
  createdAt: number; 
}

/**
 * Represents a Class (Classroom) entity.
 * @property level - The educational level (AF1-AF6).
 * @property academicYear - e.g., "2024-2025".
 */
export interface ClassEntity {
  id: string; 
  name: string; 
  level: ClassLevel; 
  academicYear: string; 
}

/**
 * Stores the logged-in teacher's profile information.
 * Used for report headers and official documents.
 */
export interface TeacherProfile {
  fullName: string;
  registrationNumber: string; // Numéro Mle
  schoolName: string;
  state: string; // Wilaya
  district: string; // Moughataa
}

/**
 * Represents a single grade/score entry.
 * @property subjectKey - References keys in SUBJECT_NAMES constant.
 * @property type - Exam, Test, or Exercise.
 * @property term - Required if type is EXAM (1, 2, or 3).
 */
export interface Result {
  id: string;
  studentId: string;
  classId: string;
  subjectKey: string; 
  type: ResultType;
  score: number;
  maxScore: number;
  term?: 1 | 2 | 3; 
  date: number;
}

/**
 * Represents a single attendance entry for a student on a specific date.
 */
export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // ISO Date String YYYY-MM-DD
  status: AttendanceStatus;
  justification?: string;
}

/**
 * Configuration for a subject's metadata.
 */
export interface SubjectConfig {
  nameAr: string;
  maxScore: number;
}

// --- ANALYSIS TYPES ---

/**
 * Data structure for the Student Analysis Report (AI & Rule-based).
 */
export interface StudentAnalysis {
  studentId: string;
  generalLevel: 'ضعيف' | 'متوسط' | 'جيد' | 'ممتاز';
  averageScore: number;
  attendanceRate: number;
  strengths: string[];
  weaknesses: string[];
  trend: 'UP' | 'DOWN' | 'STABLE';
  teacherRecommendation: string;
  parentRecommendation: string;
}

/**
 * Row item for the Annual Official Report.
 */
export interface AnnualReportItem {
  studentId: string;
  term1Avg: number;
  term2Avg: number;
  term3Avg: number;
  annualAvg: number;
  rank: number;
  decision: string; // "ينتقل" | "يعيد"
}

/**
 * AI Generated Lesson Plan structure.
 */
export interface LessonPlan {
  id: string;
  subject: string;
  topic: string;
  level: string;
  content: string; // Serialized JSON of the plan details
  createdAt: number;
}

export interface TermSummary {
  term: 1 | 2 | 3;
  totalScore: number;
  maxPossibleScore: number;
  average: number; // /20
  rank: number;
}

// --- CURRICULUM TYPES ---

/**
 * Represents a single topic in the annual curriculum plan.
 * Used for tracking progress.
 */
export interface CurriculumTopic {
  id: string; 
  level: ClassLevel;
  subject: string;
  term: 1 | 2 | 3;
  week: number; // 1 to 30 (Academic weeks)
  topic: string; 
  competency?: string; 
}

/**
 * Tracks the completion of a curriculum topic at the CLASS level.
 */
export interface ClassProgress {
  id: string;
  classId: string;
  topicId: string; // References CurriculumTopic.id
  completedAt: number; 
  status: 'COMPLETED' | 'SKIPPED';
}

/**
 * Tracks the completion of a curriculum topic for a specific STUDENT.
 */
export interface StudentProgress {
  id: string;
  studentId: string;
  topicId: string;
  status: 'COMPLETED' | 'SKIPPED';
  updatedAt: number;
}
