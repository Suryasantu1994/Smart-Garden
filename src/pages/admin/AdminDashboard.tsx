/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Loader2,
  X,
  Smartphone,
  MapPin,
  Leaf
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

  // Process scans for display in modal
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

  // Calculate KPIs
  const kpis = [
    { label: 'Total Gardens', value: gardens.length.toString(), icon: LayoutGrid, trend: 'Live', color: 'bg-emerald-500', path: '/admin/gardens' },
    { label: 'Total Areas', value: areas.length.toString(), icon: TreePine, trend: 'Live', color: 'bg-cyan-500', path: '/admin/gardens' },
    { label: 'Total Plants', value: plants.length.toString(), icon: Sprout, trend: 'Live', color: 'bg-amber-500', path: '/admin/plants' },
    { label: 'QR Scans', value: scans.length.toLocaleString(), icon: QrCode, trend: 'View Logs', color: 'bg-purple-500', onClick: () => setShowScanDetails(true) },
    { label: 'Unique Visitors', value: visitors.length.toString(), icon: User, trend: 'View Logs', color: 'bg-blue-500', onClick: () => setShowVisitorDetails(true) },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => kpi.onClick ? kpi.onClick() : handleKpiClick(kpi.path || '')}
            className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 group hover:border-emerald-200 transition-all cursor-pointer active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${kpi.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-stone-900/10 group-hover:scale-110 transition-transform`}>
                <kpi.icon size={24} />
              </div>
              <div className="flex items-center space-x-1 text-emerald-600 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-lg">
                <ArrowUpRight size={12} />
                <span>{kpi.trend}</span>
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">{kpi.label}</div>
              <div className="text-3xl font-black text-stone-900 tracking-tight">{kpi.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {/* Scan Logs Modal */}
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
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
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
                    <User size={24} />
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
                    <User size={48} className="mx-auto text-stone-200 mb-4" />
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

      {/* Charts & Activity Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-stone-900 flex items-center space-x-3">
                <TrendingUp className="text-emerald-600" size={24} />
                <span>QR Scans Over Time</span>
              </h3>
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

          {/* Recent Scans Table */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden">
            <div className="p-8 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-stone-900 flex items-center space-x-3">
                <QrCode className="text-purple-600" size={24} />
                <span>Recent Scan Logs</span>
              </h3>
              <button 
                onClick={() => setShowScanDetails(true)}
                className="text-xs font-bold text-purple-600 hover:underline active:scale-90 transition-transform"
              >
                View Full History
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/50">
                    <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Item Name</th>
                    <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Type</th>
                    <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {detailedScans.slice(0, 5).map((scan, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-8 py-4 font-bold text-stone-900">{scan.itemName}</td>
                      <td className="px-8 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${scan.itemType === 'Plant' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                          {scan.itemType}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right text-stone-500 text-xs font-medium">{scan.formattedDate}</td>
                    </tr>
                  ))}
                  {detailedScans.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center text-stone-400 italic">No scans recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-stone-900 flex items-center space-x-3">
                <Sprout className="text-emerald-600" size={24} />
                <span>Plants by Category</span>
              </h3>
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

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden">
            <div className="p-8 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-stone-900 flex items-center space-x-3">
                <Activity className="text-emerald-600" size={24} />
                <span>Recent Activity</span>
              </h3>
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
                      <div className="text-[11px] text-stone-500">
                        <span className="font-semibold text-emerald-600">{activity.item}</span> • {activity.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
