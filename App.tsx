
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { getTeacherProfile } from './services/storageService';
import AuthScreen from './pages/AuthScreen';
import Dashboard from './pages/Dashboard';
import ClassManager from './pages/ClassManager';
import AttendanceManager from './pages/AttendanceManager';
import LessonPlanner from './pages/LessonPlanner';
import SettingsPage from './pages/SettingsPage';
import GradesManager from './pages/GradesManager';
import ReportsPage from './pages/ReportsPage';
import AnalysisPage from './pages/AnalysisPage';
import CurriculumPage from './pages/CurriculumPage';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const p = await getTeacherProfile();
        if (p) setTeacherName(p.fullName);
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isAuthenticated]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">...</div>;

  if (!isAuthenticated) return <AuthScreen onLogin={() => setIsAuthenticated(true)} />;

  return (
    <HashRouter>
      <Layout onLogout={() => setIsAuthenticated(false)} teacherName={teacherName}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/classes" element={<ClassManager />} />
          <Route path="/curriculum" element={<CurriculumPage />} />
          <Route path="/attendance" element={<AttendanceManager />} />
          <Route path="/grades" element={<GradesManager />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/planning" element={<LessonPlanner />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
