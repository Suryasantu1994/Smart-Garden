/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  TreePine,
  Sprout,
  QrCode,
  TrendingUp,
  ArrowUpRight,
  Activity,
  Clock,
  User,
  Loader2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  subscribeToGardens, 
  subscribeToAreas, 
  subscribeToPlants, 
  subscribeToCategories, 
  subscribeToScans 
} from '../../lib/db-utils';
import { Plant, PlantCategory, GardenArea } from '../../types';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [gardens, setGardens] = useState<any[]>([]);
  const [areas, setAreas] = useState<GardenArea[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [categories, setCategories] = useState<PlantCategory[]>([]);
  const [scans, setScans] = useState<any[]>([]);

  useEffect(() => {
    const unsubs = [
      subscribeToGardens(setGardens),
      subscribeToAreas(undefined, setAreas),
      subscribeToPlants(setPlants),
      subscribeToCategories(setCategories),
      subscribeToScans(setScans),
    ];

    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      unsubs.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, []);

  // Calculate KPIs
  const kpis = [
    { label: 'Total Gardens', value: gardens.length.toString(), icon: LayoutGrid, trend: 'Live', color: 'bg-emerald-500', path: '/admin/gardens' },
    { label: 'Total Areas', value: areas.length.toString(), icon: TreePine, trend: 'Live', color: 'bg-blue-500', path: '/admin/gardens' },
    { label: 'Total Plants', value: plants.length.toString(), icon: Sprout, trend: 'Live', color: 'bg-amber-500', path: '/admin/plants' },
    { label: 'QR Scans', value: scans.length.toLocaleString(), icon: QrCode, trend: 'Live', color: 'bg-purple-500', path: '/admin/qr-codes' },
  ];

  // Calculate plants by category for bar chart
  const categoryChartData = categories.map(cat => {
    const count = plants.filter(p => p.categoryId === cat.id).length;
    return {
      name: cat.name,
      value: count,
      color: cat.color || '#10b981'
    };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

  // Default data if no real data yet
  const displayCategoryData = categoryChartData.length > 0 ? categoryChartData : [
    { name: 'No Data', value: 0, color: '#e7e5e4' }
  ];

  // Process scans for the area chart (last 7 days)
  const getDayName = (date: Date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      name: getDayName(d),
      dateStr: d.toISOString().split('T')[0],
      scans: 0
    };
  });

  scans.forEach(scan => {
    if (scan.timestamp) {
      const dateStr = new Date(scan.timestamp).toISOString().split('T')[0];
      const day = last7Days.find(d => d.dateStr === dateStr);
      if (day) day.scans++;
    }
  });

  // Derived Recent Activity
  const recentActivity = [
    ...plants.slice(0, 2).map(p => ({
      type: 'plant',
      action: 'Plant updated',
      item: p.commonName,
      time: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Recently',
      user: 'Admin',
      path: '/admin/plants'
    })),
    ...gardens.slice(0, 1).map(g => ({
      type: 'garden',
      action: 'Garden updated',
      item: g.name,
      time: g.updatedAt ? new Date(g.updatedAt).toLocaleDateString() : 'Recently',
      user: 'Admin',
      path: '/admin/gardens'
    })),
    ...scans.slice(0, 1).map(s => ({
      type: 'qr',
      action: 'QR Scan detected',
      item: `Plant ${s.plantId || 'Unknown'}`,
      time: s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : 'Just now',
      user: 'Visitor',
      path: '/admin/qr-codes'
    }))
  ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 4);

  const handleKpiClick = (path: string) => {
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Loading Dashboard Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">Dashboard Overview</h1>
        <p className="text-stone-500">Welcome back. Here is what's happening with your gardens today.</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => handleKpiClick(kpi.path)}
            className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 group hover:border-emerald-200 transition-all cursor-pointer active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${kpi.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-stone-900/10 group-hover:scale-110 transition-transform`}>
                <kpi.icon size={24} />
              </div>
              <div className="flex items-center space-x-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg">
                <ArrowUpRight size={14} />
                <span>{kpi.trend}</span>
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">{kpi.label}</div>
              <div className="text-3xl font-black text-stone-900 tracking-tight">{kpi.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-stone-900 flex items-center space-x-3">
              <TrendingUp className="text-emerald-600" size={24} />
              <span>QR Scans Over Time</span>
            </h3>
            <select 
              onChange={(e) => toast.info(`Time range changed to ${e.target.value}`)}
              className="bg-stone-50 border border-stone-200 text-xs font-bold rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    border: 'none',
                    borderRadius: '16px',
                    color: '#fff',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="#10b981"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorScans)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-stone-900 flex items-center space-x-3">
              <Sprout className="text-emerald-600" size={24} />
              <span>Plants by Category</span>
            </h3>
            <Link 
              to="/admin/categories"
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              View Detailed
            </Link>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayCategoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#44403c', fontSize: 12, fontWeight: 600 }}
                  width={100}
                />
                <Tooltip
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {displayCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-8 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-stone-900 flex items-center space-x-3">
            <Activity className="text-emerald-600" size={24} />
            <span>Recent Activity</span>
          </h3>
          <button 
            onClick={() => toast.info('Loading activity logs...')}
            className="text-xs font-bold text-emerald-600 hover:underline active:scale-90 transition-transform"
          >
            View All
          </button>
        </div>
        <div className="divide-y divide-stone-50">
          {recentActivity.map((activity, idx) => (
            <div 
              key={idx} 
              onClick={() => navigate(activity.path)}
              className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-white group-hover:text-emerald-600 transition-all">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900">{activity.action}</div>
                  <div className="text-xs text-stone-500">
                    <span className="font-semibold text-emerald-600">{activity.item}</span> • {activity.time}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-stone-100 px-3 py-1.5 rounded-xl group-hover:bg-emerald-50 transition-colors">
                <User size={14} className="text-stone-400 group-hover:text-emerald-600" />
                <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider group-hover:text-emerald-600">{activity.user}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
