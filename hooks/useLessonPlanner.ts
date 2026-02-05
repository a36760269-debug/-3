import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGemini, generateLessonPlan } from '../services/geminiService';
import { saveLessonPlan } from '../services/storageService';
import { SUBJECT_NAMES } from '../constants';
import { ClassLevel } from '../types';

export const useLessonPlanner = () => {
  const location = useLocation();
  const [subject, setSubject] = useState('arabic_language');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('AF3');
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const [plan, setPlan] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    if (location.state) {
      const { level: navLevel, subject: navSubject, topic: navTopic } = location.state as any;
      if (navLevel) setLevel(navLevel);
      if (navSubject) setSubject(navSubject);
      if (navTopic) setTopic(navTopic);
    }
  }, [location.state]);

  // --- ACTIONS ---

  const handleGenerate = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return alert("API Key not set in environment");
    
    setLoading(true);
    initGemini(apiKey);
    try {
      const result = await generateLessonPlan(level, SUBJECT_NAMES[subject], topic);
      const parsed = JSON.parse(result);
      setPlan(parsed);
      setIsEditing(true);
    } catch (e) { 
      alert("حدث خطأ أثناء التوليد. حاول مرة أخرى."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSaveLocal = async () => {
    if (!plan) return;
    try {
      await saveLessonPlan({ 
        subject, 
        topic, 
        level, 
        content: JSON.stringify({...plan, tags}) 
      });
      alert("تم حفظ الخطة في السجل المحلي");
    } catch (e) {
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  // --- PLAN MODIFIERS ---

  const updatePlan = (field: string, value: any) => {
    setPlan((prev: any) => ({ ...prev, [field]: value }));
  };

  const updatePhase = (index: number, field: string, value: string) => {
    const newPhases = [...(plan.phases || [])];
    newPhases[index] = { ...newPhases[index], [field]: value };
    updatePlan('phases', newPhases);
  };

  const addPhase = () => {
    updatePlan('phases', [...(plan.phases || []), { name: 'مرحلة جديدة', activity: '', duration: '5 د' }]);
  };

  const removePhase = (index: number) => {
    const newPhases = [...(plan.phases || [])];
    newPhases.splice(index, 1);
    updatePlan('phases', newPhases);
  };

  const movePhase = (index: number, direction: 'up' | 'down') => {
    const newPhases = [...(plan.phases || [])];
    if (direction === 'up' && index > 0) {
      [newPhases[index], newPhases[index - 1]] = [newPhases[index - 1], newPhases[index]];
    } else if (direction === 'down' && index < newPhases.length - 1) {
      [newPhases[index], newPhases[index + 1]] = [newPhases[index + 1], newPhases[index]];
    }
    updatePlan('phases', newPhases);
  };

  const updateObjective = (index: number, value: string) => {
    const newObjs = [...(plan.objectives || [])];
    newObjs[index] = value;
    updatePlan('objectives', newObjs);
  };

  const addObjective = () => {
    updatePlan('objectives', [...(plan.objectives || []), 'هدف جديد']);
  };

  const removeObjective = (index: number) => {
    const newObjs = [...(plan.objectives || [])];
    newObjs.splice(index, 1);
    updatePlan('objectives', newObjs);
  };

  const moveObjective = (index: number, direction: 'up' | 'down') => {
    const newObjs = [...(plan.objectives || [])];
    if (direction === 'up' && index > 0) {
      [newObjs[index], newObjs[index - 1]] = [newObjs[index - 1], newObjs[index]];
    } else if (direction === 'down' && index < newObjs.length - 1) {
      [newObjs[index], newObjs[index + 1]] = [newObjs[index + 1], newObjs[index]];
    }
    updatePlan('objectives', newObjs);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return {
    state: {
      subject, topic, level, loading, tags, newTag, plan, isEditing
    },
    setters: {
      setSubject, setTopic, setLevel, setNewTag, setIsEditing
    },
    actions: {
      handleGenerate, handleSaveLocal, handleAddTag, handleRemoveTag
    },
    modifiers: {
      updatePlan, updatePhase, addPhase, removePhase, movePhase,
      updateObjective, addObjective, removeObjective, moveObjective
    }
  };
};