import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { 
  ClassEntity, 
  Student, 
  Result, 
  AttendanceRecord, 
  TeacherProfile,
  ResultType,
  LessonPlan,
  ClassLevel
} from '../types';
import { DB_KEYS } from '../constants';

/**
 * @file storageService.ts
 * @description Acts as the Data Access Layer (DAL). 
 * Contains all direct interactions with the Dexie Database, including validation and transactions.
 */

// --- CORE DOMAIN VALIDATION ---

/**
 * Validates ClassEntity data before insertion.
 * @throws Error if validation fails.
 */
const validateClass = (c: Partial<ClassEntity>) => {
  if (!c.name || c.name.trim() === '') throw new Error("CRITICAL: Class Name is required");
  if (!c.level || !Object.values(ClassLevel).includes(c.level as ClassLevel)) {
    throw new Error("CRITICAL: Invalid Class Level");
  }
  if (!c.academicYear) throw new Error("CRITICAL: Academic Year is required");
};

/**
 * Validates Student data and checks class existence.
 */
const validateStudent = async (s: Partial<Student>) => {
  if (!s.fullName || s.fullName.trim() === '') throw new Error("CRITICAL: Student Name is required");
  if (!s.parentName || s.parentName.trim() === '') throw new Error("CRITICAL: Parent Name is required");
  if (!s.classId) throw new Error("CRITICAL: Student MUST belong to a class");
  
  const classExists = await db.classes.get(s.classId);
  if (!classExists) throw new Error("CRITICAL: Assigned Class ID does not exist in database");
};

/**
 * Validates a Result (Grade) entry.
 */
const validateResult = (r: Partial<Result>) => {
  if (!r.classId || !r.studentId || !r.subjectKey) throw new Error("CRITICAL: Result missing identifiers");
  if (!Object.values(ResultType).includes(r.type as ResultType)) throw new Error(`Invalid Type: ${r.type}`);
  if (r.type === ResultType.EXAM && !r.term) throw new Error("CRITICAL: EXAM result must have a term");
  if (typeof r.score !== 'number' || r.score > r.maxScore) throw new Error("Invalid Score");
};

// --- AUTH & PROFILE (Hive-like KV Store) ---

export const saveTeacherProfile = async (profile: TeacherProfile) => {
  await db.settings.put({ key: DB_KEYS.TEACHER, value: profile });
};

export const getTeacherProfile = async (): Promise<TeacherProfile | null> => {
  const entry = await db.settings.get(DB_KEYS.TEACHER);
  return entry ? entry.value : null;
};

export const setAuthPin = async (pin: string) => {
  await db.settings.put({ key: DB_KEYS.AUTH, value: pin });
};

export const checkAuthPin = async (pin: string): Promise<boolean> => {
  const entry = await db.settings.get(DB_KEYS.AUTH);
  return entry ? entry.value === pin : false;
};

export const hasAuthPin = async (): Promise<boolean> => {
  const count = await db.settings.where('key').equals(DB_KEYS.AUTH).count();
  return count > 0;
};

// --- CLASSES (Relational) ---

export const getClasses = async (): Promise<ClassEntity[]> => {
  return await db.classes.toArray();
};

export const addClass = async (cls: Omit<ClassEntity, 'id'>) => {
  validateClass(cls);
  const newClass = { ...cls, id: uuidv4() };
  await db.classes.add(newClass);
  return newClass;
};

// --- STUDENTS ---

export const getStudents = async (classId?: string): Promise<Student[]> => {
  if (classId) {
    return await db.students.where('classId').equals(classId).toArray();
  }
  return await db.students.toArray();
};

export const addStudent = async (student: Omit<Student, 'id' | 'createdAt'>) => {
  await validateStudent(student);
  const newStudent = { ...student, id: uuidv4(), createdAt: Date.now() };
  await db.students.add(newStudent);
  return newStudent;
};

// --- RESULTS (LOGIC) ---

/**
 * Retrieves results filtered by class and optionally by type (Exam/Test).
 * @param classId - The class ID.
 * @param type - (Optional) ResultType filter.
 */
