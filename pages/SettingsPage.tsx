
import React, { useState, useEffect } from 'react';
import { getTeacherProfile, saveTeacherProfile } from '../services/storageService';
import { TeacherProfile } from '../types';
import { ShieldCheck, Calendar } from 'lucide-react';
import { Card, SectionTitle, Button } from '../components/Shared';

const SettingsPage = () => {
  const [profile, setProfile] = useState<TeacherProfile>({
    fullName: '', registrationNumber: '', schoolName: '', district: '', state: ''
  });
  const [academicYearStart, setAcademicYearStart] = useState('');

  useEffect(() => {
    getTeacherProfile().then(saved => {
      if (saved) setProfile(prev => ({ ...prev, ...saved }));
    });

    const storedDate = localStorage.getItem('sta_current_academic_year');
    if (storedDate) {
      setAcademicYearStart(storedDate);
    } else {
      // Default: Oct 1st of current school year
      const defaultDate = new Date(new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0), 9, 1);
      // Handle timezone offset to ensure YYYY-MM-DD matches local date
      const offset = defaultDate.getTimezoneOffset();
      const localDate = new Date(defaultDate.getTime() - (offset*60*1000));
      setAcademicYearStart(localDate.toISOString().split('T')[0]);
    }
  }, []);

  const handleSave = async () => {
    await saveTeacherProfile(profile);
    if (academicYearStart) {
      localStorage.setItem('sta_current_academic_year', academicYearStart);
    }
    alert('تم حفظ البيانات بنجاح');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <SectionTitle title="الإعدادات" icon={ShieldCheck} />
      <Card className="space-y-6">
        <h3 className="font-bold text-lg text-slate-700 border-b pb-4">بيانات المعلم والمدرسة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-2">الاسم الكامل</label>
            <input 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
              value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-2">رقم التسجيل (Mle)</label>
            <input 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
              value={profile.registrationNumber} onChange={e => setProfile({...profile, registrationNumber: e.target.value})}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-600 block mb-2">المدرسة</label>
            <input 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
              value={profile.schoolName} onChange={e => setProfile({...profile, schoolName: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-2">الولاية (الإدارة الجهوية)</label>
            <input 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
              value={profile.state || ''} onChange={e => setProfile({...profile, state: e.target.value})}
              placeholder="مثلاً: نواكشوط الغربية"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-2">المقاطعة (المفتشية)</label>
            <input 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
              value={profile.district} onChange={e => setProfile({...profile, district: e.target.value})}
              placeholder="مثلاً: تفرغ زينة"
            />
          </div>
          
          <div className="md:col-span-2 pt-4 border-t border-slate-100">
             <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
               <Calendar className="text-teal-600" size={20} />
               <span>إعدادات السنة الدراسية</span>
             </h4>
             <div>
               <label className="text-sm font-medium text-slate-600 block mb-2">تاريخ بداية السنة الدراسية</label>
               <input 
                 type="date"
                 className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
                 value={academicYearStart} 
                 onChange={e => setAcademicYearStart(e.target.value)}
               />
               <p className="text-xs text-slate-400 mt-2">
                 * يستخدم هذا التاريخ لحساب الأسابيع الدراسية ومتابعة تقدم البرنامج السنوي.
               </p>
             </div>
          </div>
        </div>
        <div className="pt-4 border-t">
           <Button onClick={handleSave} className="w-full md:w-auto md:px-8">حفظ التغييرات</Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
