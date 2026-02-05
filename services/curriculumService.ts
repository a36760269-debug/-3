
import { db } from './db';
import { CURRICULUM_DATA, LEVEL_CONFIG } from '../constants';
import { ClassLevel, CurriculumTopic, StudentProgress } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * @file curriculumService.ts
 * @description Manages the educational curriculum data.
 * Features:
 * - Seeding initial data from constants.
 * - Tracking class-level progress (Teacher view).
 * - Tracking student-level progress.
 * - Generating annual templates.
 */

// Configuration for Academic Year
const getAcademicYearStart = (): Date => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('sta_current_academic_year');
    if (stored) return new Date(stored);
  }
  return new Date(new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0), 9, 1);
};

/**
 * Calculates the current week number of the academic year.
 */
export const getCurrentAcademicWeek = (): number => {
  const startDate = getAcademicYearStart();
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  // Ensure at least week 1
  return Math.max(1, Math.ceil(diffDays / 7));
};

// --- CRUD OPERATIONS ---

// 1. Initialize DB with constants if empty (Seeding)
export const initCurriculumData = async () => {
  const count = await db.curriculum.count();
  if (count === 0) {
    // Only add if no data exists
    if (CURRICULUM_DATA && CURRICULUM_DATA.length > 0) {
      await db.curriculum.bulkAdd(CURRICULUM_DATA);
    }
  }
};

// 2. Read
export const getCurriculumForClass = async (level: ClassLevel) => {
  // Ensure seeding happens once
  const count = await db.curriculum.where('level').equals(level).count();
  if (count === 0 && CURRICULUM_DATA.some(c => c.level === level)) {
      await initCurriculumData();
  }

  return await db.curriculum
    .where('level').equals(level)
    .toArray()
    .then(items => items.sort((a, b) => a.week - b.week));
};

// 3. Create / Add
export const addCurriculumTopic = async (topic: Omit<CurriculumTopic, 'id'>) => {
  const newTopic = { ...topic, id: uuidv4() };
  await db.curriculum.add(newTopic);
  return newTopic;
};

// 4. Update
export const updateCurriculumTopic = async (topic: CurriculumTopic) => {
  await db.curriculum.put(topic);
};

// 5. Delete
export const deleteCurriculumTopic = async (id: string) => {
  await db.curriculum.delete(id);
  // Also clean up progress for this topic to prevent orphans
  await db.progress.where('topicId').equals(id).delete();
  await db.studentProgress.where('topicId').equals(id).delete();
};

// 6. Bulk Delete (Clear Level)
export const clearCurriculumForLevel = async (level: ClassLevel) => {
  const items = await db.curriculum.where('level').equals(level).toArray();
  const ids = items.map(i => i.id);
  if (ids.length > 0) {
    await db.curriculum.bulkDelete(ids);
    // Cleanup progress
    await db.progress.where('topicId').anyOf(ids).delete();
    await db.studentProgress.where('topicId').anyOf(ids).delete();
  }
};

/**
 * Generates a full yearly template (placeholder topics) for a level.
 * Useful for teachers to start with a skeleton plan.
 */
export const generateYearlyTemplate = async (level: ClassLevel) => {
  const subjectsConfig = LEVEL_CONFIG[level];
  if (!subjectsConfig) {
      throw new Error(`Configuration not found for level: ${level}`);
  }
  const subjects = Object.keys(subjectsConfig);
  const newTopics: CurriculumTopic[] = [];
  const TOTAL_WEEKS = 30; // Standard academic year weeks

  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    // Determine Term based on week number (Approximation)
    let term: 1 | 2 | 3 = 1;
    if (week > 11) term = 2;
    if (week > 22) term = 3;

    subjects.forEach(subjectKey => {
      newTopics.push({
        id: uuidv4(),
        level: level,
        subject: subjectKey,
        term: term,
        week: week,
        topic: `موضوع الأسبوع ${week}`, // Placeholder topic
        competency: ''
      });
    });
  }

  await db.curriculum.bulkAdd(newTopics);
};

// --- CLASS PROGRESS TRACKING ---

export const getClassProgress = async (classId: string) => {
  return await db.progress.where('classId').equals(classId).toArray();
};

/**
 * Toggles the completion status of a topic for a whole class.
 */
export const toggleTopicCompletion = async (classId: string, topicId: string, isCompleted: boolean) => {
  if (isCompleted) {
    const existing = await db.progress.where({ classId, topicId }).first();
    if (!existing) {
      await db.progress.add({
        id: uuidv4(),
        classId,
        topicId,
        completedAt: Date.now(),
        status: 'COMPLETED'
      });
    }
  } else {
    // Remove completion record
    const records = await db.progress.where({ classId, topicId }).toArray();
    const ids = records.map(r => r.id);
    if(ids.length > 0) await db.progress.bulkDelete(ids);
  }
};

/**
 * Calculus statistics for a specific subject's progress.
 * Determines if the class is delayed based on the current academic week.
 */
export const getSubjectProgressStatus = (
  subjectTopics: CurriculumTopic[], 
  completedTopicIds: string[]
) => {
  const currentWeek = getCurrentAcademicWeek();
  const totalTopics = subjectTopics.length;
  const completedCount = completedTopicIds.length;
  
  const completedTopics = subjectTopics.filter(t => completedTopicIds.includes(t.id));
  const lastCompletedWeek = completedTopics.length > 0 
    ? Math.max(...completedTopics.map(t => t.week)) 
    : 0;
  
  const expectedTopicsCount = subjectTopics.filter(t => t.week < currentWeek).length;

  // Delayed if we should have finished more topics than we have
  const isDelayed = expectedTopicsCount > completedCount;
  
  // Calculate delay weeks
  const delayWeeks = Math.max(0, currentWeek - lastCompletedWeek - 1);

  return {
    percentage: totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0,
    completedCount,
    totalTopics,
    currentWeek,
    lastCompletedWeek,
    isDelayed: isDelayed && delayWeeks > 0,
    delayWeeks
  };
};

// --- STUDENT PROGRESS TRACKING ---

export const getStudentProgress = async (studentId: string) => {
  return await db.studentProgress.where('studentId').equals(studentId).toArray();
};

export const setStudentTopicStatus = async (
  studentId: string, 
  topicId: string, 
  status: 'COMPLETED' | 'SKIPPED' | null
) => {
  const existing = await db.studentProgress.where({ studentId, topicId }).first();
  
  if (status === null) {
    // Remove if exists
    if (existing) {
      await db.studentProgress.delete(existing.id);
    }
  } else {
    // Add or Update
    if (existing) {
      await db.studentProgress.update(existing.id, { status, updatedAt: Date.now() });
    } else {
      await db.studentProgress.add({
        id: uuidv4(),
        studentId,
        topicId,
        status,
        updatedAt: Date.now()
      });
    }
  }
};

export const getStudentSubjectStats = (
  subjectTopics: CurriculumTopic[],
  studentProgress: StudentProgress[]
) => {
  const total = subjectTopics.length;
  if (total === 0) return { completed: 0, skipped: 0, percentage: 0 };

  const subjectTopicIds = subjectTopics.map(t => t.id);
  
  // Filter progress relevant to this subject
  const relevantProgress = studentProgress.filter(p => subjectTopicIds.includes(p.topicId));
  
  const completed = relevantProgress.filter(p => p.status === 'COMPLETED').length;
  const skipped = relevantProgress.filter(p => p.status === 'SKIPPED').length;
  const totalDone = completed + skipped;

  return {
    completed,
    skipped,
    percentage: Math.round((totalDone / total) * 100)
  };
};
