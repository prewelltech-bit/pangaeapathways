import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  CheckCircle, Circle, Users, Plane, TrendingUp, Clock, 
  ArrowUpRight, ArrowRight, Activity 
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState({
    newEnquiries: 0,
    activeCases: 0,
    conversionPct: 0,
    onHold: 0,
    totalLeads: 0
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
      {/* Redesigned Welcomer Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0c4a6e] via-[#0369a1] to-[#1e1b4b] rounded-2xl shadow-sm border border-sky-900/10 p-6 text-white">
        {/* Decorative background glow circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-sky-500/20 blur-2xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-sky-200 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Workspace Session Active
            </div>
            <h2 className="text-3xl font-black tracking-tight mt-1">Welcome back, {user?.name}</h2>
            <p className="text-sky-100 text-sm max-w-lg font-medium opacity-90">
              Manage leads, track visa applications, and monitor team performance metrics on your dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-sm min-w-[140px]">
              <span className="text-[10px] uppercase font-bold text-sky-300 block tracking-wider">Role</span>
              <span className="font-bold text-sm tracking-wide">{user?.role}</span>
            </div>
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-sm min-w-[140px]">
              <span className="text-[10px] uppercase font-bold text-sky-300 block tracking-wider">Access Level</span>
              <span className="font-bold text-sm tracking-wide">
                {user?.role === 'CEO' ? 'Global Access' : `Scope: ${user?.country || 'Local'}`}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 4-Column Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: New Enquiries */}
        <div 
          onClick={() => navigate('/leads?status=NEW')}
          className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-sky-200 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">New Enquiries</h3>
              <p className="mt-2 text-3xl font-black text-slate-800 tracking-tight">{metrics.newEnquiries}</p>
            </div>
            <div className="p-3 bg-sky-50 rounded-xl text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-sky-600">
            View New Leads <ArrowUpRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>

        {/* Card 2: Active Cases */}
        <div 
          onClick={() => navigate('/immigration')}
          className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Active Cases</h3>
              <p className="mt-2 text-3xl font-black text-slate-800 tracking-tight">{metrics.activeCases}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
              <Plane className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-indigo-600">
            Go to Kanban Pipeline <ArrowUpRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>

        {/* Card 3: Conversion % */}
        <div 
          onClick={() => navigate('/leads?status=QUALIFIED')}
          className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Conversion %</h3>
              <p className="mt-2 text-3xl font-black text-slate-800 tracking-tight">{metrics.conversionPct}%</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600">
            View Qualified Leads <ArrowUpRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>

        {/* Card 4: On Hold */}
        <div 
          onClick={() => navigate('/leads?status=ON_HOLD')}
          className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">On Hold</h3>
              <p className="mt-2 text-3xl font-black text-slate-800 tracking-tight">{metrics.onHold}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-600">
            View On-Hold Leads <ArrowUpRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>

      </div>

      {/* Split Grid for Tasks & Action Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Span 2): My Tasks */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">My Task Center</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Keep track of your client onboarding items and process checkpoints.</p>
              </div>
              <button 
                onClick={() => navigate('/tasks')}
                className="text-xs font-bold text-[#0369a1] hover:text-[#0c4a6e] border border-sky-100 bg-sky-50/50 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-all"
              >
                Go to Tasks Center →
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/50 border border-dashed border-slate-100 rounded-xl">
                <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">You're all caught up!</p>
                <p className="text-xs text-slate-400 mt-0.5">No pending tasks assigned to you today.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {tasks.slice(0, 5).map(t => (
                  <li 
                    key={t._id} 
                    className={`flex items-center p-4 rounded-xl border transition-all ${
                      t.completedAt 
                        ? 'bg-slate-50/50 border-slate-100 opacity-60' 
                        : 'bg-white border-slate-100 hover:border-sky-100 hover:shadow-sm'
                    }`}
                  >
                    <button onClick={() => toggleTask(t._id)} className="mr-3.5 focus:outline-none flex-shrink-0">
                      {t.completedAt ? (
                        <CheckCircle className="text-emerald-500 w-5 h-5" />
                      ) : (
                        <Circle className="text-slate-300 w-5 h-5 hover:text-sky-500 transition-colors" />
                      )}
                    </button>
                    <span className={`text-sm ${t.completedAt ? 'line-through text-slate-400 font-medium' : 'text-slate-700 font-semibold'}`}>
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {tasks.length > 5 && (
            <div className="mt-4 text-center">
              <button 
                onClick={() => navigate('/tasks')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline"
              >
                And {tasks.length - 5} more task{tasks.length - 5 > 1 ? 's' : ''}...
              </button>
            </div>
          )}
        </div>

        {/* Right Column (Span 1): Shortcuts & Context Summary */}
        <div className="space-y-6">
          
          {/* Quick Shortcuts Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-md font-extrabold text-slate-800 tracking-tight mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => navigate('/leads/new')}
                className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-sky-50 to-sky-50/20 hover:from-sky-50 hover:to-sky-100/50 border border-sky-100/40 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <span className="p-2 bg-white rounded-lg text-sky-600 shadow-sm border border-sky-100/20 font-bold text-xs flex items-center justify-center w-6 h-6">+</span>
                  <span className="text-sm font-bold text-sky-900">Add New Lead</span>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-600 transition-transform group-hover:translate-x-1" />
              </button>

              <button 
                onClick={() => navigate('/leads')}
                className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-50/50 to-indigo-50/10 hover:from-indigo-50 hover:to-indigo-100/30 border border-indigo-100/30 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-indigo-900">Leads Directory</span>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-500 transition-transform group-hover:translate-x-1" />
              </button>

              <button 
                onClick={() => navigate('/immigration')}
                className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50/50 to-emerald-50/10 hover:from-emerald-50 hover:to-emerald-100/30 border border-emerald-100/30 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <Plane className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-900">Immigration Board</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-500 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* System Context Card */}
          <div className="bg-[#f8fafc] rounded-2xl border border-slate-100 p-6 relative overflow-hidden">
            <div className="flex items-center space-x-3 mb-3">
              <Activity className="w-5 h-5 text-indigo-500" />
              <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">System Status</h2>
            </div>
            
            <div className="space-y-3 mt-4 text-xs font-semibold text-slate-500">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span>Total Managed Leads</span>
                <span className="text-slate-800 font-extrabold">{metrics.totalLeads ?? '0'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span>Current Role</span>
                <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 text-[10px]">{user?.role}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span>Scope Region</span>
                <span className="text-slate-800 font-bold">
                  {user?.role === 'CEO' ? 'Global Portal' : (user?.country || 'Local Branch')}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
