
import React, { useState, useEffect } from 'react';
import { getClasses, getStudents } from '../services/storageService';
import { 
  getCurriculumForClass, 
  getClassProgress, 
  toggleTopicCompletion, 
  getSubjectProgressStatus, 
  getCurrentAcademicWeek,
  addCurriculumTopic,
  updateCurriculumTopic,
  deleteCurriculumTopic,
  generateYearlyTemplate,
  clearCurriculumForLevel,
  getStudentProgress,
  setStudentTopicStatus,
  getStudentSubjectStats
} from '../services/curriculumService';
import { ClassEntity, CurriculumTopic, ClassLevel, Student, StudentProgress } from '../types';
import { SUBJECT_NAMES } from '../constants';
import { SectionTitle, Card, Button } from '../components/Shared';
import { 
  BookOpen, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Settings, Plus, Edit2, Trash2, X, Save, Layers, RefreshCw, BrainCircuit,
  GraduationCap, User, Circle, SkipForward, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CurriculumPage = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<ClassLevel>(ClassLevel.AF1);
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'CLASS' | 'STUDENT'>('CLASS');

  // Class Progress State
  const [classProgress, setClassProgress] = useState<string[]>([]);
  
  // Student Progress State
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentProgressData, setStudentProgressData] = useState<StudentProgress[]>([]);

  // Management Mode States
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Partial<CurriculumTopic> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    getClasses().then(setClasses);
  }, []);

  useEffect(() => {
    loadClassData();
  }, [selectedClassId]); 

  useEffect(() => {
    if (activeTab === 'STUDENT' && selectedClassId) {
      getStudents(selectedClassId).then(setStudents);
    }
  }, [activeTab, selectedClassId]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentProgress();
    }
  }, [selectedStudentId]);

  const loadClassData = async () => {
    if (!selectedClassId) {
      setTopics([]);
      setClassProgress([]);
      return;
    }
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return;

    setSelectedLevel(cls.level);
    const t = await getCurriculumForClass(cls.level);
    setTopics(t);

    // Load Class level progress
    const p = await getClassProgress(selectedClassId);
    setClassProgress(p.map(item => item.topicId));

    // Reset student selection when class changes
    setSelectedStudentId('');
    setStudentProgressData([]);
  };

  const loadStudentProgress = async () => {
    if (!selectedStudentId) return;
    const progress = await getStudentProgress(selectedStudentId);
    setStudentProgressData(progress);
  };

  // --- CLASS PROGRESS HANDLERS ---
  const handleToggleClassProgress = async (topicId: string, currentStatus: boolean) => {
    if (isEditMode) return;
    await toggleTopicCompletion(selectedClassId, topicId, !currentStatus);
    if (currentStatus) {
      setClassProgress(prev => prev.filter(id => id !== topicId));
    } else {
      setClassProgress(prev => [...prev, topicId]);
    }
  };

  // --- STUDENT PROGRESS HANDLERS ---
  const handleStudentStatusChange = async (topicId: string, newStatus: 'COMPLETED' | 'SKIPPED' | null) => {
    if (!selectedStudentId) return;
    await setStudentTopicStatus(selectedStudentId, topicId, newStatus);
    
    // Optimistic Update
    setStudentProgressData(prev => {
      const filtered = prev.filter(p => p.topicId !== topicId);
      if (newStatus) {
        return [...filtered, { 
          id: 'temp', 
          studentId: selectedStudentId, 
          topicId, 
          status: newStatus, 
          updatedAt: Date.now() 
        }];
      }
      return filtered;
    });
  };

  const handlePlanLesson = (topic: CurriculumTopic) => {
    navigate('/planning', {
      state: {
        level: topic.level,
        subject: topic.subject,
        topic: topic.topic
      }
    });
  };

  // --- CRUD HANDLERS ---

  const openAddModal = (subjectKey: string) => {
    setEditingTopic({
      level: selectedLevel,
      subject: subjectKey,
      term: 1,
      week: getCurrentAcademicWeek(),
      topic: '',
      competency: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (topic: CurriculumTopic) => {
    setEditingTopic({ ...topic });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الدرس؟ سيتم حذف تقدم الإنجاز المرتبط به.")) {
      await deleteCurriculumTopic(id);
      loadClassData();
    }
  };

  const handleSave = async () => {
    if (!editingTopic || !editingTopic.topic || !editingTopic.week) {
      alert("يرجى ملء الحقول الأساسية (الموضوع والأسبوع)");
      return;
    }

    try {
      if (editingTopic.id) {
        await updateCurriculumTopic(editingTopic as CurriculumTopic);
      } else {
        await addCurriculumTopic(editingTopic as Omit<CurriculumTopic, 'id'>);
      }
      setIsModalOpen(false);
      loadClassData();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  // --- TEMPLATE GENERATION ---
  
  const handleGenerateTemplate = async () => {
    const confirmMsg = `سيتم إنشاء قالب سنوي كامل (35 أسبوع) لجميع مواد المستوى ${selectedLevel}.\n\n⚠️ تنبيه: يفضل مسح البيانات الحالية أولاً لتجنب التكرار.\n\nهل تريد المتابعة؟`;
    
    if (window.confirm(confirmMsg)) {
      setIsGenerating(true);
      try {
        if(window.confirm("هل تريد مسح البيانات الحالية لهذا المستوى قبل الإنشاء؟ (ينصح به لبدء سنة جديدة)")) {
           await clearCurriculumForLevel(selectedLevel);
        }
        
        await generateYearlyTemplate(selectedLevel);
        await loadClassData();
        alert("تم إنشاء القالب السنوي بنجاح!");
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء الإنشاء");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const groupedBySubject = topics.reduce((acc, topic) => {
    if (!acc[topic.subject]) acc[topic.subject] = [];
    acc[topic.subject].push(topic);
    return acc;
  }, {} as Record<string, CurriculumTopic[]>);

  const currentAcademicWeek = getCurrentAcademicWeek();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <SectionTitle title="البرنامج السنوي والمتابعة" icon={BookOpen} />
        {selectedClassId && activeTab === 'CLASS' && (
          <Button 
            onClick={() => setIsEditMode(!isEditMode)} 
            variant={isEditMode ? 'secondary' : 'primary'}
            className="gap-2"
          >
            {isEditMode ? <CheckCircle size={18} /> : <Settings size={18} />}
            {isEditMode ? 'إنهاء التعديل' : 'إدارة البرنامج'}
          </Button>
        )}
      </div>

      <Card className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-bold text-slate-700 mb-2">اختر الفصل</label>
            <select 
              className="w-full border p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
            >
              <option value="">-- اختر الفصل --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl text-blue-800 text-sm font-bold">
            <Clock size={18} />
            <span>نحن في الأسبوع الدراسي: {currentAcademicWeek}</span>
          </div>
        </div>

        {selectedClassId && (
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-fit">
            <button 
              onClick={() => setActiveTab('CLASS')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'CLASS' ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Layers size={16} /> خطة الفصل (المعلم)
            </button>
            <button 
              onClick={() => setActiveTab('STUDENT')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'STUDENT' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <GraduationCap size={16} /> متابعة التلاميذ
            </button>
          </div>
        )}
      </Card>

      {selectedClassId ? (
        <div className="grid grid-cols-1 gap-6">
          
          {/* ===================== CLASS PLAN VIEW ===================== */}
          {activeTab === 'CLASS' && (
            <>
              {isEditMode && (
                <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 rounded-md space-y-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-yellow-600" />
                    <p className="text-sm text-yellow-800 font-bold">
                      أنت الآن في وضع التعديل. يمكنك إضافة، تعديل، أو حذف الدروس من البرنامج السنوي.
                    </p>
                  </div>
                  
                  <div className="flex gap-2 pt-2 border-t border-yellow-200">
                     <Button 
                       onClick={handleGenerateTemplate} 
                       disabled={isGenerating}
                       className="text-xs bg-white border border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                     >
                       {isGenerating ? <RefreshCw className="animate-spin" size={16}/> : <Layers size={16}/>}
                       {isGenerating ? 'جاري الإنشاء...' : 'توليد القالب السنوي الشامل'}
                     </Button>
                  </div>
                </div>
              )}

              {Object.entries(groupedBySubject).map(([subjectKey, rawSubjectTopics]) => {
                const subjectTopics = rawSubjectTopics as CurriculumTopic[];
                const status = getSubjectProgressStatus(subjectTopics, classProgress);
                const isExpanded = expandedSubject === subjectKey;

                return (
                  <div key={subjectKey} className={`bg-white rounded-2xl shadow-sm border transition-all ${status.isDelayed ? 'border-red-200' : 'border-slate-200'}`}>
                    {/* Header */}
                    <div 
                      className={`p-5 cursor-pointer flex flex-col md:flex-row justify-between items-center gap-4 ${status.isDelayed && !isEditMode ? 'bg-red-50/50' : ''}`}
                      onClick={() => setExpandedSubject(isExpanded ? null : subjectKey)}
                    >
                      <div className="flex items-center gap-4 w-full md:w-1/3">
                        <div className={`p-3 rounded-xl ${status.isDelayed && !isEditMode ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-600'}`}>
                          {status.isDelayed && !isEditMode ? <AlertTriangle size={24} /> : <BookOpen size={24} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{SUBJECT_NAMES[subjectKey] || subjectKey}</h3>
                          {!isEditMode && (
                            <p className={`text-xs font-bold ${status.isDelayed ? 'text-red-600' : 'text-slate-500'}`}>
                              {status.isDelayed 
                                ? `تأخر ${status.delayWeeks} أسابيع` 
                                : 'يسير وفق الخطة'}
                            </p>
                          )}
                        </div>
                      </div>

                      {!isEditMode && (
                        <div className="flex-1 w-full">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>نسبة الإنجاز</span>
                            <span>{status.percentage}% ({status.completedCount}/{status.totalTopics})</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-2.5 rounded-full transition-all duration-1000 ${status.isDelayed ? 'bg-red-500' : 'bg-teal-500'}`} 
                              style={{ width: `${status.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="text-slate-400 flex items-center gap-4">
                        {isEditMode && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); openAddModal(subjectKey); }}
                             className="flex items-center gap-1 bg-teal-50 text-teal-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-teal-100"
                           >
                             <Plus size={14}/> درس جديد
                           </button>
                        )}
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </div>

                    {/* Details List */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/30 p-4">
                        <div className="grid grid-cols-1 gap-2">
                          {subjectTopics.map(topic => {
                            const isCompleted = classProgress.includes(topic.id);
                            const isPastDue = !isCompleted && topic.week < currentAcademicWeek;
                            const delayWeeks = currentAcademicWeek - topic.week;
                            
                            return (
                              <div 
                                key={topic.id} 
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all relative overflow-hidden ${
                                  isCompleted && !isEditMode ? 'bg-green-50 border-green-200' : 
                                  isPastDue && !isEditMode ? 'bg-red-50/60 border-red-300 shadow-sm' : 'bg-white border-slate-100'
                                }`}
                              >
                                {isPastDue && !isEditMode && (
                                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-400"></div>
                                )}

                                {!isEditMode && (
                                  <input 
                                    type="checkbox" 
                                    checked={isCompleted}
                                    onChange={() => handleToggleClassProgress(topic.id, isCompleted)}
                                    className="w-5 h-5 accent-teal-600 cursor-pointer"
                                  />
                                )}
                                
                                <div className="flex-1">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      {isPastDue && !isEditMode && <AlertCircle size={16} className="text-red-500" />}
                                      <span className={`font-medium ${isCompleted && !isEditMode ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                        {topic.topic}
                                      </span>
                                    </div>

                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${
                                      isPastDue && !isEditMode ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {isPastDue && !isEditMode ? (
                                        <>
                                          <Clock size={10} />
                                          <span>متأخر {delayWeeks} أسبوع</span>
                                        </>
                                      ) : (
                                        `الأسبوع ${topic.week}`
                                      )}
                                    </span>
                                  </div>
                                  {topic.competency && (
                                    <p className="text-xs text-slate-400 mt-1">الكفاءة: {topic.competency}</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {!isEditMode && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePlanLesson(topic); }}
                                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 hover:scale-105 transition"
                                      title="تحضير درس ذكي لهذا الموضوع"
                                    >
                                      <BrainCircuit size={16} />
                                    </button>
                                  )}

                                  {isEditMode && (
                                    <>
                                      <button 
                                        onClick={() => openEditModal(topic)}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDelete(topic.id)}
                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ===================== STUDENT TRACKING VIEW ===================== */}
          {activeTab === 'STUDENT' && (
             <div className="space-y-6">
               <Card>
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                     <User size={24} />
                   </div>
                   <div className="flex-1">
                     <label className="block text-sm font-bold text-slate-700 mb-1">اختر التلميذ للمتابعة</label>
                     <select 
                        className="w-full border p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={selectedStudentId}
                        onChange={e => setSelectedStudentId(e.target.value)}
                     >
                       <option value="">-- اختر التلميذ --</option>
                       {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                     </select>
                   </div>
                 </div>
               </Card>

               {selectedStudentId ? (
                 <div className="grid grid-cols-1 gap-4">
                   {Object.entries(groupedBySubject).map(([subjectKey, rawSubjectTopics]) => {
                     const subjectTopics = rawSubjectTopics as CurriculumTopic[];
                     const stats = getStudentSubjectStats(subjectTopics, studentProgressData);
                     const isExpanded = expandedSubject === subjectKey;
                     
                     return (
                        <div key={subjectKey} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                           <div 
                             className="p-5 cursor-pointer flex flex-col md:flex-row justify-between items-center gap-4"
                             onClick={() => setExpandedSubject(isExpanded ? null : subjectKey)}
                           >
                             <div className="flex items-center gap-4 w-full md:w-1/3">
                               <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                                 <BookOpen size={24} />
                               </div>
                               <div>
                                 <h3 className="font-bold text-lg text-slate-800">{SUBJECT_NAMES[subjectKey] || subjectKey}</h3>
                                 <p className="text-xs text-slate-500 font-bold mt-1">
                                    مكتمل: {stats.completed} | تم تجاوز: {stats.skipped}
                                 </p>
                               </div>
                             </div>

                             <div className="flex-1 w-full">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                  <span>التقدم الفردي</span>
                                  <span>{stats.percentage}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                  <div 
                                    className="h-2.5 rounded-full bg-purple-600 transition-all duration-1000" 
                                    style={{ width: `${stats.percentage}%` }}
                                  ></div>
                                </div>
                             </div>

                             <div className="text-slate-400">
                               {isExpanded ? <ChevronUp /> : <ChevronDown />}
                             </div>
                           </div>

                           {isExpanded && (
                             <div className="border-t border-slate-100 bg-slate-50/30 p-4 max-h-[500px] overflow-y-auto">
                                <div className="space-y-2">
                                  {subjectTopics.map(topic => {
                                     // Find status
                                     const p = studentProgressData.find(sp => sp.topicId === topic.id);
                                     const status = p?.status || null;

                                     return (
                                       <div key={topic.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 hover:shadow-sm transition">
                                          <div className="flex-1">
                                             <div className="flex items-center gap-2">
                                               <span className={`text-sm font-medium ${status === 'COMPLETED' ? 'text-green-700' : status === 'SKIPPED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                 {topic.topic}
                                               </span>
                                               <span className="text-[10px] bg-slate-100 px-2 rounded text-slate-500">أسبوع {topic.week}</span>
                                             </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
                                             <button 
                                               onClick={() => handleStudentStatusChange(topic.id, status === 'COMPLETED' ? null : 'COMPLETED')}
                                               className={`p-2 rounded-lg transition ${status === 'COMPLETED' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-600'}`}
                                               title="مكتمل"
                                             >
                                               <CheckCircle size={18} />
                                             </button>
                                             <button 
                                               onClick={() => handleStudentStatusChange(topic.id, status === 'SKIPPED' ? null : 'SKIPPED')}
                                               className={`p-2 rounded-lg transition ${status === 'SKIPPED' ? 'bg-slate-200 text-slate-600 ring-2 ring-slate-400' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                                               title="تجاوز"
                                             >
                                               <SkipForward size={18} />
                                             </button>
                                          </div>
                                       </div>
                                     );
                                  })}
                                </div>
                             </div>
                           )}
                        </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="text-center py-20 text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                    <User size={48} className="mx-auto mb-2 opacity-20" />
                    <p>الرجاء اختيار تلميذ لعرض سجل المتابعة</p>
                 </div>
               )}
             </div>
          )}
          
          {/* Empty State */}
          {Object.keys(groupedBySubject).length === 0 && (
             <div className="text-center py-10 text-slate-400">
               <p>لا توجد بيانات لهذا المستوى.</p>
               {isEditMode && activeTab === 'CLASS' && (
                 <div className="flex flex-col gap-4 mt-4 items-center">
                   <p className="text-sm">يمكنك إضافة درس يدوياً أو استخدام المولد الآلي</p>
                   <div className="flex gap-2">
                    <Button onClick={() => openAddModal('arabic_language')}>
                      <Plus size={16} /> إضافة درس يدوي
                    </Button>
                    <Button onClick={handleGenerateTemplate} variant="secondary">
                       <Layers size={16} /> توليد القالب السنوي
                    </Button>
                   </div>
                 </div>
               )}
             </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
          الرجاء اختيار فصل لعرض البرنامج
        </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && editingTopic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg animate-scale-up">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-bold text-xl text-slate-800">
                {editingTopic.id ? 'تعديل الدرس' : 'إضافة درس جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">المادة</label>
                  <select 
                    className="w-full border p-2 rounded-lg bg-slate-50"
                    value={editingTopic.subject}
                    onChange={e => setEditingTopic({...editingTopic, subject: e.target.value})}
                  >
                    {Object.keys(SUBJECT_NAMES).map(k => (
                      <option key={k} value={k}>{SUBJECT_NAMES[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">الفصل الدراسي</label>
                  <select 
                    className="w-full border p-2 rounded-lg bg-slate-50"
                    value={editingTopic.term}
                    onChange={e => setEditingTopic({...editingTopic, term: Number(e.target.value) as 1|2|3})}
                  >
                    <option value="1">الفصل 1</option>
                    <option value="2">الفصل 2</option>
                    <option value="3">الفصل 3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">الأسبوع الدراسي</label>
                <input 
                  type="number"
                  min="1" max="35"
                  className="w-full border p-2 rounded-lg"
                  value={editingTopic.week}
                  onChange={e => setEditingTopic({...editingTopic, week: Number(e.target.value)})}
                />
                <p className="text-[10px] text-slate-400 mt-1">الأسبوع الحالي هو {currentAcademicWeek}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">عنوان الدرس / الموضوع</label>
                <input 
                  className="w-full border p-2 rounded-lg"
                  placeholder="مثلاً: الجملة الاسمية"
                  value={editingTopic.topic}
                  onChange={e => setEditingTopic({...editingTopic, topic: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">الكفاءة المستهدفة (اختياري)</label>
                <input 
                  className="w-full border p-2 rounded-lg"
                  placeholder="مثلاً: القدرة على التمييز بين..."
                  value={editingTopic.competency || ''}
                  onChange={e => setEditingTopic({...editingTopic, competency: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button onClick={handleSave} className="flex-1 gap-2">
                  <Save size={18} /> حفظ
                </Button>
                <Button onClick={() => setIsModalOpen(false)} variant="secondary" className="flex-1">
                  إلغاء
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CurriculumPage;
