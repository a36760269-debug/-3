
import React, { useState, useEffect, useMemo } from 'react';
import { 
  getClasses, 
  addClass, 
  getStudents, 
  addStudent 
} from '../services/storageService';
import { ClassEntity, ClassLevel, Student } from '../types';
import { LEVEL_CONFIG, SUBJECT_NAMES } from '../constants';
import { Users, Plus, Trash2, Info, Phone, MessageCircle, ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
import { Card, SectionTitle, Button } from '../components/Shared';

const ClassManager = () => {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isClassModalOpen, setClassModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', level: ClassLevel.AF1, academicYear: '2025-2026' });
  
  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'rim'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Student Form State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRim, setNewStudentRim] = useState(''); // RIM Number
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) loadStudents(selectedClass);
  }, [selectedClass]);

  const loadClasses = async () => {
    const data = await getClasses();
    setClasses(data);
  };

  const loadStudents = async (id: string) => {
    const data = await getStudents(id);
    setStudents(data);
  };

  const handleAddClass = async () => {
    await addClass(newClass);
    await loadClasses();
    setClassModal(false);
  };

  const handleAddStudent = async () => {
    if (!selectedClass) {
      alert("يرجى اختيار الفصل أولاً");
      return;
    }
    if (!newStudentName.trim()) {
      alert("يرجى إدخال اسم التلميذ");
      return;
    }
    if (!newParentName.trim()) {
      alert("يرجى إدخال اسم الولي");
      return;
    }

    try {
      await addStudent({ 
        fullName: newStudentName,
        rimNumber: newStudentRim,
        parentName: newParentName, 
        parentPhone: newParentPhone,
        classId: selectedClass 
      });
      await loadStudents(selectedClass);
      // Reset Form
      setNewStudentName(''); 
      setNewStudentRim('');
      setNewParentName('');
      setNewParentPhone('');
    } catch (e: any) {
      alert(`حدث خطأ: ${e.message}`);
    }
  };

  // Helper to calculate total score for preview
  const getCurrentLevelTotal = () => {
    const subjects = LEVEL_CONFIG[newClass.level];
    return Object.values(subjects).reduce((a: number, b: number) => a + b, 0);
  };

  // Memoized Sorted Students
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'name') {
        valA = a.fullName;
        valB = b.fullName;
      } else {
        valA = a.rimNumber || '';
        valB = b.rimNumber || '';
      }

      // Use localeCompare with numeric option for better number sorting in strings
      const comparison = valA.localeCompare(valB, 'ar', { numeric: true });
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [students, sortField, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <SectionTitle title="الفصول والتلاميذ" icon={Users} />
        <Button onClick={() => setClassModal(true)}>
          <Plus size={20} /> فصل جديد
        </Button>
      </div>

      {/* Horizontal Class List */}
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {classes.map(cls => (
          <div 
            key={cls.id}
            onClick={() => setSelectedClass(cls.id)}
            className={`
              min-w-[160px] p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 flex-shrink-0
              ${selectedClass === cls.id 
                ? 'border-teal-500 bg-teal-50 shadow-md transform scale-105' 
                : 'border-transparent bg-white shadow hover:shadow-md text-slate-600'
              }
            `}
          >
            <h3 className="font-bold text-lg mb-1">{cls.name}</h3>
            <span className="text-xs font-medium bg-slate-200/50 px-2 py-1 rounded-lg text-slate-500">{cls.level}</span>
          </div>
        ))}
      </div>

      {selectedClass ? (
        <Card className="animate-fade-in">
          <h3 className="font-bold text-lg mb-6 text-slate-700 flex items-center gap-2">
            <Users className="text-teal-600" />
            قائمة التلاميذ
          </h3>
          
          {/* Add Student Form */}
          <div className="flex flex-col xl:flex-row gap-3 mb-8 bg-slate-50 p-4 rounded-xl items-end xl:items-center">
            <div className="w-full xl:w-32">
               <label className="text-xs text-slate-500 font-bold mb-1 block mr-1">رقم RIM</label>
               <input 
                 className="border-0 bg-white rounded-lg p-3 w-full focus:ring-2 focus:ring-teal-500 shadow-sm font-mono text-center"
                 placeholder="0000" 
                 value={newStudentRim}
                 onChange={e => setNewStudentRim(e.target.value)}
               />
            </div>
            <div className="flex-1 w-full">
               <label className="text-xs text-slate-500 font-bold mb-1 block mr-1">الاسم الكامل</label>
               <input 
                 className="border-0 bg-white rounded-lg p-3 w-full focus:ring-2 focus:ring-teal-500 shadow-sm"
                 placeholder="اسم التلميذ" 
                 value={newStudentName}
                 onChange={e => setNewStudentName(e.target.value)}
               />
            </div>
            <div className="flex-1 w-full">
               <label className="text-xs text-slate-500 font-bold mb-1 block mr-1">اسم الولي</label>
               <input 
                 className="border-0 bg-white rounded-lg p-3 w-full focus:ring-2 focus:ring-teal-500 shadow-sm"
                 placeholder="اسم الولي" 
                 value={newParentName}
                 onChange={e => setNewParentName(e.target.value)}
               />
            </div>
            <div className="w-full xl:w-48">
               <label className="text-xs text-slate-500 font-bold mb-1 block mr-1">رقم الهاتف (اختياري)</label>
               <input 
                 className="border-0 bg-white rounded-lg p-3 w-full focus:ring-2 focus:ring-teal-500 shadow-sm text-left"
                 placeholder="2xxxxxxx" 
                 dir="ltr"
                 type="tel"
                 value={newParentPhone}
                 onChange={e => setNewParentPhone(e.target.value)}
               />
            </div>
            <Button onClick={handleAddStudent} className="w-full xl:w-auto h-[46px]">إضافة</Button>
          </div>

          {/* Sort Controls */}
          {students.length > 0 && (
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-sm text-slate-500 font-medium">العدد: {students.length}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSortField(sortField === 'name' ? 'rim' : 'name')}
                  className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-200 transition"
                >
                  <ArrowUpDown size={14} />
                  <span>ترتيب حسب: {sortField === 'name' ? 'الاسم' : 'رقم RIM'}</span>
                </button>
                <button 
                  onClick={toggleSortDirection}
                  className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-200 transition"
                  title={sortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}
                >
                  {sortDirection === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Student List */}
          <div className="grid grid-cols-1 gap-3">
            {sortedStudents.map(student => (
              <div key={student.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                    {student.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-bold text-slate-800">{student.fullName}</p>
                       {student.rimNumber && (
                         <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-mono" title="رقم RIM">
                           {student.rimNumber}
                         </span>
                       )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                       <span>{student.parentName}</span>
                       {student.parentPhone && <span className="text-slate-300">|</span>}
                       {student.parentPhone && <span className="font-mono">{student.parentPhone}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end md:self-auto">
                   {student.parentPhone && (
                     <>
                       <a 
                         href={`tel:${student.parentPhone}`}
                         className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                         title="اتصال"
                       >
                         <Phone size={18} />
                       </a>
                       <a 
                         href={`https://wa.me/222${student.parentPhone}`}
                         target="_blank"
                         rel="noreferrer"
                         className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                         title="واتساب"
                       >
                         <MessageCircle size={18} />
                       </a>
                     </>
                   )}
                   <button className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                <Users size={48} className="mb-2 opacity-20" />
                <p>لا يوجد تلاميذ في هذا الفصل</p>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="text-center py-20 text-slate-400 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200">
          اختر فصلاً لعرض التلاميذ
        </div>
      )}

      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md animate-scale-up">
            <h3 className="font-bold text-xl mb-4 text-slate-800">إضافة فصل جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">اسم الفصل</label>
                <input 
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="مثلاً: 3أ"
                  value={newClass.name}
                  onChange={e => setNewClass({...newClass, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">المستوى الدراسي</label>
                <select 
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  value={newClass.level}
                  onChange={e => setNewClass({...newClass, level: e.target.value as ClassLevel})}
                >
                  {Object.values(ClassLevel).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Curriculum Preview Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                <div className="flex items-center gap-2 mb-2 text-teal-700">
                  <Info size={16} />
                  <span className="text-xs font-bold">المواد المقررة للمستوى {newClass.level}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.keys(LEVEL_CONFIG[newClass.level]).map(key => (
                    <span key={key} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600">
                      {SUBJECT_NAMES[key]} ({LEVEL_CONFIG[newClass.level][key]})
                    </span>
                  ))}
                </div>
                <div className="text-left text-xs font-bold text-slate-500 border-t pt-2 border-slate-200">
                  المجموع الكلي للنقاط: <span className="text-teal-600 text-sm">{getCurrentLevelTotal()}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleAddClass} className="flex-1">حفظ</Button>
                <Button onClick={() => setClassModal(false)} variant="secondary" className="flex-1">إلغاء</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClassManager;
