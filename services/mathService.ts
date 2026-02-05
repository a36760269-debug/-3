
import { LEVEL_CONFIG, SUBJECT_NAMES } from '../constants';
import { Result, ResultType, ClassLevel, Student, AttendanceRecord, AttendanceStatus, AnnualReportItem, StudentAnalysis } from '../types';

/**
 * @file mathService.ts
 * @description The Calculation Engine.
 * Contains purely functional, stateless logic for calculating grades, averages, ranks, and statistics.
 * This file serves as the "Single Source of Truth" for mathematical rules in the app.
 */

/**
 * Calculates the total maximum score possible for a given class level based on official coefficients.
 */
export const calculateMaxScoreForLevel = (level: ClassLevel): number => {
  const subjects = LEVEL_CONFIG[level];
  if (!subjects) return 200; // Fallback
  return Object.values(subjects).reduce((sum, score) => sum + score, 0);
};

/**
 * CORE HELPER: Extract specific term grades for a student.
 * Ensures we ONLY get EXAM results for the requested term to prevent mixing with Tests/Exercises.
 * @param allResults - List of results to filter.
 * @param term - The term (1, 2, or 3).
 * @returns A map: { 'subject_key': score }
 */
export const getStudentTermGrades = (
  allResults: Result[],
  term: 1 | 2 | 3
): Record<string, number> => {
  const grades: Record<string, number> = {};
  
  // ROBUST FILTERING: Convert to string/number safely for comparison
  const termResults = allResults.filter(r => {
    // Check Type (Loose equality for safety against "EXAM" string variants in DB)
    const isExam = r.type === ResultType.EXAM || String(r.type) === 'EXAM';
    // Check Term (Convert both to Number to ensure '1' == 1)
    const isTerm = Number(r.term) === Number(term);
    return isExam && isTerm;
  });

  termResults.forEach(r => {
    grades[r.subjectKey] = Number(r.score) || 0;
  });

  return grades;
};

/**
 * Calculates Term Statistics (Total Score, Max Possible, Average /20).
 * Logic: Sums up all valid EXAM scores for the term.
 */
export const calculateExamTermStats = (
  results: Result[], // Should be pre-filtered for the student
  level: ClassLevel,
  term: 1 | 2 | 3
) => {
  const subjects = LEVEL_CONFIG[level];
  let totalScore = 0;
  
  const termResults = results.filter(r => {
    const isExam = r.type === ResultType.EXAM || String(r.type) === 'EXAM';
    const isTerm = Number(r.term) === Number(term);
    return isExam && isTerm;
  });

  termResults.forEach(r => {
    const maxForSubject = subjects[r.subjectKey] || 20;
    const rawScore = Number(r.score) || 0;
    // Cap score at max to prevent data errors
    const actualScore = Math.min(rawScore, maxForSubject);
    totalScore += actualScore;
  });

  const maxPossible = calculateMaxScoreForLevel(level);
  
  // Normalize to /20
  const average = maxPossible > 0 ? (totalScore / maxPossible) * 20 : 0;

  return {
    totalScore: parseFloat(totalScore.toFixed(2)),
    maxPossible,
    average: parseFloat(average.toFixed(2))
  };
};

/**
 * Calculates the Annual Weighted Average.
 * Formula: (Term1*1 + Term2*2 + Term3*3) / 6
 * This is the standard Mauritanian calculation method.
 */
export const calculateAnnualAverage = (
  avg1: number, 
  avg2: number, 
  avg3: number
): number => {
  const val1 = Number(avg1) || 0;
  const val2 = Number(avg2) || 0;
  const val3 = Number(avg3) || 0;
  
  const weightedSum = (val1 * 1) + (val2 * 2) + (val3 * 3);
  return parseFloat((weightedSum / 6).toFixed(2));
};

/**
 * Generates the full Annual Report table data, including Ranks and Decisions.
 */
export const generateAnnualReport = (
  students: Student[],
  allResults: Result[],
  level: ClassLevel
): AnnualReportItem[] => {
  const report: AnnualReportItem[] = students.map(student => {
    // Strict Filtering by Student ID
    const sResults = allResults.filter(r => r.studentId === student.id);
    
    // Calculate Individual Terms
    const t1 = calculateExamTermStats(sResults, level, 1).average;
    const t2 = calculateExamTermStats(sResults, level, 2).average;
    const t3 = calculateExamTermStats(sResults, level, 3).average;
    
    // Calculate Annual Weighted Average
    const annual = calculateAnnualAverage(t1, t2, t3);
    
    return {
      studentId: student.id,
      term1Avg: t1,
      term2Avg: t2,
      term3Avg: t3,
      annualAvg: annual,
      rank: 0, // Placeholder, calculated below
      decision: annual >= 10 ? 'ينتقل' : 'يعيد' // Passing grade is 10/20
    };
  });

  // Sort by Annual Average (Descending) to assign ranks
  report.sort((a, b) => b.annualAvg - a.annualAvg);

  // Assign Ranks with tie handling
  let currentRank = 1;
  report.forEach((item, index) => {
    if (index > 0 && item.annualAvg < report[index - 1].annualAvg) {
      currentRank = index + 1;
    }
    item.rank = currentRank;
  });

  return report;
};

