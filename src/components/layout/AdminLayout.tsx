/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TreePine,
  LayoutGrid,
  Sprout,
  QrCode,
  Tags,
  BarChart3,
  Settings,
  LogOut,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  Map as MapIcon
} from 'lucide-react';
import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdminLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export default function AdminLayout({ children, onLogout }: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Gardens', path: '/admin/gardens', icon: LayoutGrid },
    { name: 'Plants', path: '/admin/plants', icon: Sprout },
    { name: 'Categories', path: '/admin/categories', icon: Tags },
    { name: 'QR Codes', path: '/admin/qr-codes', icon: QrCode },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('admin_auth');
      onLogout();
      toast.success('Signed out successfully');
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex">
      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-stone-900 text-stone-400 transition-all duration-300 relative z-40",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="p-6 mb-8 flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
            <img src="/GItam-Logo.png" alt="GITAM Logo" className="w-7 h-7 object-contain" />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <span className="text-lg font-bold text-white tracking-tight leading-none">Smart Garden</span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">GITAM Admin</span>
            </motion.div>
          )}
        </div>

        <nav className="flex-grow px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all group",
                location.pathname === item.path
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                  : "hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(
                "shrink-0 transition-transform group-hover:scale-110",
                location.pathname === item.path ? "text-white" : "text-stone-500 group-hover:text-emerald-400"
              )} />
              {!isCollapsed && (
                <span className="font-medium text-sm">{item.name}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-800">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center space-x-3 w-full px-4 py-3 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-all group",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-20 w-8 h-8 bg-stone-800 text-stone-400 rounded-full border border-stone-700 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-xl"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-stone-900 z-[60] md:hidden p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-white/10">
                    <img src="/GItam-Logo.png" alt="GITAM Logo" className="w-7 h-7 object-contain" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-white tracking-tight leading-none">Smart Garden</span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">GITAM Admin</span>
                  </div>
                </div>
                <button onClick={() => setIsMobileOpen(false)} className="text-stone-400">
                  <X size={24} />
                </button>
              </div>

              <nav className="flex-grow space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center space-x-4 px-4 py-4 rounded-2xl transition-all",
                      location.pathname === item.path
                        ? "bg-emerald-600 text-white"
                        : "text-stone-400 hover:text-white"
                    )}
                  >
                    <item.icon size={22} />
                    <span className="font-semibold">{item.name}</span>
                  </Link>
                ))}
              </nav>

              <button
                onClick={handleLogout}
                className="mt-auto flex items-center space-x-4 px-4 py-4 rounded-2xl text-stone-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
              >
                <LogOut size={22} />
                <span className="font-semibold">Logout</span>
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 py-4 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
               <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Admin Management</h2>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="hidden sm:flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors">
              <Plus size={18} />
              <span>Quick Add</span>
            </button>
            <div className="w-10 h-10 bg-stone-100 rounded-full border border-stone-200 overflow-hidden flex items-center justify-center text-stone-400">
               <BarChart3 size={20} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-grow p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