export const getResults = async (classId: string, type?: ResultType): Promise<Result[]> => {
  // STRICT retrieval by classId to ensure isolation
  let collection = db.results.where('classId').equals(classId);
  
  if (type) {
    // Filter strictly by type within the class scope
    return await collection.filter(r => r.type === type).toArray();
  }
  return await collection.toArray();
};

/**
 * Batches save or update results using a transaction.
 * Implements "Upsert" logic based on [studentId+subjectKey+type+term].
 * 
 * @param results - Array of result objects to save.
 */
export const saveBatchResults = async (results: Omit<Result, 'id'>[]) => {
  if (results.length === 0) return;
  
  // 1. Validation Step
  results.forEach(validateResult);

  // 2. Transaction Step (Ensures all succeed or all fail)
  await (db as any).transaction('rw', db.results, async () => {
    for (const res of results) {
      // NORMALIZE DATA TYPES
      // Ensure term is a number for Index lookups (1, 2, 3). 0 if undefined.
      const termVal = res.term ? Number(res.term) : 0;
      const scoreVal = Number(res.score);
      const maxScoreVal = Number(res.maxScore);

      // 3. UNIQUENESS CHECK & UPSERT
      // Logic: Find existing result by (Student + Subject + Type + Term) globally.
      // If found: UPDATE it and FORCE classId to match current context.
      // If not found: INSERT new.
      
      const existing = await db.results
        .where('[studentId+subjectKey+type+term]')
        .equals([res.studentId, res.subjectKey, res.type, termVal])
        .first();

      if (existing) {
        // UPDATE Existing
        await db.results.put({ 
          ...existing, // Keep ID
          score: scoreVal, 
          maxScore: maxScoreVal,
          date: res.date,
          classId: res.classId,
          term: termVal as any  
        });
      } else {
        // INSERT New
        await db.results.add({ 
          ...res, 
          id: uuidv4(),
          term: termVal as any,
          score: scoreVal,
          maxScore: maxScoreVal
        });
      }
    }
  });
};

/**
 * Batches delete results using a transaction.
 * Used when a user clears a grade from the grid.
 * 
 * @param criteriaList - List of identifiers to find and delete records.
 */
export const deleteBatchResults = async (criteriaList: { studentId: string, subjectKey: string, type: ResultType, term?: number }[]) => {
  if (criteriaList.length === 0) return;

  await (db as any).transaction('rw', db.results, async () => {
    for (const criteria of criteriaList) {
      const termVal = criteria.term ? Number(criteria.term) : 0;
      
      // Find exact match by compound key
      const existing = await db.results
        .where('[studentId+subjectKey+type+term]')
        .equals([criteria.studentId, criteria.subjectKey, criteria.type, termVal])
        .first();

      if (existing) {
        await db.results.delete(existing.id);
      }
    }
  });
};

// --- ATTENDANCE ---

export const getAttendance = async (classId: string, date?: string): Promise<AttendanceRecord[]> => {
  let collection = db.attendance.where('classId').equals(classId);
  if (date) {
    return await collection.filter(r => r.date === date).toArray();
  }
  return await collection.toArray();
};

/**
 * Saves attendance records. Overwrites existing record for the same student/date.
 */
export const saveAttendance = async (records: Omit<AttendanceRecord, 'id'>[]) => {
  await (db as any).transaction('rw', db.attendance, async () => {
    for (const r of records) {
      // Remove existing for same student/date to overwrite
      await db.attendance
        .where({ studentId: r.studentId, date: r.date })
        .delete();
        
      await db.attendance.add({ ...r, id: uuidv4() });
    }
  });
};

// --- LESSON PLANS ---

export const saveLessonPlan = async (plan: Omit<LessonPlan, 'id' | 'createdAt'>) => {
  await db.lessons.add({ ...plan, id: uuidv4(), createdAt: Date.now() });
};

export const getLessonPlans = async (): Promise<LessonPlan[]> => {
  return await db.lessons.orderBy('createdAt').reverse().toArray();
};

// --- STUDENT NOTES ---

export const saveStudentNote = async (studentId: string, content: string) => {
  await db.studentNotes.put({ studentId, content, updatedAt: Date.now() });
};

export const getStudentNote = async (studentId: string): Promise<string> => {
  const note = await db.studentNotes.get(studentId);
  return note ? note.content : '';
};