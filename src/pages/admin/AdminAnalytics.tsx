/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  QrCode, 
  Calendar,
  ArrowUpRight,
  Download,
  Filter,
  Loader2
} from 'lucide-react';
import { 
  subscribeToGardens, 
  subscribeToAreas, 
  subscribeToPlants, 
  subscribeToCategories, 
  subscribeToScans 
} from '../../lib/db-utils';
import { Plant, PlantCategory, GardenArea } from '../../types';

export default function AdminAnalytics() {
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

  // Process scans for the chart (last 7 days)
  const getDayName = (date: Date) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][date.getDay() === 0 ? 6 : date.getDay() - 1];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      name: getDayName(d),
      dateStr: d.toISOString().split('T')[0],
      scans: 0,
      visitors: 0 // We don't track unique visitors strictly yet, just estimated
    };
  });

  scans.forEach(scan => {
    if (scan.timestamp) {
      const dateStr = new Date(scan.timestamp).toISOString().split('T')[0];
      const day = last7Days.find(d => d.dateStr === dateStr);
      if (day) {
        day.scans++;
        // Estimate unique visitors based on scans if we don't have better data
        day.visitors = Math.ceil(day.scans * 0.7);
      }
    }
  });

  // Category distribution
  const totalPlants = plants.length;
  const categoryChartData = categories.map(cat => {
    const count = plants.filter(p => p.categoryId === cat.id).length;
    const percent = totalPlants > 0 ? Math.round((count / totalPlants) * 100) : 0;
    return {
      name: cat.name,
      value: percent,
      color: cat.color || '#10b981'
    };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  // Popular Zones
  const popularZones = areas.map(area => {
    const areaScans = scans.filter(s => s.areaId === area.id).length;
    return {
      name: area.name,
      scans: areaScans,
      users: Math.ceil(areaScans * 0.8),
      time: 'N/A',
      growth: 'Live'
    };
  }).sort((a, b) => b.scans - a.scans).slice(0, 5);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Compiling Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">Analytics & Insights</h1>
          <p className="text-stone-500">Track visitor engagement and botanical collection performance.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-white border border-stone-100 rounded-xl text-stone-600 font-bold text-sm flex items-center space-x-2 hover:bg-stone-50 transition-all">
            <Calendar size={18} />
            <span>Last 7 Days</span>
          </button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20">
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Scans', value: scans.length.toString(), change: 'Live', icon: QrCode, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Unique Visitors (Est)', value: Math.ceil(scans.length * 0.85).toString(), change: 'Live', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Plants Monitored', value: plants.length.toString(), change: 'Live', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${kpi.bg} p-3 rounded-2xl ${kpi.color}`}>
                <kpi.icon size={24} />
              </div>
              <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                <ArrowUpRight size={12} className="mr-1" />
                {kpi.change}
              </div>
            </div>
            <h3 className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">{kpi.label}</h3>
            <p className="text-3xl font-black text-stone-900 tracking-tight">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Traffic Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-stone-900">Scan Activity</h3>
            <button className="text-stone-400 hover:text-stone-600">
              <Filter size={20} />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#a8a29e' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#a8a29e' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="scans" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScans)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Categories Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm"
        >
          <h3 className="text-xl font-bold text-stone-900 mb-8">Plant Distribution (%)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {categoryChartData.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-bold text-stone-600">{cat.name}</span>
                  </div>
                  <span className="text-sm font-black text-stone-900">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Gardens/Areas Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden"
      >
        <div className="p-8 border-b border-stone-50">
          <h3 className="text-xl font-bold text-stone-900">Popular Botanical Zones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50/50">
                <th className="px-8 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Zone Name</th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Scans</th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Unique Users (Est)</th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Avg. Time</th>
                <th className="px-8 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {popularZones.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-8 py-6 font-bold text-stone-900">{row.name}</td>
                  <td className="px-8 py-6 text-stone-600 font-medium">{row.scans.toLocaleString()}</td>
                  <td className="px-8 py-6 text-stone-600 font-medium">{row.users.toLocaleString()}</td>
                  <td className="px-8 py-6 text-stone-600 font-medium">{row.time}</td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-emerald-600 font-black text-xs">{row.growth}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
