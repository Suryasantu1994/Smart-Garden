/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/public/Home';
import ExploreGardens from './pages/public/ExploreGardens';
import ExplorePlants from './pages/public/ExplorePlants';
import GardenDetails from './pages/public/GardenDetails';
import AreaPage from './pages/public/AreaPage';
import PlantDetails from './pages/public/PlantDetails';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGardens from './pages/admin/AdminGardens';
import AdminAreas from './pages/admin/AdminAreas';
import AdminPlants from './pages/admin/AdminPlants';
import AdminCategories from './pages/admin/AdminCategories';
import AdminQRCodes from './pages/admin/AdminQRCodes';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAreaMapEditor from './pages/admin/AdminAreaMapEditor';
import AdminLayout from './components/layout/AdminLayout';
import { FirebaseProvider, useFirebase } from './components/FirebaseProvider';
import { getUpgradeLink } from './lib/firebase';
import { AlertCircle, ExternalLink, RefreshCcw } from 'lucide-react';

function QuotaBanner() {
  const { quotaExceeded, isAdmin, resetQuota } = useFirebase();
  
  if (!quotaExceeded) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center space-x-3 sticky top-0 z-[1000] animate-in slide-in-from-top duration-500">
      <AlertCircle size={16} className="shrink-0" />
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>Showing live local botanical records while the cloud database is busy.</span>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={resetQuota}
            className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition-colors border border-white/20"
          >
            <RefreshCcw size={12} />
            <span>Sync Cloud</span>
          </button>

          {isAdmin && (
            <a 
              href={getUpgradeLink()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-rose-100 inline-flex items-center font-bold"
            >
              Upgrade live capacity <ExternalLink size={12} className="ml-1" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useFirebase();
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Verifying Admin Access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-stone-50 font-sans text-stone-900">
        <QuotaBanner />
        <Toaster position="top-center" richColors expand={false} />
        <Routes>
          {/* Public Routes */}
          <Route
            path="/*"
            element={
              <>
                <Navbar />
                <main className="flex-grow">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/explore" element={<ExploreGardens />} />
                    <Route path="/plants" element={<ExplorePlants />} />
                    <Route path="/garden/:gardenId" element={<GardenDetails />} />
                    <Route path="/garden/:gardenId/area/:areaId" element={<AreaPage />} />
                    <Route path="/plant/:plantId" element={<PlantDetails />} />
                    <Route path="/scan/:qrCode" element={<AreaPage />} />
                  </Routes>
                </main>
                <Footer />
              </>
            }
          />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin onLogin={() => {}} />} />
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminLayout onLogout={() => {}}>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/gardens" element={<AdminGardens />} />
                    <Route path="/gardens/:gardenId/areas" element={<AdminAreas />} />
                    <Route path="/areas/:areaId/map" element={<AdminAreaMapEditor />} />
                    <Route path="/plants" element={<AdminPlants />} />
                    <Route path="/categories" element={<AdminCategories />} />
                    <Route path="/qr-codes" element={<AdminQRCodes />} />
                    <Route path="/analytics" element={<AdminAnalytics />} />
                    <Route path="/settings" element={<AdminSettings />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Routes>
                </AdminLayout>
              </AdminRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
