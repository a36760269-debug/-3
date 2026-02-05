import React, { useState, useEffect, useMemo } from 'react';
import { 
  getClasses, 
  getStudents, 
  getResults, 
  getAttendance, 
  getTeacherProfile 
} from '../services/storageService';
import { 
  calculateExamTermStats, 
  calculateAttendanceStats,
  generateAnnualReport,
  calculateAnnualAverage,
  getStudentTermGrades // Imported new helper
} from '../services/mathService';
import { 
  ClassEntity, 
  Student, 
  ResultType, 
  AttendanceStatus 
} from '../types';
import { 
  LEVEL_CONFIG, 
  SUBJECT_NAMES, 
  SUBJECT_NAMES_FR 
} from '../constants';
import { 
  FileText, 
  Calendar, 
  GraduationCap, 
  Printer, 
  X, 
  Filter, 
  FileDown,
  Loader2
} from 'lucide-react';
import { SectionTitle, Card, Button } from '../components/Shared';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type ReportType = 'GRADES_SUMMARY' | 'ATTENDANCE_REGISTER' | 'INDIVIDUAL_BULK';

const ReportsPage = () => {
  // State
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>('GRADES_SUMMARY');
  const [selectedTerm, setSelectedTerm] = useState<1 | 2 | 3>(1);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  
  // Data State
  const [previewData, setPreviewData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    getClasses().then(setClasses);
    getTeacherProfile().then(setTeacherProfile);
  }, []);

  const generateReport = async () => {
    if (!selectedClassId) return alert("الرجاء اختيار الفصل");
    setIsGenerating(true);
    setPreviewData(null);

    const cls = classes.find(c => c.id === selectedClassId);
    const students = await getStudents(selectedClassId);
    
    // Artificial delay for UX
    setTimeout(async () => {
      // Fetch only EXAM results initially to adhere to rules
      const results = await getResults(selectedClassId, ResultType.EXAM);
      const subjects = LEVEL_CONFIG[cls!.level];

      if (reportType === 'GRADES_SUMMARY') {
        const reportRows = students.map(student => {
          const sResults = results.filter(r => r.studentId === student.id);
          const stats = calculateExamTermStats(sResults, cls!.level, selectedTerm);
          // Use centralized helper
          const subjectScores = getStudentTermGrades(sResults, selectedTerm);

          return {
            student,
            scores: subjectScores,
            total: stats.totalScore,
            average: stats.average
          };
        });

        reportRows.sort((a, b) => b.average - a.average);

        setPreviewData({
          type: 'GRADES_SUMMARY',
          class: cls,
          rows: reportRows,
          subjects: Object.keys(subjects),
          term: selectedTerm
        });
      } 
      else if (reportType === 'ATTENDANCE_REGISTER') {
        const allAttendance = await getAttendance(selectedClassId);
        const monthlyRecords = allAttendance.filter(r => r.date.startsWith(selectedMonth));
        
        const reportRows = students.map(student => {
          const sRecords = monthlyRecords.filter(r => r.studentId === student.id);
          const present = sRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
          const absent = sRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
          const late = sRecords.filter(r => r.status === AttendanceStatus.LATE).length;
          const totalRecorded = sRecords.length;
          const rate = totalRecorded > 0 ? Math.round((present / totalRecorded) * 100) : '-';

          return { student, present, absent, late, rate };
        });

        setPreviewData({
          type: 'ATTENDANCE_REGISTER',
          class: cls,
          rows: reportRows,
          month: selectedMonth
        });
      }
      else if (reportType === 'INDIVIDUAL_BULK') {
        // Calculate ranks
        const studentTermStats = students.map(s => {
          const sResults = results.filter(r => r.studentId === s.id);
          const stats = calculateExamTermStats(sResults, cls!.level, selectedTerm);
          return { studentId: s.id, average: stats.average };
        });
        
        studentTermStats.sort((a, b) => b.average - a.average);
        
        const rankMap = new Map<string, number>();
        let currentRank = 1;
        studentTermStats.forEach((item, index) => {
            if (index > 0 && item.average < studentTermStats[index - 1].average) {
                currentRank = index + 1;
            }
            rankMap.set(item.studentId, currentRank);
        });
        
        const reportRows = students.map(student => {
            const sResults = results.filter(r => r.studentId === student.id);
            
            // Calculate historical stats
            const t1 = calculateExamTermStats(sResults, cls!.level, 1);
            const t2 = calculateExamTermStats(sResults, cls!.level, 2);
            const t3 = calculateExamTermStats(sResults, cls!.level, 3);
            const currentStats = calculateExamTermStats(sResults, cls!.level, selectedTerm);
            
            // CRITICAL: Extract detailed grades using the specialized math helper
            // This ensures strict filtering by type=EXAM and term=selectedTerm
            const gradesMap = getStudentTermGrades(sResults, selectedTerm);

            const annualReport = generateAnnualReport([student], results, cls!.level);
            
            return {
                student,
                grades: gradesMap, // Clean map { subject: score }
                stats: { 
                  t1, t2, t3, 
                  current: currentStats,
                  rank: rankMap.get(student.id) || '-'
                },
                decision: annualReport[0]?.decision || ''
            };
        });

        reportRows.sort((a, b) => a.student.fullName.localeCompare(b.student.fullName, 'ar'));

        setPreviewData({
          type: 'INDIVIDUAL_BULK',
          class: cls,
          rows: reportRows,
          term: selectedTerm,
          subjects: LEVEL_CONFIG[cls!.level]
        });
      }

      setIsGenerating(false);
    }, 500);
  };

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    if (!previewData) return;
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const elements = document.querySelectorAll('.print-page');
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        if (i < elements.length - 1) doc.addPage();
      }
      doc.save(`Reports_${previewData.class.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      alert("حدث خطأ أثناء إنشاء ملف PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 🖨️ PRINT SPECIFIC STYLES */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; background: white; }
          body * { visibility: hidden; }
          #print-content, #print-content * { visibility: visible; }
          #print-content { position: absolute; left: 0; top: 0; width: 100%; }
          .print-page {
            width: 210mm; height: 297mm; page-break-after: always;
            page-break-inside: avoid; padding: 10mm; position: relative;
            display: flex; flex-direction: column; background: white;
          }
          .print-page:last-child { page-break-after: auto; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <SectionTitle title="مركز التقارير والكشوف" icon={FileText} />

      {/* --- CONTROL PANEL (Hidden on Print) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        <Card className="col-span-1 space-y-4">
          <h3 className="font-bold text-slate-700 border-b pb-2">نوع الوثيقة</h3>
          <div className="space-y-2">
            <button 
              onClick={() => setReportType('GRADES_SUMMARY')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${reportType === 'GRADES_SUMMARY' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              <FileText size={20} />
              <div className="text-right">
                <div className="font-bold">محضر النتائج الجماعي</div>
                <div className="text-xs opacity-80">لائحة نتائج القسم مرتبة</div>
              </div>
            </button>
            <button 
              onClick={() => setReportType('ATTENDANCE_REGISTER')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${reportType === 'ATTENDANCE_REGISTER' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              <Calendar size={20} />
              <div className="text-right">
                <div className="font-bold">سجل الحضور الشهري</div>
                <div className="text-xs opacity-80">إحصائيات الغياب والحضور</div>
              </div>
            </button>
            <button 
              onClick={() => setReportType('INDIVIDUAL_BULK')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${reportType === 'INDIVIDUAL_BULK' ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              <GraduationCap size={20} />
              <div className="text-right">
                <div className="font-bold">كشوف الدرجات الفردية</div>
                <div className="text-xs opacity-80">توليد الكشوف لجميع تلاميذ القسم</div>
              </div>
            </button>
          </div>
        </Card>

        <Card className="col-span-1 lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-700 border-b pb-2 flex items-center gap-2">
            <Filter size={18} /> الإعدادات
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-500 block mb-1">الفصل الدراسي (القسم)</label>
              <select 
                className="w-full border p-3 rounded-xl bg-white focus:ring-2 focus:ring-teal-500"
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
              >
                <option value="">-- اختر الفصل --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {reportType !== 'ATTENDANCE_REGISTER' ? (
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1">الفترة التقويمية</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {[1, 2, 3].map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTerm(t as 1|2|3)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${selectedTerm === t ? 'bg-white shadow text-teal-700' : 'text-slate-400'}`}
                    >
                      الفصل {t}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1">الشهر</label>
                <input 
                  type="month" 
                  className="w-full border p-3 rounded-xl bg-white focus:ring-2 focus:ring-teal-500"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="pt-4 flex flex-wrap justify-end gap-3">
             {previewData && (
               <>
                 <Button onClick={handleExportPDF} variant="outline" disabled={isExportingPDF} className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">
                   {isExportingPDF ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18} />}
                   {isExportingPDF ? 'جاري التحويل...' : 'تصدير PDF'}
                 </Button>
                 <Button onClick={handlePrint} variant="secondary" className="gap-2">
                   <Printer size={18} /> طباعة
                 </Button>
               </>
             )}
             <Button onClick={generateReport} disabled={isGenerating} className="gap-2 min-w-[150px]">
               {isGenerating ? 'جاري الإعداد...' : 'توليد الوثيقة'}
             </Button>
          </div>
        </Card>
      </div>

      {/* --- PREVIEW AREA --- */}
      {previewData && (
        <div id="print-content" className="mt-8 mx-auto w-full max-w-[210mm] print:max-w-none print:w-full">
           
           {/* 1. GRADES SUMMARY TEMPLATE */}
           {previewData.type === 'GRADES_SUMMARY' && (
             <div className="print-page bg-white shadow-2xl print:shadow-none min-h-[297mm]">
               <OfficialHeader teacher={teacherProfile} className="mb-6" />
               <div className="text-center mb-6">
                 <h2 className="text-xl font-black underline mb-2">محضر النتائج الفصلي</h2>
                 <p className="font-bold">
                   القسم: {previewData.class.name} | الفصل الدراسي: {previewData.term} | السنة الدراسية: {previewData.class.academicYear}
                 </p>
               </div>
               <table className="w-full border-collapse border border-black text-center text-xs">
                 <thead className="bg-gray-100">
                   <tr>
                     <th className="border border-black p-1 w-8">ر.ت</th>
                     <th className="border border-black p-1 text-right w-40">الاسم الكامل</th>
                     <th className="border border-black p-1 text-center font-mono w-24">رقم RIM</th>
                     {previewData.subjects.map((sub: string) => (
                       <th key={sub} className="border border-black p-1 rotate-[-90deg] h-24 w-8 font-normal">
                         <div className="translate-y-8">{SUBJECT_NAMES[sub]}</div>
                       </th>
                     ))}
                     <th className="border border-black p-1 bg-gray-200 font-bold w-12">المجموع</th>
                     <th className="border border-black p-1 bg-gray-200 font-bold w-12">المعدل</th>
                     <th className="border border-black p-1 w-10">الرتبة</th>
                   </tr>
                 </thead>
                 <tbody>
                   {previewData.rows.map((row: any, idx: number) => (
                     <tr key={row.student.id} className="h-8">
                       <td className="border border-black">{idx + 1}</td>
                       <td className="border border-black text-right px-2 font-bold">{row.student.fullName}</td>
                       <td className="border border-black font-mono text-[10px]">{row.student.rimNumber || '-'}</td>
                       {previewData.subjects.map((sub: string) => (
                         <td key={sub} className="border border-black">
                           {typeof row.scores[sub] === 'number' ? row.scores[sub] : '-'}
                         </td>
                       ))}
                       <td className="border border-black font-bold bg-gray-50">{row.total}</td>
                       <td className={`border border-black font-bold bg-gray-50 ${row.average < 10 ? 'text-red-600' : ''}`}>{row.average}</td>
                       <td className="border border-black font-bold">{idx + 1}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div className="mt-auto">
                <OfficialFooter teacher={teacherProfile} className="mt-12" />
               </div>
             </div>
           )}

           {/* 2. ATTENDANCE REGISTER TEMPLATE */}
           {previewData.type === 'ATTENDANCE_REGISTER' && (
             <div className="print-page bg-white shadow-2xl print:shadow-none min-h-[297mm]">
               <OfficialHeader teacher={teacherProfile} className="mb-6" />
               <div className="text-center mb-6">
                 <h2 className="text-xl font-black underline mb-2">جدول إحصائيات الحضور الشهري</h2>
                 <p className="font-bold">
                   القسم: {previewData.class.name} | الشهر: {previewData.month} | السنة الدراسية: {previewData.class.academicYear}
                 </p>
               </div>
               <table className="w-full border-collapse border border-black text-center text-sm">
                 <thead className="bg-gray-100">
                   <tr>
                     <th className="border border-black p-2 w-10">ر.ت</th>
                     <th className="border border-black p-2 text-right">الاسم الكامل</th>
                     <th className="border border-black p-2 bg-green-50">حضور (أيام)</th>
                     <th className="border border-black p-2 bg-red-50">غياب (أيام)</th>
                     <th className="border border-black p-2 bg-yellow-50">تأخر (مرات)</th>
                     <th className="border border-black p-2 bg-gray-200">نسبة المواظبة</th>
                   </tr>
                 </thead>
                 <tbody>
                   {previewData.rows.map((row: any, idx: number) => (
                     <tr key={row.student.id}>
                       <td className="border border-black p-1">{idx + 1}</td>
                       <td className="border border-black p-1 text-right px-2 font-bold">{row.student.fullName}</td>
                       <td className="border border-black p-1">{row.present}</td>
                       <td className="border border-black p-1 font-bold text-red-600">{row.absent}</td>
                       <td className="border border-black p-1">{row.late}</td>
                       <td className="border border-black p-1 font-bold bg-gray-50">{row.rate}%</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div className="mt-auto">
                 <OfficialFooter teacher={teacherProfile} className="mt-12" />
               </div>
             </div>
           )}

           {/* 3. INDIVIDUAL REPORTS BULK */}
           {previewData.type === 'INDIVIDUAL_BULK' && (
             <div className="print:block flex flex-col gap-8 print:gap-0">
                {previewData.rows.map((row: any, idx: number) => {
                  return (
                    <div key={row.student.id} className="print-page bg-white shadow-xl print:shadow-none mb-10 print:mb-0">
                      <OfficialHeader teacher={teacherProfile} className="mb-4" />
                      
                      <div className="border-2 border-black p-2 mb-4 flex justify-between items-center text-sm">
                          <div className="w-1/4">RIM: {row.student.rimNumber || row.student.id.slice(0, 6)}</div>
                          <div className="flex-1 text-center font-bold">
                            <p>{previewData.term}ème trimestre {previewData.class.academicYear}</p>
                            <p>Relevé de la classe {previewData.class.name}</p>
                          </div>
                          <div className="w-1/4 text-right" dir="rtl">
                            الاسم: <span className="font-bold">{row.student.fullName}</span>
                          </div>
                      </div>

                      <div className="flex-1">
                        <table className="w-full border-collapse border border-black text-sm" dir="ltr">
                            <thead>
                              <tr className="bg-gray-100">
                                  <th className="border border-black p-1 text-left w-1/3">Les Matières</th>
                                  <th className="border border-black p-1 text-center w-20">Note</th>
                                  <th className="border border-black p-1 text-center w-20">Max</th>
                                  <th className="border border-black p-1 text-right w-1/3">المواد</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.keys(previewData.subjects).map((key: string) => {
                                  // Updated to use the pre-calculated map 'row.grades' instead of finding in array
                                  const score = row.grades[key];
                                  const max = previewData.subjects[key];
                                  return (
                                    <tr key={key}>
                                        <td className="border border-black p-1 text-left font-medium">{SUBJECT_NAMES_FR[key]}</td>
                                        <td className="border border-black p-1 text-center font-bold"> 
                                           {typeof score === 'number' ? score : '-'} 
                                        </td>
                                        <td className="border border-black p-1 text-center text-slate-500"> {max} </td>
                                        <td className="border border-black p-1 text-right font-medium">{SUBJECT_NAMES[key]}</td>
                                    </tr>
                                  )
                              })}
                            </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex flex-row gap-0 text-sm border border-black">
                         <div className="w-1/3 border-r border-black p-2 space-y-2">
                             <div className="flex justify-between border-b border-gray-300 pb-1">
                               <span>M. 1er trimestre</span> 
                               <span className="font-bold">{row.stats.t1.average || '-'}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-300 pb-1">
                               <span>M. 2ème trimestre</span> 
                               <span className="font-bold">{row.stats.t2.average || '-'}</span>
                             </div>
                             <div className="flex justify-between">
                               <span>M. 3ème trimestre</span> 
                               <span className="font-bold">{row.stats.t3.average || '-'}</span>
                             </div>
                         </div>

                         <div className="w-1/3 border-r border-black p-2 space-y-2">
                            {previewData.term === 1 && <div className="flex justify-between border-b border-gray-300 pb-1"><span>Total</span> <span className="font-bold">{row.stats.t1.totalScore}</span></div>}
                            {previewData.term === 2 && <div className="flex justify-between border-b border-gray-300 pb-1"><span>Total</span> <span className="font-bold">{row.stats.t2.totalScore}</span></div>}
                            {previewData.term === 3 && <div className="flex justify-between border-b border-gray-300 pb-1"><span>Total</span> <span className="font-bold">{row.stats.t3.totalScore}</span></div>}
                            
                            <div className="flex justify-between border-b border-gray-300 pb-1">
                               <span>Moyen Général</span> 
                               <span className="font-bold text-lg">{row.stats.current.average}</span>
                            </div>
                            <div className="flex justify-between">
                               <span>Rang</span> 
                               <span className="font-bold">{row.stats.rank}</span>
                            </div>
                         </div>

                         <div className="w-1/3 p-2 text-right" dir="rtl">
                            <p className="font-bold underline mb-1">الملاحظات:</p>
                            <p className="text-xs text-slate-500">{row.decision || ''}</p>
                         </div>
                      </div>

                      <div className="mt-auto">
                        <OfficialFooter teacher={teacherProfile} className="mt-8" />
                      </div>
                    </div>
                  );
                })}
             </div>
           )}

        </div>
      )}
    </div>
  );
};

const OfficialHeader = ({ teacher, className = "" }: any) => (
  <div className={`flex justify-between items-start border-b-2 border-black pb-4 ${className}`} dir="ltr">
    <div className="text-left text-xs font-bold w-1/3">
      <p>République Islamique de Mauritanie</p>
      <p>Honneur Fraternité Justice</p>
      <p>Ministère de l'éducation et de RSE</p>
      <p className="mt-2">DREN de: <span className="font-normal">{teacher?.state || '.......'}</span></p>
      <p>IDEN de: <span className="font-normal">{teacher?.district || '.......'}</span></p>
      <p>Ecole: <span className="font-normal">{teacher?.schoolName || '.......'}</span></p>
    </div>
    <div className="text-center w-1/3">
      <div className="w-20 h-20 rounded-full border-2 border-slate-400 flex items-center justify-center mx-auto opacity-50">
        <span className="text-[10px] font-bold">SEAL</span>
      </div>
    </div>
    <div className="text-right text-xs font-bold w-1/3" dir="rtl">
      <p>الجمهورية الإسلامية الموريتانية</p>
      <p>شرف - إخاء - عدل</p>
      <p>وزارة التربية وإصلاح النظام التعليمي</p>
      <p className="mt-2">الإدارة الجهوية للتربية في: <span className="font-normal">{teacher?.state || '.......'}</span></p>
      <p>مفتشية مقاطعة: <span className="font-normal">{teacher?.district || '.......'}</span></p>
      <p>مدرسة: <span className="font-normal">{teacher?.schoolName || '.......'}</span></p>
    </div>
  </div>
);

const OfficialFooter = ({ teacher, className = "" }: any) => (
  <div className={`flex justify-between px-8 ${className}`} dir="ltr">
    <div className="text-center">
      <p className="font-bold text-sm">Le directeur</p>
      <p className="mt-1 font-bold text-sm" dir="rtl">المدير</p>
      <div className="h-16"></div>
    </div>
    <div className="text-center">
      <p className="font-bold text-sm">L'Enseignant</p>
      <p className="mt-1 font-bold text-sm" dir="rtl">المعلم</p>
      <div className="h-16"></div>
      <p className="underline text-sm">{teacher?.fullName}</p>
    </div>
  </div>
);

export default ReportsPage;