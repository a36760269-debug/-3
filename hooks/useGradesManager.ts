import { useState, useEffect, useMemo } from 'react';
import { 
  getClasses, 
  getStudents, 
  getResults, 
  saveBatchResults,
  deleteBatchResults, // Imported new function
  getTeacherProfile,
  getAttendance
} from '../services/storageService';
import { 
  calculateExamTermStats, 
  rankStudents,
  generateAnnualReport,
} from '../services/mathService';
import { 
  ClassEntity, 
  Student, 
  Result, 
  ResultType,
  AnnualReportItem 
} from '../types';
import { LEVEL_CONFIG } from '../constants';

export const useGradesManager = () => {
  // --- STATE ---
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'term' | 'annual'>('term');
  const [selectedTerm, setSelectedTerm] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<ResultType>(ResultType.EXAM);

  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [localGrades, setLocalGrades] = useState<Record<string, string | number>>({});
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'name' | 'average'>('name');

  // --- DERIVED ---
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const subjects = useMemo(() => selectedClass ? LEVEL_CONFIG[selectedClass.level] : {}, [selectedClass]);
  const subjectKeys = useMemo(() => Object.keys(subjects), [subjects]);

  // --- EFFECTS ---
  useEffect(() => {
    getClasses().then(setClasses);
    getTeacherProfile().then(setTeacherProfile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedClassId) {
        const [s, r, att] = await Promise.all([
          getStudents(selectedClassId),
          getResults(selectedClassId, selectedType),
          getAttendance(selectedClassId)
        ]);
        
        setStudents(s);
        setResults(r);
        setAttendance(att);

        if (viewMode === 'term') {
          const currentTermResults = r.filter(res => Number(res.term) === Number(selectedTerm));
          const gradeMap: Record<string, string | number> = {};
          currentTermResults.forEach(res => {
            gradeMap[`${res.studentId}-${res.subjectKey}`] = res.score;
          });
          setLocalGrades(gradeMap);
        }
      } else {
        setStudents([]);
        setResults([]);
        setAttendance([]);
        setLocalGrades({});
      }
    };
    fetchData();
  }, [selectedClassId, selectedTerm, viewMode, selectedType]);

  // --- ACTIONS ---
  const handleGradeChange = (studentId: string, subjectKey: string, val: string) => {
    // If empty, keep as empty string to indicate potential deletion
    if (val === '') {
      setLocalGrades(prev => ({ ...prev, [`${studentId}-${subjectKey}`]: '' }));
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) return; // Ignore invalid chars
    const max = subjects[subjectKey] || 20;
    if (num < 0 || num > max) return; // Ignore out of bounds
    setLocalGrades(prev => ({ ...prev, [`${studentId}-${subjectKey}`]: val }));
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedClass) return;
    try {
      const resultsToSave: any[] = [];
      const resultsToDelete: any[] = [];

      Object.entries(localGrades).forEach(([key, val]) => {
        // CRITICAL FIX: UUIDs contain hyphens, so we must split by the LAST hyphen to separate studentId from subjectKey
        const lastDashIndex = key.lastIndexOf('-');
        if (lastDashIndex === -1) return; // Should not happen with valid keys

        const studentId = key.substring(0, lastDashIndex);
        const subjectKey = key.substring(lastDashIndex + 1);
        
        // Handle Deletion (Empty String)
        if (val === '' || val === undefined || val === null) {
          resultsToDelete.push({
            studentId,
            subjectKey,
            type: selectedType,
            term: Number(selectedTerm)
          });
          return;
        }

        // Handle Save (Valid Number)
        const score = typeof val === 'string' ? parseFloat(val) : (val as number);
        if (isNaN(score)) return;

        resultsToSave.push({
          studentId, 
          classId: selectedClassId, 
          subjectKey,
          type: selectedType,
          term: Number(selectedTerm) as 1 | 2 | 3,
          score,
          maxScore: subjects[subjectKey], 
          date: Date.now()
        });
      });
      
      // Execute Operations
      await Promise.all([
        saveBatchResults(resultsToSave),
        deleteBatchResults(resultsToDelete)
      ]);

      // Refresh Data
      const updatedResults = await getResults(selectedClassId, selectedType);
      setResults(updatedResults);
      alert(`تم حفظ التغييرات بنجاح ✅`);
    } catch (error: any) {
      alert(error.message || "حدث خطأ أثناء الحفظ. تأكد من صحة البيانات.");
    }
  };

  // --- CALCULATIONS ---
  const termStats = useMemo(() => {
    if (viewMode !== 'term' || !selectedClass) return {};
    const stats: Record<string, any> = {};
    
    students.forEach(s => {
      let totalScore = 0;
      subjectKeys.forEach(subj => {
         const val = localGrades[`${s.id}-${subj}`];
         const num = (typeof val === 'string' && val !== '') ? parseFloat(val) : (typeof val === 'number' ? val : 0);
         totalScore += num;
      });

      if (selectedType === ResultType.EXAM) {
         // Construct temporary result objects for live calculation
         const tempResults = subjectKeys.map(subj => {
            let val = localGrades[`${s.id}-${subj}`];
            // Convert to number or undefined
            if (typeof val === 'string') val = val === '' ? undefined : parseFloat(val);
            if (val === undefined || val === null || isNaN(val as number)) return null;
            
            return {
              studentId: s.id, subjectKey: subj, type: ResultType.EXAM,
              term: selectedTerm, score: val
            } as Result;
         }).filter(Boolean) as Result[];
         
         const dbStats = calculateExamTermStats(
             tempResults, 
             selectedClass.level, 
             selectedTerm
         );
         
         stats[s.id] = {
           totalScore: parseFloat(totalScore.toFixed(2)),
           average: dbStats.average,
           rank: '-'
         };
      } else {
        stats[s.id] = {
           totalScore: parseFloat(totalScore.toFixed(2)),
           average: '-',
           rank: '-'
        };
      }
    });

    if (selectedType === ResultType.EXAM) {
      const ranks = rankStudents(students, results, selectedClass.level, selectedTerm);
      Object.keys(stats).forEach(sid => {
        stats[sid].rank = ranks[sid] || '-';
      });
    }
    return stats;
  }, [students, localGrades, selectedClass, selectedTerm, results, viewMode, selectedType, subjectKeys]);

  const sortedStudents = useMemo(() => {
    const list = [...students];
    if (sortBy === 'name') {
      return list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
    } else {
      return list.sort((a, b) => {
        const statsA = termStats[a.id]?.totalScore || 0;
        const statsB = termStats[b.id]?.totalScore || 0;
        return statsB - statsA;
      });
    }
  }, [students, termStats, sortBy]);

  const annualReport = useMemo<AnnualReportItem[]>(() => {
    if (viewMode !== 'annual' || !selectedClass) return [];
    return generateAnnualReport(students, results.filter(r => r.type === ResultType.EXAM), selectedClass.level);
  }, [students, results, selectedClass, viewMode]);

  return {
    state: {
      classes, selectedClassId, viewMode, selectedTerm, selectedType,
      students, results, attendance, localGrades, teacherProfile, sortBy
    },
    derived: {
      selectedClass, subjects, subjectKeys, termStats, sortedStudents, annualReport
    },
    setters: {
      setSelectedClassId, setViewMode, setSelectedTerm, setSelectedType, setSortBy
    },
    actions: {
      handleGradeChange, handleSave
    }
  };
};