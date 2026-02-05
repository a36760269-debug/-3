import React, { useState } from 'react';
import { 
  calculateExamTermStats, 
  generateAnnualReport,
  calculateAttendanceStats
} from '../services/mathService';
import { 
  ResultType,
  Student
} from '../types';
import { SUBJECT_NAMES, SUBJECT_NAMES_FR } from '../constants';
import { Save, Printer, FileDown, GraduationCap, Table, Calculator, Eye, SortAsc, SortDesc, ClipboardList, Layers } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import StudentAnalysisModal from '../components/StudentAnalysisModal';
import { useGradesManager } from '../hooks/useGradesManager';

const GradesManager = () => {
  const { 
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
  } = useGradesManager();

  const [isExporting, setIsExporting] = useState(false);
  const [analysisTarget, setAnalysisTarget] = useState<Student | null>(null);

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    const element = document.getElementById('grades-report');
    if (!element) return;
    setIsExporting(true);
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const ratio = pdfWidth / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, canvas.height * ratio);
        pdf.save(`report_${selectedClass?.name}_${selectedType}_${selectedTerm}.pdf`);
      } catch (err) { alert("حدث خطأ أثناء تصدير PDF"); } 
      finally { setIsExporting(false); }
    }, 100);
  };

  return (
    <div className="space-y-6 print:p-0">
      <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6 print:hidden">
        <GraduationCap className="text-teal-600" size={28} />
        <span>النتائج والتقويم</span>
      </h2>

      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 print:hidden">
        
        {/* Top Row: Class & View Mode */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-center">
          <div className="flex gap-4 w-full xl:w-auto">
             <select 
              className="border border-slate-200 p-2.5 rounded-xl w-full md:w-64 focus:ring-2 focus:ring-teal-500 outline-none"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
            >
              <option value="">اختر الفصل...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="flex bg-slate-100 p-1 rounded-xl">
               <button 
                  onClick={() => setViewMode('term')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'term' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}
               >
                 <Table size={16}/> إدخال الدرجات
               </button>
               <button 
                  onClick={() => {
                    setViewMode('annual');
                    if (selectedType !== ResultType.EXAM) setSelectedType(ResultType.EXAM);
                  }} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'annual' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}
               >
                 <Calculator size={16}/> الحصيلة السنوية
               </button>
            </div>
          </div>

          <div className="flex gap-2 w-full xl:w-auto justify-end">
            {viewMode === 'term' && (
              <button onClick={handleSave} className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-600/20 active:scale-95 transition font-bold">
                <Save size={18} /> <span>حفظ النتائج</span>
              </button>
            )}
            <button onClick={handleExportPDF} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-100 transition">
              <FileDown size={18} />
            </button>
            {selectedType === ResultType.EXAM && (
               <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-200 transition">
                 <Printer size={18} />
               </button>
            )}
          </div>
        </div>

        {/* Second Row: Filters (Only in Term Mode) */}
        {viewMode === 'term' && (
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-slate-100 pt-4">
             
             {/* TYPE SELECTOR TABS */}
             <div className="flex bg-slate-100 p-1.5 rounded-xl w-full md:w-auto">
               <button 
                 onClick={() => setSelectedType(ResultType.EXAM)}
                 className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${selectedType === ResultType.EXAM ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <GraduationCap size={16}/> الامتحانات
               </button>
               <button 
                 onClick={() => setSelectedType(ResultType.TEST)}
                 className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${selectedType === ResultType.TEST ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <ClipboardList size={16}/> الفروض
               </button>
               <button 
                 onClick={() => setSelectedType(ResultType.EXERCISE)}
                 className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${selectedType === ResultType.EXERCISE ? 'bg-green-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Layers size={16}/> التمارين
               </button>
             </div>

             {/* Term & Sort */}
             <div className="flex gap-4 w-full md:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-xl flex-1 md:flex-none">
                  {[1, 2, 3].map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTerm(t as 1|2|3)}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedTerm === t ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}
                    >
                      الفصل {t}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                   <button onClick={() => setSortBy('name')} className={`p-2 rounded-lg ${sortBy === 'name' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-400'}`} title="ترتيب أبجدي"><SortAsc size={20} /></button>
                   <button onClick={() => setSortBy('average')} className={`p-2 rounded-lg ${sortBy === 'average' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-400'}`} title="ترتيب حسب المعدل"><SortDesc size={20} /></button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {selectedClassId ? (
        <>
          {/* ----- SCREEN VIEW ----- */}
          <div id="grades-report" className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:hidden p-4">
             <div className={`${isExporting ? 'block' : 'hidden'} p-8 text-center border-b-2 border-black mb-4`}>
                <h1 className="text-2xl font-bold">
                  كشف {selectedType === ResultType.EXAM ? 'الامتحانات' : selectedType === ResultType.TEST ? 'الاختبارات' : 'التمارين'} - {selectedClass?.name}
                </h1>
                <p>الفصل الدراسي {selectedTerm}</p>
             </div>

             <div className="overflow-x-auto">
              {viewMode === 'term' ? (
                // TERM VIEW TABLE
                <table className="w-full text-sm text-right border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4 border-l border-slate-200 sticky right-0 bg-slate-50 min-w-[180px]">التلميذ</th>
                      {subjectKeys.map(key => (
                        <th key={key} className="p-2 border-l border-slate-200 text-center min-w-[90px]">
                          <div className="flex flex-col">
                            <span className="text-slate-800">{SUBJECT_NAMES[key] || key}</span>
                            <span className="text-[10px] text-slate-400 font-normal">/{subjects[key]}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center bg-slate-50 min-w-[80px]">المجموع</th>
                      
                      {selectedType === ResultType.EXAM && (
                        <>
                          <th className="p-3 text-center bg-yellow-50/50 min-w-[80px]">المعدل</th>
                          <th className="p-3 text-center bg-slate-50 min-w-[60px]">الرتبة</th>
                        </>
                      )}
                      
                      <th className="p-3 text-center bg-slate-50 min-w-[50px]">تحليل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedStudents.map((student) => {
                      const stats = termStats[student.id] || {};
                      return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 border-l border-slate-100 font-medium sticky right-0 bg-white text-slate-800">
                            {student.fullName}
                          </td>
                          {subjectKeys.map(key => (
                            <td key={key} className="p-2 border-l border-slate-100 text-center">
                              <input 
                                type="number" min="0" max={subjects[key]}
                                value={localGrades[`${student.id}-${key}`] ?? ''}
                                onChange={e => handleGradeChange(student.id, key, e.target.value)}
                                className={`w-full text-center bg-transparent outline-none rounded p-1 font-mono text-slate-600 focus:bg-blue-50 focus:text-blue-700 font-bold`}
                              />
                            </td>
                          ))}
                          <td className="p-3 text-center font-bold text-slate-700">{stats.totalScore ?? '-'}</td>
                          
                          {selectedType === ResultType.EXAM && (
                            <>
                              <td className={`p-3 text-center font-bold ${stats.average < 10 ? 'text-red-500' : 'text-green-600'}`}>
                                {stats.average ?? '-'}
                              </td>
                              <td className="p-3 text-center font-bold text-blue-600">{stats.rank ?? '-'}</td>
                            </>
                          )}
                          
                          <td className="p-2 text-center">
                             <button 
                               onClick={() => setAnalysisTarget(student)}
                               className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                             >
                               <Eye size={18} />
                             </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                // ANNUAL VIEW TABLE
                <div className="space-y-4">
                  {selectedType !== ResultType.EXAM && (
                     <div className="bg-yellow-50 p-3 rounded text-yellow-800 text-sm mb-2 text-center">
                       ⚠️ يتم حساب الحصيلة السنوية بناءً على نتائج <strong>الامتحانات</strong> فقط.
                     </div>
                  )}
                  <table className="w-full text-sm text-right border-collapse min-w-[800px]">
                    <thead className="bg-purple-50 text-purple-900 font-bold border-b border-purple-200">
                      <tr>
                        <th className="p-4 border-l border-purple-200 sticky right-0 bg-purple-50 w-1/4">التلميذ</th>
                        <th className="p-3 border-l border-purple-200 text-center">معدل ف1</th>
                        <th className="p-3 border-l border-purple-200 text-center">معدل ف2</th>
                        <th className="p-3 border-l border-purple-200 text-center">معدل ف3</th>
                        <th className="p-3 border-l border-purple-200 text-center bg-yellow-100/50 text-lg">المعدل السنوي</th>
                        <th className="p-3 border-l border-purple-200 text-center">الرتبة</th>
                        <th className="p-3 text-center">القرار</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                       {annualReport.map((row) => {
                         const student = students.find(s => s.id === row.studentId);
                         if (!student) return null;
                         return (
                           <tr key={row.studentId} className="hover:bg-purple-50/30">
                             <td className="p-4 border-l border-slate-100 font-bold text-slate-800 sticky right-0 bg-white">
                               {student.fullName}
                             </td>
                             <td className="p-3 border-l border-slate-100 text-center text-slate-500">{row.term1Avg}</td>
                             <td className="p-3 border-l border-slate-100 text-center text-slate-500">{row.term2Avg}</td>
                             <td className="p-3 border-l border-slate-100 text-center text-slate-500">{row.term3Avg}</td>
                             <td className={`p-3 border-l border-slate-100 text-center font-black text-lg ${row.annualAvg >= 10 ? 'text-green-700' : 'text-red-600'}`}>
                               {row.annualAvg}
                             </td>
                             <td className="p-3 border-l border-slate-100 text-center font-bold text-blue-600">
                               {row.rank}
                             </td>
                             <td className="p-3 text-center">
                               <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.decision === 'ينتقل' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                 {row.decision}
                               </span>
                             </td>
                           </tr>
                         )
                       })}
                    </tbody>
                  </table>
                </div>
              )}
             </div>
          </div>

          {/* ----- OFFICIAL PRINT TEMPLATE ----- */}
          {selectedType === ResultType.EXAM && (
            <div className="hidden print:block text-black bg-white" dir="ltr">
               {students.map((student) => {
                  const sResults = results.filter(r => r.studentId === student.id && r.type === ResultType.EXAM);
                  const t1 = calculateExamTermStats(sResults, selectedClass.level, 1);
                  const t2 = calculateExamTermStats(sResults, selectedClass.level, 2);
                  const t3 = calculateExamTermStats(sResults, selectedClass.level, 3);
                  
                  const currentTermStats = termStats[student.id] || {};
                  const studentAttendance = attendance.filter(a => a.studentId === student.id);
                  const attStats = calculateAttendanceStats(studentAttendance);

                  return (
                    <div key={student.id} className="p-8 h-screen flex flex-col relative" style={{breakAfter: 'page'}}>
                       {/* Header */}
                       <div className="flex justify-between items-start mb-4 border-b pb-4">
                          <div className="text-left text-xs font-bold">
                             <p>République Islamique de Mauritanie</p>
                             <p>Honneur Fraternité Justice</p>
                             <p>Ministère de l'éducation et de RSE</p>
                             <p className="mt-2">DREN de: <span className="font-normal">{teacherProfile?.district || '.......'}</span></p>
                             <p>IDEN de: <span className="font-normal">{teacherProfile?.district || '.......'}</span></p>
                             <p>Ecole: <span className="font-normal">{teacherProfile?.schoolName || '.......'}</span></p>
                          </div>
                          <div className="text-center">
                             <div className="w-20 h-20 rounded-full border-2 border-slate-300 flex items-center justify-center mx-auto opacity-50">
                                <span className="text-[10px]">SEAL</span>
                             </div>
                          </div>
                          <div className="text-right text-xs font-bold" dir="rtl">
                             <p>الجمهورية الإسلامية الموريتانية</p>
                             <p>شرف - إخاء - عدل</p>
                             <p>وزارة التربية وإصلاح النظام التعليمي</p>
                             <p className="mt-2">الإدارة الجهوية للتربية في: <span className="font-normal">{teacherProfile?.district || '.......'}</span></p>
                             <p>مفتشية مقاطعة: <span className="font-normal">{teacherProfile?.district || '.......'}</span></p>
                             <p>مدرسة: <span className="font-normal">{teacherProfile?.schoolName || '.......'}</span></p>
                          </div>
                       </div>

                       <div className="border-2 border-black p-2 mb-4 flex justify-between items-center text-sm">
                          <div className="w-1/4">RIM: {student.rimNumber || student.id.slice(0, 6)}</div>
                          <div className="flex-1 text-center font-bold">
                             <p>{selectedTerm}ème trimestre {selectedClass?.academicYear}</p>
                             <p>Relevé de la classe {selectedClass?.name}</p>
                          </div>
                          <div className="w-1/4 text-right" dir="rtl">
                             الاسم: <span className="font-bold">{student.fullName}</span>
                          </div>
                       </div>

                       <div className="flex-1">
                         <table className="w-full border-collapse border border-black text-sm">
                            <thead>
                               <tr className="bg-gray-100">
                                  <th className="border border-black p-1 text-left w-1/3">Les Matières</th>
                                  <th className="border border-black p-1 text-center w-20">Les Notes</th>
                                  <th className="border border-black p-1 text-center w-20" dir="rtl">الدرجات</th>
                                  <th className="border border-black p-1 text-right w-1/3" dir="rtl">المواد</th>
                               </tr>
                            </thead>
                            <tbody>
                               {subjectKeys.map(key => {
                                  const rawVal = localGrades[`${student.id}-${key}`];
                                  const localScore = (typeof rawVal === 'string' && rawVal !== '') ? parseFloat(rawVal) : (typeof rawVal === 'number' ? rawVal : 0);
                                  const dbRes = sResults.find(r => r.subjectKey === key && Number(r.term) === Number(selectedTerm));
                                  const score = dbRes ? dbRes.score : localScore;
                                  const max = subjects[key];
                                  return (
                                     <tr key={key}>
                                        <td className="border border-black p-1 text-left font-medium">{SUBJECT_NAMES_FR[key]}</td>
                                        <td className="border border-black p-1 text-center"> {score} / {max} </td>
                                        <td className="border border-black p-1 text-center font-bold"> {score} </td>
                                        <td className="border border-black p-1 text-right font-medium" dir="rtl">{SUBJECT_NAMES[key]}</td>
                                     </tr>
                                  )
                               })}
                            </tbody>
                         </table>
                       </div>

                       <div className="mt-4 flex flex-row gap-0 text-sm border border-black">
                          <div className="w-1/3 border-r border-black p-2 space-y-2">
                              <div className="flex justify-between border-b border-gray-300 pb-1">
                                <span>M. 1er trimestre</span> <span className="font-bold">{t1.average || '-'}</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-300 pb-1">
                                <span>M. 2ème trimestre</span> <span className="font-bold">{t2.average || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>M. 3ème trimestre</span> <span className="font-bold">{t3.average || '-'}</span>
                              </div>
                          </div>

                          <div className="w-1/3 border-r border-black p-2 space-y-2">
                             <div className="flex justify-between border-b border-gray-300 pb-1">
                                <span>Assiduité</span> <span className="font-bold">{attStats.presentRate}%</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-300 pb-1">
                                <span>Moyen Général</span> 
                                <span className="font-bold text-lg">{
                                  selectedTerm === 1 ? t1.average : selectedTerm === 2 ? t2.average : t3.average
                                }</span>
                             </div>
                             <div className="flex justify-between">
                                <span>Rang</span> <span className="font-bold">{currentTermStats?.rank || '-'}</span>
                             </div>
                          </div>

                          <div className="w-1/3 p-2 text-right" dir="rtl">
                             <p className="font-bold underline mb-1">الملاحظات:</p>
                             <p className="text-xs text-slate-500">
                               {generateAnnualReport([student], results, selectedClass.level)[0]?.decision || ''}
                             </p>
                          </div>
                       </div>
                       
                       <div className="flex justify-between mt-8 px-8 mb-4">
                          <div className="text-center"><p>Le directeur</p></div>
                          <div className="text-center"><p>L'Enseignant</p></div>
                       </div>
                    </div>
                  );
               })}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
           <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
           <p className="text-slate-500">اختر فصلاً وفصلاً دراسياً للبدء</p>
        </div>
      )}

      {/* Analysis Modal */}
      {analysisTarget && selectedClass && (
        <StudentAnalysisModal 
          student={analysisTarget}
          results={results} 
          attendance={attendance}
          classLevel={selectedClass.level}
          onClose={() => setAnalysisTarget(null)}
        />
      )}
    </div>
  );
};

export default GradesManager;