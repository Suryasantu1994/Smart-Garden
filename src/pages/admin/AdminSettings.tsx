/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  Mail, 
  Globe, 
  Bell, 
  Shield, 
  Database, 
  Save,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Settings saved successfully!');
    }, 1500);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">Organization Settings</h1>
        <p className="text-stone-500">Manage your smart garden configuration, security, and global preferences.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Profile Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden"
        >
          <div className="p-8 border-b border-stone-50 flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <h3 className="text-xl font-bold text-stone-900">General Information</h3>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-4">Organization Name</label>
                <input 
                  type="text" 
                  defaultValue="Botanical Research Institute"
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-4">Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                  <input 
                    type="email" 
                    defaultValue="admin@botanical-inst.org"
                    className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-4">Public Website URL (Auto-Detected)</label>
              <div className="relative">
                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                <input 
                  type="url" 
                  readOnly
                  value={window.location.origin.replace('ais-dev-', 'ais-pre-')}
                  className="w-full pl-14 pr-6 py-4 bg-stone-100 border border-stone-200 rounded-2xl outline-none font-medium text-stone-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-stone-400 font-medium ml-4">This is the standalone domain where visitors will land when scanning QR codes.</p>
            </div>
          </div>
        </motion.section>

        {/* API & Security */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden"
        >
          <div className="p-8 border-b border-stone-50 flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Shield size={20} />
            </div>
            <h3 className="text-xl font-bold text-stone-900">API & Security</h3>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-4">Garden API Key</label>
              <div className="relative">
                <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input 
                  type={showApiKey ? "text" : "password"} 
                  readOnly
                  value="sk_live_51P8Xv7R9w4L2m1oKqS5n3Z..."
                  className="w-full pl-14 pr-16 py-4 bg-stone-50 border border-stone-100 rounded-2xl outline-none font-mono text-sm"
                />
                <button 
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-[10px] text-stone-400 font-medium ml-4">This key allows external systems to read plant and garden data.</p>
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <Smartphone className="text-stone-400" size={20} />
                  <div>
                    <p className="text-sm font-bold text-stone-900">Require Guest Login</p>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Public Access</p>
                  </div>
                </div>
                <button className="w-12 h-6 bg-stone-200 rounded-full relative transition-colors">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm" />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <Bell className="text-stone-400" size={20} />
                  <div>
                    <p className="text-sm font-bold text-stone-900">Email Notifications</p>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Maintenance Alerts</p>
                  </div>
                </div>
                <button className="w-12 h-6 bg-emerald-500 rounded-full relative transition-colors">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm" />
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Data Management */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden"
        >
          <div className="p-8 border-b border-stone-50 flex items-center space-x-3 text-amber-600">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Database size={20} />
            </div>
            <h3 className="text-xl font-bold text-stone-900">Data Management</h3>
          </div>
          <div className="p-4 space-y-2">
            <button className="w-full flex items-center justify-between p-4 hover:bg-stone-50 rounded-2xl transition-all group">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-stone-600">Download Data Export</span>
              </div>
              <ChevronRight className="text-stone-300 group-hover:text-stone-500" size={18} />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-rose-50 rounded-2xl transition-all group">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-rose-600">Reset Organization Data</span>
              </div>
              <ChevronRight className="text-stone-300 group-hover:text-rose-500" size={18} />
            </button>
          </div>
        </motion.section>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center space-x-2 hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
