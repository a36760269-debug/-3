
import React, { useState, useEffect } from 'react';
import { 
  getClasses, 
  getStudents, 
  getResults, 
  getAttendance 
} from '../services/storageService';
import { 
  generateComprehensiveAnalysis, 
  generateClassAnalysis,
  ClassAnalysis,
  calculateExamTermStats
} from '../services/mathService';
import { 
  ClassEntity, 
  Student, 
  Result, 
  AttendanceRecord,
  StudentAnalysis,
  ClassLevel,
  ResultType
} from '../types';
import { Card, SectionTitle, Button } from '../components/Shared';
import { 
  LineChart, Users, TrendingUp, TrendingDown, Minus, 
  CheckCircle, AlertTriangle, UserCheck, Star, ArrowLeft,
  BarChart2, BookOpen, AlertCircle, MessageCircle, Send
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area 
} from 'recharts';

const AnalysisPage = () => {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [classAnalysis, setClassAnalysis] = useState<ClassAnalysis | null>(null);
  const [studentsAnalysis, setStudentsAnalysis] = useState<(StudentAnalysis & { student: Student })[]>([]);
  
  // Raw Data
  const [results, setResults] = useState<Result[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    getClasses().then(setClasses);
  }, []);

  useEffect(() => {
    const loadClassData = async () => {
      if (!selectedClassId) {
        setClassAnalysis(null);
        setStudentsAnalysis([]);
        return;
      }

      const cls = classes.find(c => c.id === selectedClassId);
      if (!cls) return;

      const s = await getStudents(selectedClassId);
      const r = await getResults(selectedClassId); // All types
      const a = await getAttendance(selectedClassId);

      setResults(r);
      setAttendance(a);

      // 1. Generate Class Overview
      const cStats = generateClassAnalysis(s, r, a, cls.level);
      setClassAnalysis(cStats);

      // 2. Generate All Students Analysis
      const sStats = s.map(st => ({
        ...generateComprehensiveAnalysis(st.id, r, a, cls.level),
        student: st
      }));
      setStudentsAnalysis(sStats);
    };

    loadClassData();
    setSelectedStudent(null);
  }, [selectedClassId]);

  // Helper: Get student specific analysis when selected
  const currentStudentAnalysis = selectedStudent 
    ? studentsAnalysis.find(sa => sa.studentId === selectedStudent.id) 
    : null;

  // Chart Data for Student Trend
  const getTrendData = (studentId: string, level: ClassLevel) => {
    const sResults = results.filter(r => r.studentId === studentId);
    return [
      { name: 'فصل 1', avg: calculateExamTermStats(sResults, level, 1).average },
      { name: 'فصل 2', avg: calculateExamTermStats(sResults, level, 2).average },
      { name: 'فصل 3', avg: calculateExamTermStats(sResults, level, 3).average },
    ];
  };

  const handleSendWhatsApp = () => {
    if (!selectedStudent?.parentPhone || !currentStudentAnalysis) return;
    
    const message = `السلام عليكم ورحمة الله،
السيد/ة ولي أمر التلميذ: ${selectedStudent.fullName}
بخصوص مستوى ابنكم الدراسي، نفيدكم بالتالي:
${currentStudentAnalysis.parentRecommendation}

مع تحيات إدارة المدرسة.`;

    const url = `https://wa.me/222${selectedStudent.parentPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionTitle title="نظام التحليل والمتابعة" icon={LineChart} />

      {/* Main Class Selector */}
      {!selectedStudent && (
        <Card className="flex items-center gap-4">
          <label className="font-bold text-slate-700">اختر الفصل للتحليل:</label>
          <select 
            className="border border-slate-200 p-2.5 rounded-xl w-64 focus:ring-2 focus:ring-teal-500 outline-none"
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
          >
            <option value="">-- اختر الفصل --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Card>
      )}

      {/* VIEW 1: CLASS DASHBOARD */}
      {selectedClassId && !selectedStudent && classAnalysis && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-none relative overflow-hidden">
               <div className="relative z-10">
                 <p className="opacity-80 text-sm font-medium mb-1">معدل الفصل</p>
                 <h3 className="text-3xl font-bold">{classAnalysis.classAverage}</h3>
               </div>
               <BarChart2 className="absolute left-4 bottom-4 opacity-20" size={60} />
            </Card>
            <Card className="bg-white border-l-4 border-l-green-500">
               <p className="text-slate-500 text-sm font-bold mb-1">أفضل مادة</p>
               <h3 className="text-xl font-bold text-slate-800">{classAnalysis.topSubject}</h3>
            </Card>
            <Card className="bg-white border-l-4 border-l-red-500">
               <p className="text-slate-500 text-sm font-bold mb-1">تحتاج عناية</p>
               <h3 className="text-xl font-bold text-slate-800">{classAnalysis.weakestSubject}</h3>
            </Card>
            <Card className="bg-white border-l-4 border-l-blue-500">
               <p className="text-slate-500 text-sm font-bold mb-1">متوسط الحضور</p>
               <h3 className="text-xl font-bold text-slate-800">{classAnalysis.attendanceAverage}%</h3>
            </Card>
          </div>

          {/* Students List Table */}
          <Card>
            <h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2">
              <Users className="text-teal-600"/>
              تحليل أداء التلاميذ ({classAnalysis.totalStudents})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                   <tr>
                     <th className="p-3 rounded-r-lg">التلميذ</th>
                     <th className="p-3 text-center">المستوى العام</th>
                     <th className="p-3 text-center">المعدل</th>
                     <th className="p-3 text-center">الحضور</th>
                     <th className="p-3 text-center">الاتجاه</th>
                     <th className="p-3 rounded-l-lg text-center">إجراء</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsAnalysis.map(sa => (
                    <tr key={sa.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-800">{sa.student.fullName}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          sa.generalLevel === 'ممتاز' ? 'bg-green-100 text-green-700' :
                          sa.generalLevel === 'جيد' ? 'bg-blue-100 text-blue-700' :
                          sa.generalLevel === 'متوسط' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {sa.generalLevel}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">{sa.averageScore}</td>
                      <td className={`p-3 text-center font-bold ${sa.attendanceRate < 80 ? 'text-red-500' : 'text-slate-600'}`}>
                        {sa.attendanceRate}%
                      </td>
                      <td className="p-3 text-center flex justify-center">
                         {sa.trend === 'UP' && <TrendingUp size={20} className="text-green-500" />}
                         {sa.trend === 'DOWN' && <TrendingDown size={20} className="text-red-500" />}
                         {sa.trend === 'STABLE' && <Minus size={20} className="text-slate-400" />}
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => setSelectedStudent(sa.student)}
                          className="text-teal-600 hover:bg-teal-50 px-3 py-1 rounded text-xs font-bold transition"
                        >
                          تحليل مفصل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: STUDENT DETAIL */}
      {selectedStudent && currentStudentAnalysis && (
        <div className="space-y-6 animate-scale-up">
           <button 
             onClick={() => setSelectedStudent(null)}
             className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition font-bold"
           >
             <ArrowLeft size={20} /> عودة للقائمة
           </button>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Profile & Trend */}
              <div className="lg:col-span-1 space-y-6">
                 <Card className="text-center p-8 bg-gradient-to-b from-white to-slate-50 border-t-4 border-t-teal-500">
                    <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-3xl font-bold mx-auto mb-4">
                      {selectedStudent.fullName.charAt(0)}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedStudent.fullName}</h2>
                    <p className="text-slate-500 text-sm mb-6">{selectedStudent.parentName}</p>
                    
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">المعدل العام</p>
                        <p className="text-2xl font-black text-slate-800">{currentStudentAnalysis.averageScore}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">المستوى</p>
                        <p className={`text-xl font-black ${
                          currentStudentAnalysis.generalLevel === 'ضعيف' ? 'text-red-500' : 'text-green-600'
                        }`}>{currentStudentAnalysis.generalLevel}</p>
                      </div>
                    </div>
                 </Card>

                 <Card>
                   <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                     <TrendingUp size={18} /> تطور الأداء
                   </h4>
                   <div className="h-48 w-full text-xs">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={getTrendData(selectedStudent.id, classes.find(c => c.id === selectedClassId)!.level)}>
                         <defs>
                           <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                             <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                         <XAxis dataKey="name" />
                         <YAxis domain={[0, 20]} />
                         <Tooltip />
                         <Area type="monotone" dataKey="avg" stroke="#0d9488" fillOpacity={1} fill="url(#colorAvg)" />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                 </Card>
              </div>

              {/* Right Column: Deep Analysis & Recommendations */}
              <div className="lg:col-span-2 space-y-6">
                 {/* Recommendations */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-indigo-50 border border-indigo-100">
                      <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                        <BookOpen size={20} /> توصيات للمعلم
                      </h4>
                      <p className="text-indigo-800 text-sm leading-relaxed">
                        {currentStudentAnalysis.teacherRecommendation}
                      </p>
                    </Card>
                    <Card className="bg-orange-50 border border-orange-100">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-orange-900 flex items-center gap-2">
                           <UserCheck size={20} /> رسالة للولي
                        </h4>
                        {selectedStudent.parentPhone && (
                           <button 
                             onClick={handleSendWhatsApp}
                             className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold hover:bg-green-200 transition"
                             title="إرسال التوصية عبر واتساب"
                           >
                              <MessageCircle size={14} /> إرسال
                           </button>
                        )}
                      </div>
                      <p className="text-orange-800 text-sm leading-relaxed mb-2">
                        {currentStudentAnalysis.parentRecommendation}
                      </p>
                      {selectedStudent.parentPhone && (
                        <p className="text-[10px] text-orange-400 mt-2 text-left">
                          رقم الهاتف: {selectedStudent.parentPhone}
                        </p>
                      )}
                    </Card>
                 </div>

                 {/* Strengths & Weaknesses */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                       <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                         <Star className="text-yellow-400 fill-yellow-400" size={20} /> نقاط القوة
                       </h4>
                       <div className="flex flex-wrap gap-2">
                         {currentStudentAnalysis.strengths.length > 0 ? (
                           currentStudentAnalysis.strengths.map(s => (
                             <span key={s} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-green-100">
                               {s}
                             </span>
                           ))
                         ) : <span className="text-slate-400 text-sm">لا توجد نقاط بارزة</span>}
                       </div>
                    </Card>
                    <Card>
                       <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                         <AlertTriangle className="text-red-500" size={20} /> نقاط تحتاج لتحسين
                       </h4>
                       <div className="flex flex-wrap gap-2">
                         {currentStudentAnalysis.weaknesses.length > 0 ? (
                           currentStudentAnalysis.weaknesses.map(s => (
                             <span key={s} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-red-100">
                               {s}
                             </span>
                           ))
                         ) : <span className="text-slate-400 text-sm">لا توجد نقاط ضعف حرجة</span>}
                       </div>
                    </Card>
                 </div>

                 {/* Attendance Alert if critical */}
                 {currentStudentAnalysis.attendanceRate < 80 && (
                   <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-r shadow-sm flex items-start gap-3">
                      <AlertCircle className="text-red-600 mt-1" />
                      <div>
                        <h4 className="font-bold text-red-800">تنبيه الحضور</h4>
                        <p className="text-sm text-red-700 mt-1">
                          نسبة الحضور {currentStudentAnalysis.attendanceRate}% وهي أقل من الحد المقبول (80%). 
                          هذا يؤثر بشكل مباشر على التحصيل الدراسي.
                        </p>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
