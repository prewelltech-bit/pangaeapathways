import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';
import { CheckCircle, Circle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState({
    newEnquiries: 0,
    activeCases: 0,
    conversionPct: 0,
    onHold: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [tasksRes, metricsRes] = await Promise.all([
          axios.get('/api/tasks/me'),
          axios.get('/api/dashboard/metrics')
        ]);
        setTasks(tasksRes.data);
        setMetrics(metricsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboardData();
  }, []);

  const toggleTask = async (id) => {
    try {
      await axios.patch(`/api/tasks/${id}/toggle`);
      setTasks(tasks.map(t => t._id === id ? { ...t, completedAt: t.completedAt ? null : new Date() } : t));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
        <h2 className="text-xl font-semibold text-pangaea-deep mb-4">Welcome back, {user?.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-sky-50 p-4 rounded-lg border border-sky-100">
            <span className="text-sm text-sky-700 block mb-1">Email</span>
            <span className="font-medium text-sky-900">{user?.email}</span>
          </div>
          <div className="bg-sky-50 p-4 rounded-lg border border-sky-100">
            <span className="text-sm text-sky-700 block mb-1">Role</span>
            <span className="inline-flex items-center rounded bg-sky-200 px-2 py-0.5 text-xs font-medium text-sky-900">
              {user?.role}
            </span>
          </div>
          <div className="bg-sky-50 p-4 rounded-lg border border-sky-100">
            <span className="text-sm text-sky-700 block mb-1">MFA Status</span>
            <span className="font-medium text-sky-900">{user?.totpEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
          <h3 className="text-sm font-medium text-slate-500">New Enquiries</h3>
          <p className="mt-2 text-3xl font-bold text-pangaea-deep">{metrics.newEnquiries}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
          <h3 className="text-sm font-medium text-slate-500">Active Cases</h3>
          <p className="mt-2 text-3xl font-bold text-pangaea-deep">{metrics.activeCases}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
          <h3 className="text-sm font-medium text-slate-500">Conversion %</h3>
          <p className="mt-2 text-3xl font-bold text-pangaea-deep">{metrics.conversionPct}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
          <h3 className="text-sm font-medium text-slate-500">On Hold</h3>
          <p className="mt-2 text-3xl font-bold text-pangaea-deep">{metrics.onHold}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
        <h2 className="text-xl font-semibold text-pangaea-deep mb-4">My Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">You have no pending tasks.</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map(t => (
              <li key={t._id} className={`flex items-center p-3 rounded-lg border ${t.completedAt ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-sky-100'}`}>
                <button onClick={() => toggleTask(t._id)} className="mr-3">
                  {t.completedAt ? <CheckCircle className="text-green-500 w-5 h-5"/> : <Circle className="text-slate-300 w-5 h-5 hover:text-sky-500"/>}
                </button>
                <span className={`text-sm ${t.completedAt ? 'line-through text-slate-500' : 'text-slate-700 font-medium'}`}>{t.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
