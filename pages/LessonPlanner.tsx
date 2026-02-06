import React, { useState } from 'react';
import { SUBJECT_NAMES } from '../constants';
import { ClassLevel } from '../types';
import { 
  BrainCircuit, CheckCircle, FileDown, Save, Edit3, Eye, Plus, Trash2, Tag, X,
  ArrowUp, ArrowDown, FolderOpen, Calendar
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Card, SectionTitle, Button } from '../components/Shared';
import { useLessonPlanner } from '../hooks/useLessonPlanner';

const LessonPlanner = () => {
  const { 
    state: { 
      subject, topic, level, loading, tags, newTag, plan, isEditing,
      filterSubject, filteredPlans
    },
    setters: { setSubject, setTopic, setLevel, setNewTag, setIsEditing, setFilterSubject },
    actions: { 
      handleGenerate, handleSaveLocal, handleAddTag, handleRemoveTag,
      handleDeletePlan, handleLoadPlan
    },
    modifiers: { 
      updatePlan, updatePhase, addPhase, removePhase, movePhase,
      updateObjective, addObjective, removeObjective, moveObjective 
    }
  } = useLessonPlanner();

  const [activeTab, setActiveTab] = useState<'NEW' | 'SAVED'>('NEW');

  const handleExportPDF = async () => {
    setIsEditing(false);
    setTimeout(async () => {
      const element = document.getElementById('lesson-plan-content');
      if (!element) return;
      try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const ratio = pdfWidth / canvas.width;
        const imgHeight = canvas.height * ratio;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
        
        pdf.save(`plan_${subject}_${topic}.pdf`);
      } catch (err) { 
        alert('خطأ في التصدير'); 
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="دفتر التحضير الذكي" icon={BrainCircuit} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Panel / Sidebar */}
        <div className="lg:col-span-4 space-y-4 print:hidden">
           <Card className="space-y-4 sticky top-6">
              {/* Tab Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button 
                   onClick={() => setActiveTab('NEW')}
                   className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'NEW' ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <Edit3 size={16}/> تحضير جديد
                 </button>
                 <button 
                   onClick={() => setActiveTab('SAVED')}
                   className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'SAVED' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <FolderOpen size={16}/> أرشيفي
                 </button>
              </div>

              {activeTab === 'NEW' ? (
                // --- NEW PLAN FORM ---
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-600 block mb-1">المستوى</label>
                      <select className="w-full border p-3 rounded-xl bg-white outline-none focus:border-teal-500" value={level} onChange={e => setLevel(e.target.value)}>
                        {Object.values(ClassLevel).map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 block mb-1">المادة</label>
                      <select className="w-full border p-3 rounded-xl bg-white outline-none focus:border-teal-500" value={subject} onChange={e => setSubject(e.target.value)}>
                        {Object.keys(SUBJECT_NAMES).map(k => <option key={k} value={k}>{SUBJECT_NAMES[k]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 block mb-1">عنوان الدرس (الموضوع)</label>
                    <input 
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                        placeholder="مثال: الجملة الاسمية"
                        value={topic} onChange={e => setTopic(e.target.value)}
                    />
                  </div>

                  {/* Tags Input */}
                  <div>
                      <label className="text-sm font-medium text-slate-600 block mb-1">تصنيف (كلمات مفتاحية)</label>
                      <div className="flex gap-2">
                        <input
                          className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                          placeholder="أضف تصنيف..."
                          value={newTag}
                          onChange={e => setNewTag(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                        />
                        <button onClick={handleAddTag} className="bg-slate-100 p-3 rounded-xl hover:bg-slate-200">
                          <Plus size={20} className="text-slate-600" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map(tag => (
                          <span key={tag} className="bg-teal-50 text-teal-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)}><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                  </div>

                  <Button onClick={handleGenerate} disabled={loading} className="w-full mt-4">
                    {loading ? <span className="animate-pulse">جاري التحضير...</span> : 'توليد الخطة'}
                  </Button>
                </div>
              ) : (
                // --- SAVED PLANS LIST ---
                <div className="space-y-4 animate-fade-in">
                   <div>
                      <label className="text-sm font-medium text-slate-600 block mb-1">تصفية حسب المادة</label>
                      <select 
                        className="w-full border p-3 rounded-xl bg-white outline-none focus:border-blue-500" 
                        value={filterSubject} 
                        onChange={e => setFilterSubject(e.target.value)}
                      >
                        <option value="ALL">الكل</option>
                        {Object.keys(SUBJECT_NAMES).map(k => <option key={k} value={k}>{SUBJECT_NAMES[k]}</option>)}
                      </select>
                   </div>
                   
                   <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredPlans.length > 0 ? (
                        filteredPlans.map(p => (
                          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition cursor-pointer group" onClick={() => handleLoadPlan(p)}>
                             <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{p.topic}</h4>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeletePlan(p.id); }}
                                  className="text-slate-300 hover:text-red-500 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                             </div>
                             <div className="flex justify-between items-end">
                                <div>
                                   <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{SUBJECT_NAMES[p.subject]}</span>
                                   <span className="text-[10px] text-slate-400 block mt-1 flex items-center gap-1">
                                      <Calendar size={10} />
                                      {new Date(p.createdAt).toLocaleDateString('ar-MA')}
                                   </span>
                                </div>
                                <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{p.level}</span>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                           <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                           <p className="text-sm">لا توجد دروس محفوظة</p>
                        </div>
                      )}
                   </div>
                </div>
              )}
           </Card>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-8">
          <Card className="min-h-[600px] relative bg-white border border-slate-200 shadow-md p-0 overflow-hidden">
            {/* Toolbar */}
            {plan && (
              <div className="bg-slate-50 border-b p-3 flex justify-between items-center print:hidden">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${isEditing ? 'bg-teal-100 text-teal-700' : 'bg-white border text-slate-600'}`}
                  >
                    {isEditing ? <><Eye size={16}/> معاينة</> : <><Edit3 size={16}/> تعديل</>}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveLocal} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">
                    <Save size={16}/> حفظ
                  </button>
                  <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">
                    <FileDown size={16}/> تصدير PDF
                  </button>
                </div>
              </div>
            )}

            {plan ? (
              <div id="lesson-plan-content" className="p-8 md:p-12 space-y-8 bg-white text-slate-900">
                 {/* Header */}
                 <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                    <div className="flex-1">
                      {isEditing ? (
                        <input 
                          className="text-3xl font-black text-slate-900 w-full bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-teal-500 outline-none placeholder-slate-300"
                          value={plan.title}
                          onChange={e => updatePlan('title', e.target.value)}
                          placeholder="عنوان الدرس"
                        />
                      ) : (
                        <h1 className="text-3xl font-black">{plan.title}</h1>
                      )}
                      <p className="text-slate-600 mt-2 text-lg font-medium">المادة: {SUBJECT_NAMES[subject]}</p>
                      
                       {/* Display Tags in Plan */}
                       {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {tags.map(tag => (
                              <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200">
                                <Tag size={10} className="inline mr-1"/> {tag}
                              </span>
                            ))}
                          </div>
                       )}

                    </div>
                    <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[150px]">
                      <p className="font-bold text-slate-800 text-lg">{level}</p>
                      {isEditing ? (
                        <input 
                          className="text-sm text-slate-500 bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-teal-500 outline-none w-full"
                          value={plan.duration}
                          onChange={e => updatePlan('duration', e.target.value)}
                        />
                      ) : (
                        <p className="text-sm text-slate-500">{plan.duration}</p>
                      )}
                    </div>
                 </div>

                 {/* Content */}
                 <div className="space-y-8">
                   {/* Objectives */}
                   <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100">
                     <h4 className="font-bold text-blue-900 mb-4 flex items-center justify-between">
                       <span className="flex items-center gap-2"><CheckCircle size={20}/> الأهداف التعلمية</span>
                       {isEditing && <button onClick={addObjective} className="p-1 hover:bg-blue-100 rounded text-blue-600"><Plus size={16}/></button>}
                     </h4>
                     <ul className="list-disc list-inside space-y-2">
                       {plan.objectives?.map((obj: string, i: number) => (
                         <li key={i} className="flex items-start gap-2 text-slate-800 group">
                           {isEditing ? (
                             <div className="flex-1 flex gap-2 items-center">
                               <input 
                                 className="flex-1 bg-transparent border-b border-dashed border-transparent hover:border-blue-300 focus:border-blue-500 outline-none"
                                 value={obj}
                                 onChange={e => updateObjective(i, e.target.value)}
                               />
                               <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => moveObjective(i, 'up')} disabled={i === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowUp size={14}/></button>
                                  <button onClick={() => moveObjective(i, 'down')} disabled={i === plan.objectives.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowDown size={14}/></button>
                                  <button onClick={() => removeObjective(i)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                               </div>
                             </div>
                           ) : (
                             <span className="leading-relaxed">{obj}</span>
                           )}
                         </li>
                       ))}
                     </ul>
                   </div>

                   {/* Situation */}
                   <div>
                     <h4 className="font-bold text-slate-800 mb-3 text-lg border-r-4 border-teal-500 pr-3">الوضعية الانطلاقية</h4>
                     {isEditing ? (
                       <textarea 
                         className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 focus:border-teal-500 outline-none min-h-[100px] text-slate-700 leading-relaxed resize-y"
                         value={plan.situation}
                         onChange={e => updatePlan('situation', e.target.value)}
                       />
                     ) : (
                       <p className="text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-100 text-justify">
                         {plan.situation}
                       </p>
                     )}
                   </div>

                   {/* Phases Table */}
                   <div>
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-800 text-lg border-r-4 border-purple-500 pr-3">سير الدرس (المراحل)</h4>
                        {isEditing && (
                          <button onClick={addPhase} className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded hover:bg-purple-100">
                            <Plus size={14}/> إضافة مرحلة
                          </button>
                        )}
                     </div>
                     <div className="overflow-hidden rounded-xl border border-slate-200">
                       <table className="w-full text-sm">
                         <thead className="bg-slate-100 text-slate-700 font-bold">
                           <tr>
                             <th className="p-4 text-right w-1/4">المرحلة</th>
                             <th className="p-4 text-right">النشاط (المعلم / المتعلم)</th>
                             <th className="p-4 text-center w-24">المدة</th>
                             {isEditing && <th className="w-24 text-center">أدوات</th>}
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 bg-white">
                           {plan.phases?.map((p: any, i: number) => (
                             <tr key={i} className="hover:bg-slate-50/50 group">
                               <td className="p-4 align-top">
                                 {isEditing ? (
                                   <input 
                                     className="w-full font-bold bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-purple-500 outline-none"
                                     value={p.name}
                                     onChange={e => updatePhase(i, 'name', e.target.value)}
                                   />
                                 ) : <span className="font-bold text-slate-800">{p.name}</span>}
                               </td>
                               <td className="p-4 align-top">
                                 {isEditing ? (
                                   <textarea 
                                     className="w-full bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-purple-500 outline-none resize-none h-auto"
                                     value={p.activity}
                                     onChange={e => updatePhase(i, 'activity', e.target.value)}
                                     rows={3}
                                   />
                                 ) : <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{p.activity}</p>}
                               </td>
                               <td className="p-4 align-top text-center">
                                 {isEditing ? (
                                   <input 
                                     className="w-full text-center bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-purple-500 outline-none"
                                     value={p.duration}
                                     onChange={e => updatePhase(i, 'duration', e.target.value)}
                                   />
                                 ) : <span className="text-slate-500">{p.duration}</span>}
                               </td>
                               {isEditing && (
                                 <td className="p-4 align-middle text-center">
                                   <div className="flex justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => movePhase(i, 'up')} disabled={i === 0} className="p-1 text-slate-500 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowUp size={16}/></button>
                                      <button onClick={() => movePhase(i, 'down')} disabled={i === plan.phases.length - 1} className="p-1 text-slate-500 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowDown size={16}/></button>
                                      <button onClick={() => removePhase(i)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                   </div>
                                 </td>
                               )}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>

                   {/* Evaluation */}
                   <div className="bg-teal-50/50 p-6 rounded-2xl border border-teal-100">
                      <h4 className="font-bold text-teal-800 mb-3 flex items-center gap-2">
                        <CheckCircle size={20}/> التقويم
                      </h4>
                      {isEditing ? (
                        <textarea 
                          className="w-full bg-white/50 p-3 rounded-lg border border-teal-200 focus:border-teal-500 outline-none text-slate-700 leading-relaxed"
                          value={plan.evaluation}
                          onChange={e => updatePlan('evaluation', e.target.value)}
                          rows={3}
                        />
                      ) : (
                        <p className="text-slate-700 leading-relaxed">{plan.evaluation}</p>
                      )}
                   </div>
                 </div>
              </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                 <BrainCircuit size={64} className="mb-4 text-slate-300" />
                 <p className="text-lg">قم بإدخال بيانات الدرس واضغط "توليد الخطة"</p>
               </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LessonPlanner;