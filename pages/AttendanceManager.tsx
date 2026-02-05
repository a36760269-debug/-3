
import React, { useState, useEffect, useMemo } from 'react';
import { 
  getClasses, 
  getStudents, 
  getAttendance, 
  saveAttendance 
} from '../services/storageService';
import { 
  calculateAttendanceStats, 
  filterAttendanceByPeriod 
} from '../services/mathService';
import { ClassEntity, Student, AttendanceStatus } from '../types';
import { 
  Calendar, CheckCircle, XCircle, Clock, List, BarChart2, MessageCircle 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer 
} from 'recharts';
import { Card, SectionTitle, Button } from '../components/Shared';

const AttendanceManager = () => {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [mode, setMode] = useState<'register' | 'report'>('register');
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month' | 'term'>('week');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    getClasses().then(setClasses);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedClass) {
        const s = await getStudents(selectedClass);
        setStudents(s);
        // Load existing for current date in register mode
        const existing = await getAttendance(selectedClass, date);
        const map: any = {};
        existing.forEach(r => map[r.studentId] = r.status);
        setAttendance(map);
      }
    };
    fetchData();
  }, [selectedClass, date, mode]);

  useEffect(() => {
    const calculateAnalytics = async () => {
      if (!selectedClass || mode !== 'report') return;
      
      const allHistory = await getAttendance(selectedClass); 
      const filteredHistory = filterAttendanceByPeriod(allHistory, reportPeriod);
      const stats = calculateAttendanceStats(filteredHistory);

      setAnalyticsData({
        present: stats.presentRate,
        absent: stats.absentRate,
        late: stats.lateRate,
        chartData: [
          { name: 'حضور', value: stats.counts.present, fill: '#10b981' },
          { name: 'غياب', value: stats.counts.absent, fill: '#ef4444' },
          { name: 'تأخر', value: stats.counts.late, fill: '#eab308' },
        ]
      });
    };
    calculateAnalytics();
  }, [selectedClass, reportPeriod, mode]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleRemindParent = (student: Student) => {
    if (!student.parentPhone) return;
    
    const message = `السلام عليكم، ولي أمر التلميذ: ${student.fullName}.
نود إشعاركم بأن ابنكم تغيب عن الدراسة اليوم (${date}).
نرجو منكم تبرير الغياب حرصاً على مستقبله الدراسي.

إدارة المدرسة.`;

    // 222 is Mauritania country code
    const url = `https://wa.me/222${student.parentPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    try {
        const records = Object.entries(attendance).map(([studentId, status]) => ({
            studentId, // Mandatory
            classId: selectedClass, // Mandatory
            date, // Single day
            status: status as AttendanceStatus // Enum
        }));
        await saveAttendance(records);
        alert('تم حفظ سجل الحضور');
    } catch (error: any) {
        alert(error.message || "فشل حفظ الحضور. تحقق من البيانات.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="متابعة الحضور" icon={Calendar} />
      
      {/* Top Controls */}
      <Card className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <select 
            className="border border-slate-200 p-3 rounded-xl w-full md:w-64 focus:ring-2 focus:ring-teal-500 outline-none bg-white" 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="">اختر الفصل</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          {mode === 'register' && (
            <input 
              type="date" 
              className="border border-slate-200 p-3 rounded-xl w-full md:w-auto focus:ring-2 focus:ring-teal-500 outline-none bg-white" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
            />
          )}
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
           <button 
             onClick={() => setMode('register')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}
           >
             <div className="flex items-center gap-2"><List size={16}/> تسجيل</div>
           </button>
           <button 
             onClick={() => setMode('report')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'report' ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}
           >
             <div className="flex items-center gap-2"><BarChart2 size={16}/> تقارير</div>
           </button>
        </div>
      </Card>

      {selectedClass && mode === 'register' && (
        <Card className="overflow-hidden p-0 animate-fade-in">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-700">التلميذ</th>
                  <th className="p-4 font-bold text-slate-700 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-medium text-slate-800">
                       <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">
                          {s.fullName.charAt(0)}
                        </div>
                        <div>
                          <p>{s.fullName}</p>
                          {s.parentPhone && <p className="text-[10px] text-slate-400 font-mono">{s.parentPhone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2 items-center">
                         <button onClick={() => handleStatusChange(s.id, AttendanceStatus.PRESENT)} className={`p-2 rounded-lg transition-all ${attendance[s.id] === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-slate-50 text-slate-400'}`}><CheckCircle size={24} /></button>
                         <button onClick={() => handleStatusChange(s.id, AttendanceStatus.ABSENT)} className={`p-2 rounded-lg transition-all ${attendance[s.id] === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-slate-50 text-slate-400'}`}><XCircle size={24} /></button>
                         <button onClick={() => handleStatusChange(s.id, AttendanceStatus.LATE)} className={`p-2 rounded-lg transition-all ${attendance[s.id] === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-500' : 'bg-slate-50 text-slate-400'}`}><Clock size={24} /></button>
                         
                         {/* WhatsApp Reminder Button: Only shows if Absent AND has Phone */}
                         {attendance[s.id] === AttendanceStatus.ABSENT && s.parentPhone && (
                           <div className="w-px h-6 bg-slate-200 mx-1"></div>
                         )}
                         
                         {attendance[s.id] === AttendanceStatus.ABSENT && s.parentPhone && (
                           <button 
                             onClick={() => handleRemindParent(s)}
                             className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:shadow-sm border border-green-200 transition-all animate-scale-up"
                             title="إرسال تذكير بالغياب للولي"
                           >
                             <MessageCircle size={20} />
                           </button>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <Button onClick={handleSave} className="w-full md:w-auto shadow-lg">حفظ السجل</Button>
          </div>
        </Card>
      )}

      {selectedClass && mode === 'report' && analyticsData && (
        <div className="space-y-6 animate-scale-up">
           <div className="flex justify-center gap-2">
              <button onClick={() => setReportPeriod('week')} className={`px-4 py-1 rounded-full text-sm ${reportPeriod === 'week' ? 'bg-teal-600 text-white' : 'bg-white border'}`}>أسبوعي</button>
              <button onClick={() => setReportPeriod('month')} className={`px-4 py-1 rounded-full text-sm ${reportPeriod === 'month' ? 'bg-teal-600 text-white' : 'bg-white border'}`}>شهري</button>
              <button onClick={() => setReportPeriod('term')} className={`px-4 py-1 rounded-full text-sm ${reportPeriod === 'term' ? 'bg-teal-600 text-white' : 'bg-white border'}`}>فصلي/عام</button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="flex flex-col items-center justify-center p-8 bg-green-50 border-green-100">
                 <h4 className="text-green-800 font-bold mb-2">نسبة الحضور</h4>
                 <p className="text-4xl font-bold text-green-600">{analyticsData.present}%</p>
              </Card>
              <Card className="flex flex-col items-center justify-center p-8 bg-red-50 border-red-100">
                 <h4 className="text-red-800 font-bold mb-2">نسبة الغياب</h4>
                 <p className="text-4xl font-bold text-red-600">{analyticsData.absent}%</p>
              </Card>
              <Card className="flex flex-col items-center justify-center p-8 bg-yellow-50 border-yellow-100">
                 <h4 className="text-yellow-800 font-bold mb-2">نسبة التأخر</h4>
                 <p className="text-4xl font-bold text-yellow-600">{analyticsData.late}%</p>
              </Card>
           </div>

           <Card className="h-80 w-full flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </Card>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
