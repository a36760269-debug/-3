
import React, { useState, useEffect } from 'react';
import { 
  X, TrendingUp, TrendingDown, Minus, 
  BrainCircuit, Star, AlertTriangle, UserCheck, CheckCircle, RefreshCw,
  Save, Edit
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Student, Result, AttendanceRecord, ClassLevel } from '../types';
import { generateComprehensiveAnalysis } from '../services/mathService';
import { analyzeStudentPerformance } from '../services/geminiService';
import { getStudentNote, saveStudentNote } from '../services/storageService';
import { Button } from './Shared';

interface Props {
  student: Student;
  results: Result[];
  attendance: AttendanceRecord[];
  classLevel: ClassLevel;
  onClose: () => void;
}

const StudentAnalysisModal: React.FC<Props> = ({ student, results, attendance, classLevel, onClose }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // 1. Generate Rule-Based Analysis
  useEffect(() => {
    const data = generateComprehensiveAnalysis(student.id, results, attendance, classLevel);
    setAnalysis(data);
  }, [student, results, attendance, classLevel]);

  // 2. Load existing note
  useEffect(() => {
    getStudentNote(student.id).then(setCustomNote);
  }, [student.id]);

  // 3. Auto-Trigger AI Analysis when basic analysis is ready
  useEffect(() => {
    if (analysis && !aiAnalysis && !loadingAi) {
      handleAiAnalysis(analysis);
    }
  }, [analysis]);

  const handleAiAnalysis = async (currentAnalysis: any = analysis) => {
    if (!currentAnalysis) return;
    
    setLoadingAi(true);
    // Prepare simplified data for AI to save tokens
    const gradesForAi = results
      .filter(r => r.studentId === student.id)
      .map(r => ({ subject: r.subjectKey, score: r.score, total: r.maxScore }));
    
    const text = await analyzeStudentPerformance(
      student.fullName, 
      gradesForAi, 
      currentAnalysis.attendanceRate,
      currentAnalysis.strengths,
      currentAnalysis.weaknesses
    );
    
    setAiAnalysis(text);
    setLoadingAi(false);
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await saveStudentNote(student.id, customNote);
    } catch (e) {
      console.error(e);
      alert('خطأ أثناء الحفظ');
    } finally {
      setIsSavingNote(false);
    }
  };

  if (!analysis) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-up border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-start sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="text-teal-400" />
              {student.fullName}
            </h2>
            <p className="text-slate-400 text-sm mt-1">بطاقة التحليل الشامل للأداء</p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border-l-4 shadow-sm ${
              analysis.generalLevel === 'ضعيف' ? 'bg-red-50 border-red-500' : 
              analysis.generalLevel === 'جيد' ? 'bg-blue-50 border-blue-500' : 
              analysis.generalLevel === 'ممتاز' ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'
            }`}>
              <p className="text-slate-500 text-xs font-bold mb-1">المستوى العام</p>
              <p className="text-xl font-black text-slate-800">{analysis.generalLevel}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-slate-500 text-xs font-bold mb-1">المعدل الحالي</p>
              <p className="text-xl font-black text-teal-600">{analysis.averageScore}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-slate-500 text-xs font-bold mb-1">نسبة الحضور</p>
              <p className={`text-xl font-black ${analysis.attendanceRate < 80 ? 'text-red-500' : 'text-slate-800'}`}>
                {analysis.attendanceRate}%
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center items-center">
              <p className="text-slate-500 text-xs font-bold mb-1 w-full text-right">الاتجاه</p>
              {analysis.trend === 'UP' && <div className="flex items-center gap-1 text-green-600 font-bold"><TrendingUp /> صعود</div>}
              {analysis.trend === 'DOWN' && <div className="flex items-center gap-1 text-red-500 font-bold"><TrendingDown /> تراجع</div>}
              {analysis.trend === 'STABLE' && <div className="flex items-center gap-1 text-yellow-600 font-bold"><Minus /> مستقر</div>}
            </div>
          </div>

          {/* Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Rule-Based Recommendations */}
            <div className="space-y-4">
              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                  <CheckCircle size={18}/> توصيات النظام
                </h3>
                <p className="text-sm text-indigo-800 leading-relaxed">
                  {analysis.teacherRecommendation}
                </p>
              </div>

              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                  <UserCheck size={18}/> رسالة للولي
                </h3>
                <p className="text-sm text-orange-800 leading-relaxed">
                  {analysis.parentRecommendation}
                </p>
              </div>

              {/* Custom Teacher Note Field */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Edit size={16}/> ملاحظات إضافية (تحفظ تلقائياً)</span>
                    {isSavingNote && <span className="text-xs text-teal-600 animate-pulse">جاري الحفظ...</span>}
                 </h3>
                 <textarea 
                   className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm text-slate-700 resize-none"
                   rows={3}
                   placeholder="اكتب ملاحظات خاصة لولي الأمر هنا..."
                   value={customNote}
                   onChange={e => setCustomNote(e.target.value)}
                   onBlur={handleSaveNote}
                 />
                 <div className="flex justify-end mt-2">
                   <Button onClick={handleSaveNote} disabled={isSavingNote} className="text-xs px-3 py-1 h-8 bg-slate-800 hover:bg-slate-700 text-white">
                      <Save size={14} /> حفظ الملاحظة
                   </Button>
                 </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="space-y-4">
              <div className="border border-slate-100 rounded-2xl p-4">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                   <Star className="text-yellow-400 fill-yellow-400" size={18} /> نقاط القوة
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.strengths.length > 0 ? (
                    analysis.strengths.map((s: string) => (
                      <span key={s} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                        {s}
                      </span>
                    ))
                  ) : <span className="text-slate-400 text-xs">لا توجد نقاط قوة بارزة حالياً</span>}
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl p-4">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                   <AlertTriangle className="text-red-400" size={18} /> نقاط تحتاج لتحسين
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.weaknesses.length > 0 ? (
                    analysis.weaknesses.map((s: string) => (
                      <span key={s} className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                        {s}
                      </span>
                    ))
                  ) : <span className="text-slate-400 text-xs">لا توجد نقاط ضعف حرجة</span>}
                </div>
              </div>
            </div>
          </div>

          {/* AI Enhancement Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <BrainCircuit className="text-purple-600" />
                المستشار التربوي الذكي
              </h3>
              <Button onClick={() => handleAiAnalysis(analysis)} disabled={loadingAi} className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200">
                 {loadingAi ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                 <span>تحديث التحليل</span>
              </Button>
            </div>
            
            {loadingAi ? (
              <div className="bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 gap-3 animate-pulse">
                <BrainCircuit size={32} className="text-purple-400" />
                <p>جاري تحليل نقاط القوة والضعف واقتراح الخطة العلاجية...</p>
              </div>
            ) : aiAnalysis ? (
              <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 text-slate-800 leading-loose animate-fade-in text-sm whitespace-pre-line shadow-inner">
                {aiAnalysis}
              </div>
            ) : (
              <div className="text-center text-slate-400 p-4">
                في انتظار التحليل...
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentAnalysisModal;
