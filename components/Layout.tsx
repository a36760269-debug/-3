
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  ClipboardList, 
  GraduationCap, 
  Settings, 
  LogOut,
  BrainCircuit,
  Menu,
  X,
  FileText,
  LineChart,
  ListChecks
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  teacherName?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, teacherName }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'لوحة القيادة', icon: LayoutDashboard },
    { path: '/classes', label: 'الفصول', icon: Users },
    { path: '/curriculum', label: 'البرنامج السنوي', icon: ListChecks }, // New Item
    { path: '/attendance', label: 'الحضور', icon: ClipboardList },
    { path: '/grades', label: 'النتائج والتقويم', icon: GraduationCap },
    { path: '/analysis', label: 'التحليل والمتابعة', icon: LineChart },
    { path: '/reports', label: 'التقارير والكشوف', icon: FileText },
    { path: '/planning', label: 'التحضير الذكي', icon: BrainCircuit },
    { path: '/settings', label: 'الإعدادات', icon: Settings },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 w-full z-30 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md h-16">
         <div className="flex items-center gap-2 font-bold text-lg">
           <BookOpen className="text-teal-400" size={24} />
           <span>مساعد المعلّم</span>
         </div>
         <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded hover:bg-slate-700 focus:outline-none">
           {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-30 w-64 bg-slate-800 text-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:inset-auto md:h-screen
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Desktop Header / Logo Area */}
        <div className="p-6 border-b border-slate-700 hidden md:block">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="text-teal-400" />
            <span>مساعد المعلّم</span>
          </h1>
          {teacherName && (
            <p className="text-xs text-slate-400 mt-2">مرحباً، {teacherName}</p>
          )}
        </div>

        {/* Mobile User Info (top of sidebar content when open on mobile) */}
        <div className="p-4 border-b border-slate-700 md:hidden mt-16 bg-slate-900">
           {teacherName && <p className="text-sm text-slate-300">مرحباً، {teacherName}</p>}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                      isActive 
                        ? 'bg-teal-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 w-full px-4 py-2"
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative w-full bg-gray-50 pt-16 md:pt-0">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
