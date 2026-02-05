
import React, { useEffect, useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  School, 
  Users, 
  Calendar, 
  BrainCircuit 
} from 'lucide-react';
import { getClasses, getStudents } from '../services/storageService';
import { Card, SectionTitle, Button } from '../components/Shared';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const Dashboard = () => {
  const [counts, setCounts] = useState({ classes: 0, students: 0, boys: 0, girls: 0 });

  useEffect(() => {
    const loadData = async () => {
      const c = await getClasses();
      const s = await getStudents();
      setCounts({
        classes: c.length,
        students: s.length,
        boys: s.length > 0 ? Math.floor(s.length / 2) : 1, // Mock logic as gender isn't in schema yet
        girls: s.length > 0 ? Math.ceil(s.length / 2) : 1
      });
    };
    loadData();
  }, []);
  
  const data = [
    { name: 'الذكور', value: counts.boys }, 
    { name: 'الإناث', value: counts.girls },
  ];
  const COLORS = ['#0d9488', '#f59e0b'];

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionTitle title="لوحة القيادة" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="عدد الفصول" value={counts.classes} icon={School} color="bg-teal-500" />
        <StatCard title="عدد التلاميذ" value={counts.students} icon={Users} color="bg-blue-500" />
        <StatCard title="تسجيل الحضور" value="--" icon={Calendar} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[300px] flex flex-col justify-center items-center">
          <h3 className="text-lg font-bold text-slate-700 mb-4 w-full text-right">توزيع التلاميذ</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-h-[300px]">
          <h3 className="text-lg font-bold text-slate-700 mb-4">اختصارات سريعة</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="secondary" className="h-24 flex-col gap-2 hover:bg-teal-50 hover:text-teal-700">
              <BrainCircuit size={28} />
              <span>تحضير درس</span>
            </Button>
            <Button variant="secondary" className="h-24 flex-col gap-2 hover:bg-blue-50 hover:text-blue-700">
              <Users size={28} />
              <span>إضافة تلميذ</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
