/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  Loader2,
  X,
  Clock,
  Smartphone,
  MapPin,
  Leaf
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
  const [showScanDetails, setShowScanDetails] = useState(false);
  const [showVisitorDetails, setShowVisitorDetails] = useState(false);
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

  // Process scans for display
  const detailedScans = scans.map(scan => {
    const plant = plants.find(p => p.id === scan.plantId);
    const area = areas.find(a => a.id === scan.areaId);
    return {
      ...scan,
      itemName: plant ? plant.commonName : (area ? area.name : 'Unknown Item'),
      itemType: scan.type === 'plant' ? 'Plant' : 'Area',
      formattedDate: scan.timestamp ? new Date(scan.timestamp).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'N/A'
    };
  });

  // Group scans by visitor (User Agent proxy)
  const visitors = Array.from(new Set(scans.map(s => (s.userAgent as string) || 'Unknown Device'))).map((ua: string) => {
    const visitorScans = scans.filter(s => (s.userAgent || 'Unknown Device') === ua);
    const lastScan = visitorScans[0]; // Assuming descending order
    return {
      id: ua,
      device: ua.split(' ')[0] || 'Mobile Device',
      fullUA: ua,
      scanCount: visitorScans.length,
      lastActive: lastScan?.timestamp ? new Date(lastScan.timestamp).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'N/A'
    };
  });

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

  // Popular Plants
  const popularPlants = plants.map(plant => {
    const plantScans = scans.filter(s => s.plantId === plant.id).length;
    return {
      name: plant.commonName,
      scans: plantScans,
      botanical: plant.botanicalName,
      image: plant.primaryImage
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

  const kpis = [
    { label: 'Total Scans', value: scans.length.toString(), change: 'View Logs', icon: QrCode, color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: () => setShowScanDetails(true) },
    { label: 'Unique Visitors (Est)', value: visitors.length.toString(), change: 'View Logs', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => setShowVisitorDetails(true) },
    { label: 'Plants Monitored', value: plants.length.toString(), change: 'Live', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', path: '/admin/plants' },
  ];

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
        {kpis.map((kpi, idx) => {
          const content = (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-xl hover:shadow-stone-900/5 transition-all h-full cursor-pointer"
              onClick={kpi.onClick}
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
          );

          if (kpi.path) {
            return <Link key={idx} to={kpi.path}>{content}</Link>;
          }

          return <div key={idx}>{content}</div>;
        })}
      </div>

      <AnimatePresence>
        {showScanDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScanDetails(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-stone-100 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <QrCode size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Recent Scan Logs</h2>
                    <p className="text-stone-500 text-sm">Real-time engagement tracking across the gardens.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScanDetails(false)}
                  className="p-3 hover:bg-stone-100 rounded-2xl text-stone-400 hover:text-stone-900 transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
                {detailedScans.length === 0 ? (
                  <div className="py-20 text-center">
                    <QrCode size={48} className="mx-auto text-stone-200 mb-4" />
                    <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">No scans recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {detailedScans.map((scan, idx) => (
                      <motion.div
                        key={scan.id || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-6 bg-stone-50/50 rounded-3xl border border-stone-100 hover:bg-white hover:shadow-xl hover:shadow-stone-900/5 transition-all"
                      >
                        <div className="flex items-center space-x-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${scan.itemType === 'Plant' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {scan.itemType === 'Plant' ? <Leaf size={20} /> : <MapPin size={20} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900">{scan.itemName}</h4>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${scan.itemType === 'Plant' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                                {scan.itemType}
                              </span>
                              <div className="flex items-center space-x-1 text-stone-400">
                                <Clock size={12} />
                                <span className="text-[11px] font-medium">{scan.formattedDate}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="hidden md:flex items-center space-x-2 text-stone-400 bg-white px-4 py-2 rounded-xl border border-stone-100 shadow-sm">
                          <Smartphone size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[120px]">
                            {scan.userAgent?.split(' ')[0] || 'Mobile Device'}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-stone-100 bg-stone-50/50 flex justify-end shrink-0">
                <button
                  onClick={() => setShowScanDetails(false)}
                  className="px-8 py-3 bg-stone-900 text-white rounded-2xl font-bold active:scale-95 transition-all"
                >
                  Close Records
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Visitor Logs Modal */}
        {showVisitorDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVisitorDetails(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-stone-100 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Active Visitors</h2>
                    <p className="text-stone-500 text-sm">Identifying unique browser sessions exploring your gardens.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVisitorDetails(false)}
                  className="p-3 hover:bg-stone-100 rounded-2xl text-stone-400 hover:text-stone-900 transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
                {visitors.length === 0 ? (
                  <div className="py-20 text-center">
                    <Users size={48} className="mx-auto text-stone-200 mb-4" />
                    <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">No visitors detected yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visitors.map((visitor, idx) => (
                      <motion.div
                        key={visitor.id || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-6 bg-stone-50/50 rounded-3xl border border-stone-100 hover:bg-white hover:shadow-xl hover:shadow-stone-900/5 transition-all"
                      >
                        <div className="flex items-center space-x-5">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-stone-100">
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900 truncate max-w-[200px] md:max-w-md" title={visitor.fullUA}>
                              {visitor.device} User
                            </h4>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-stone-900 text-white">
                                {visitor.scanCount} Scans
                              </span>
                              <div className="flex items-center space-x-1 text-stone-400">
                                <Clock size={12} />
                                <span className="text-[11px] font-medium">Last active: {visitor.lastActive}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="hidden md:block">
                           <div className="text-[10px] text-stone-300 font-mono bg-stone-100/50 p-2 rounded-lg max-w-[150px] truncate">
                              {visitor.id}
                           </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-stone-100 bg-stone-50/50 flex justify-end shrink-0">
                <button
                  onClick={() => setShowVisitorDetails(false)}
                  className="px-8 py-3 bg-stone-900 text-white rounded-2xl font-bold active:scale-95 transition-all"
                >
                  Close Records
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
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

        {/* Most Scanned Plants */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden"
        >
          <h3 className="text-xl font-bold text-stone-900 mb-8">Most Scanned Plants</h3>
          <div className="space-y-6">
            {popularPlants.map((plant, idx) => (
              <div key={idx} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                    <img src={plant.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">{plant.name}</h4>
                    <p className="text-[10px] italic text-stone-400">{plant.botanical}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-stone-900">{plant.scans}</div>
                  <div className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Scans</div>
                </div>
              </div>
            ))}
            {popularPlants.length === 0 && (
              <div className="py-12 text-center text-stone-400 text-sm italic">No plant data available.</div>
            )}
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