/**
 * Ranks students for a specific term based on their averages.
 */
export const rankStudents = (
  students: Student[], 
  allResults: Result[], 
  level: ClassLevel,
  term: 1 | 2 | 3
): Record<string, number> => {
  const studentAverages = students.map(student => {
    const studentResults = allResults.filter(r => r.studentId === student.id);
    const stats = calculateExamTermStats(studentResults, level, term);
    return {
      studentId: student.id,
      average: stats.average
    };
  });

  // Sort descending
  studentAverages.sort((a, b) => b.average - a.average);

  // Assign ranks
  const ranks: Record<string, number> = {};
  let currentRank = 1;
  
  studentAverages.forEach((item, index) => {
    if (index > 0 && item.average < studentAverages[index - 1].average) {
      currentRank = index + 1;
    }
    ranks[item.studentId] = currentRank;
  });

  return ranks;
};

// --- ATTENDANCE ENGINE ---

export const filterAttendanceByPeriod = (
  records: AttendanceRecord[], 
  period: 'week' | 'month' | 'term'
): AttendanceRecord[] => {
  const now = new Date();
  
  return records.filter(r => {
    const rDate = new Date(r.date);
    const diffTime = Math.abs(now.getTime() - rDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (period === 'week') return diffDays <= 7;
    if (period === 'month') return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
    return true; // Term implies all records for current context
  });
};

export const calculateAttendanceStats = (records: AttendanceRecord[]) => {
  const total = records.length;
  if (total === 0) return { presentRate: 0, absentRate: 0, lateRate: 0, counts: { present: 0, absent: 0, late: 0 } };

  const present = records.filter(r => r.status === AttendanceStatus.PRESENT).length;
  const absent = records.filter(r => r.status === AttendanceStatus.ABSENT).length;
  const late = records.filter(r => r.status === AttendanceStatus.LATE).length;

  return {
    counts: { present, absent, late },
    presentRate: Math.round((present / total) * 100),
    absentRate: Math.round((absent / total) * 100),
    lateRate: Math.round((late / total) * 100)
  };
};

// --- RULE-BASED ANALYSIS ENGINE ---

export interface ClassAnalysis {
  totalStudents: number;
  classAverage: number;
  attendanceAverage: number;
  topSubject: string;
  weakestSubject: string;
  distribution: { excellent: number, good: number, average: number, weak: number };
}

/**
 * Generates an aggregated analysis for the entire class.
 */
export const generateClassAnalysis = (
  students: Student[],
  results: Result[],
  attendance: AttendanceRecord[],
  level: ClassLevel
): ClassAnalysis => {
  if (students.length === 0) return { 
    totalStudents: 0, classAverage: 0, attendanceAverage: 0, 
    topSubject: '-', weakestSubject: '-', 
    distribution: { excellent: 0, good: 0, average: 0, weak: 0 } 
  };

  const studentStats = students.map(s => generateComprehensiveAnalysis(s.id, results, attendance, level));
  
  const totalAvg = studentStats.reduce((acc, curr) => acc + curr.averageScore, 0);
  const totalAtt = studentStats.reduce((acc, curr) => acc + curr.attendanceRate, 0);
  
  const dist = { excellent: 0, good: 0, average: 0, weak: 0 };
  studentStats.forEach(s => {
    if (s.generalLevel === 'ممتاز') dist.excellent++;
    else if (s.generalLevel === 'جيد') dist.good++;
    else if (s.generalLevel === 'متوسط') dist.average++;
    else dist.weak++;
  });

  const subjects = Object.keys(LEVEL_CONFIG[level]);
  const subjectAvgs = subjects.map(subKey => {
    // Robust Filtering for Subject Analysis
    const subResults = results.filter(r => 
      r.subjectKey === subKey && 
      (r.type === ResultType.EXAM || String(r.type) === 'EXAM')
    );
    
    if (subResults.length === 0) return { key: subKey, avg: 0 };
    
    const max = LEVEL_CONFIG[level][subKey];
    // Calculate percentage based average for fair comparison across weighted subjects
    const totalPercent = subResults.reduce((sum, r) => sum + ((Number(r.score)||0) / max), 0);
    return { key: subKey, avg: totalPercent / subResults.length };
  });

  subjectAvgs.sort((a, b) => b.avg - a.avg);

  return {
    totalStudents: students.length,
    classAverage: parseFloat((totalAvg / students.length).toFixed(2)),
    attendanceAverage: Math.round(totalAtt / students.length),
    topSubject: subjectAvgs.length > 0 ? (SUBJECT_NAMES[subjectAvgs[0].key] || subjectAvgs[0].key) : '-',
    weakestSubject: subjectAvgs.length > 0 ? (SUBJECT_NAMES[subjectAvgs[subjectAvgs.length-1].key] || subjectAvgs[subjectAvgs.length-1].key) : '-',
    distribution: dist
  };
};

/**
 * Generates a deep analysis for a specific student using rule-based logic.
 * Analyzes trend (up/down), strengths, weaknesses, and general level.
 */
export const generateComprehensiveAnalysis = (
  studentId: string,
  allResults: Result[], 
  attendanceRecords: AttendanceRecord[],
  level: ClassLevel
): StudentAnalysis => {
  const subjectsConfig = LEVEL_CONFIG[level];
  const studentResults = allResults.filter(r => r.studentId === studentId);
  
  const terms = [1, 2, 3] as const;
  const termStats = terms.map(t => calculateExamTermStats(studentResults, level, t));
  const termAvgs = termStats.map(s => s.average);
  
  // Trend Logic
  let activeTermAvg = termAvgs[0];
  let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  
  if (termStats[2].totalScore > 0) { 
    activeTermAvg = termAvgs[2];
    trend = termAvgs[2] > termAvgs[1] ? 'UP' : (termAvgs[2] < termAvgs[1] ? 'DOWN' : 'STABLE');
  } else if (termStats[1].totalScore > 0) { 
    activeTermAvg = termAvgs[1];
    trend = termAvgs[1] > termAvgs[0] ? 'UP' : (termAvgs[1] < termAvgs[0] ? 'DOWN' : 'STABLE');
  }

  // Level Logic
  let generalLevel: any = 'متوسط';
  if (activeTermAvg >= 16) generalLevel = 'ممتاز';
  else if (activeTermAvg >= 12) generalLevel = 'جيد';
  else if (activeTermAvg < 10) generalLevel = 'ضعيف';

  // Determine latest term with data to find current strengths/weaknesses
  const latestTerm = termStats[2].totalScore > 0 ? 3 : (termStats[1].totalScore > 0 ? 2 : 1);
  
  const latestResults = studentResults.filter(r => 
    Number(r.term) === latestTerm && 
    (r.type === ResultType.EXAM || String(r.type) === 'EXAM')
  );
  
  // Calculate percentage performance per subject
  const subjectPerformance = latestResults.map(r => {
    const max = subjectsConfig[r.subjectKey] || 20;
    const percent = max > 0 ? (Number(r.score)||0) / max : 0;
    return { 
      key: r.subjectKey, 
      name: SUBJECT_NAMES[r.subjectKey] || r.subjectKey, 
      percent 
    };
  });

  subjectPerformance.sort((a, b) => b.percent - a.percent);

  // Thresholds: Strength > 75%, Weakness < 50%
  const strengths = subjectPerformance.filter(s => s.percent >= 0.75).map(s => s.name);
  const criticalWeaknesses = subjectPerformance.filter(s => s.percent <= 0.5); 
  const weaknesses = criticalWeaknesses.map(s => s.name);

  const attStats = calculateAttendanceStats(attendanceRecords.filter(r => r.studentId === studentId));

  // Auto-Recommendations
  let teacherRecParts: string[] = [`مستوى الطالب: ${generalLevel}.`];
  let parentRecParts: string[] = [`مستوى ابنكم: ${generalLevel}.`];

  if (generalLevel === 'ضعيف') {
    teacherRecParts.push("يحتاج لخطة علاجية مكثفة.");
    parentRecParts.push("يرجى التواصل مع الإدارة.");
  }

  return {
    studentId,
    generalLevel,
    averageScore: activeTermAvg,
    attendanceRate: attStats.presentRate,
    strengths: strengths.slice(0, 3), 
    weaknesses: weaknesses.slice(0, 3), 
    trend,
    teacherRecommendation: teacherRecParts.join(" "),
    parentRecommendation: parentRecParts.join(" ")
  };
};
