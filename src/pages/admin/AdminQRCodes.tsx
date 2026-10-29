/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, 
  Printer, 
  Copy, 
  RefreshCcw, 
  Search, 
  ExternalLink,
  QrCode as QrIcon,
  LayoutGrid,
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { subscribeToAreas, subscribeToGardens, subscribeToScans, subscribeToPlants } from '../../lib/db-utils';
import { GardenArea, Garden, Plant } from '../../types';
import { getBasePublicUrl } from '../../constants';

export default function AdminQRCodes() {
  const [activeTab, setActiveTab] = useState<'areas' | 'plants'>('areas');
  const [searchQuery, setSearchQuery] = useState('');
  const [areas, setAreas] = useState<GardenArea[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      subscribeToGardens(setGardens),
      subscribeToAreas(undefined, setAreas),
      subscribeToPlants(setPlants),
      subscribeToScans(setScans)
    ];

    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      unsubs.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, []);

  const qrCodes = (activeTab === 'areas' ? areas : plants).map((item) => {
    const baseUrl = getBasePublicUrl();
    
    if (activeTab === 'areas') {
      const area = item as GardenArea;
      const garden = gardens.find(g => g.id === area.gardenId);
      const areaScans = scans.filter(s => s.areaId === area.id).length;
      const scanUrl = `${baseUrl}/scan/${area.code}`;
      
      return {
        id: `qr-${area.id}`,
        title: area.name,
        subtitle: garden?.name || 'Unknown Garden',
        code: area.code,
        url: scanUrl,
        scans: areaScans,
        createdAt: area.createdAt ? new Date(area.createdAt).toLocaleDateString() : 'N/A'
      };
    } else {
      const plant = item as Plant;
      const plantScans = scans.filter(s => s.plantId === plant.id).length;
      const scanUrl = `${baseUrl}/plant/${plant.id}`;
      
      return {
        id: `qr-${plant.id}`,
        title: plant.commonName,
        subtitle: plant.scientificName || plant.botanicalName || 'Unknown Species',
        code: plant.id,
        url: scanUrl,
        scans: plantScans,
        createdAt: plant.createdAt ? new Date(plant.createdAt).toLocaleDateString() : 'N/A'
      };
    }
  }).filter(qr => 
    qr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    qr.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    qr.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  const downloadQR = async (id: string, name: string, silent = false) => {
    const svg = document.querySelector(`#${id} svg`);
    if (!svg) {
      if (!silent) toast.error(`Could not find QR code element for ${name}`);
      return;
    }
    
    return new Promise<void>((resolve, reject) => {
      try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width * 2; // Higher resolution
          canvas.height = img.height * 2;
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
          }
          
          const pngFile = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.download = `QR-${name.replace(/\s+/g, '-').toLowerCase()}.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
          URL.revokeObjectURL(url);
          if (!silent) toast.success(`QR Code for ${name} downloaded!`);
          resolve();
        };

        img.onerror = () => {
          if (!silent) toast.error(`Failed to load image for ${name}`);
          reject();
        };
        
        img.src = url;
      } catch (error) {
        console.error('Download error:', error);
        if (!silent) toast.error(`Failed to download QR code for ${name}`);
        reject();
      }
    });
  };

  const handleDownloadAll = async () => {
    if (qrCodes.length === 0) return;
    
    setIsDownloadingAll(true);
    toast.info(`Starting bulk download of ${qrCodes.length} QR codes...`);
    
    try {
      // Process in small batches or with small delays to avoid browser issues
      for (let i = 0; i < qrCodes.length; i++) {
        const qr = qrCodes[i];
        await downloadQR(qr.id, qr.title, true);
        // Small delay to prevent too many simultaneous downloads
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 100));
      }
      toast.success(`Successfully downloaded ${qrCodes.length} QR codes!`);
    } catch (error) {
      toast.error('Bulk download encountered an error');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handlePrint = (name: string) => {
    toast.info(`Preparing print view... Use your browser's print dialog.`);
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <RefreshCcw className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Loading QR Codes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">QR Code Management</h1>
          <p className="text-stone-500">Generate, download, and track QR codes for your garden areas and plants.</p>
        </div>
        
        <div className="flex bg-stone-100 p-1 rounded-2xl self-start md:self-end">
          <button
            onClick={() => setActiveTab('areas')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'areas' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <LayoutGrid size={14} />
              <span>Garden Areas</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('plants')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'plants' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Leaf size={14} />
              <span>Individual Plants</span>
            </div>
          </button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'areas' ? 'areas' : 'plants'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
        
        <button
          onClick={handleDownloadAll}
          disabled={isDownloadingAll || qrCodes.length === 0}
          className="w-full md:w-auto flex items-center justify-center space-x-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isDownloadingAll ? (
            <RefreshCcw size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          <span>Download All ({qrCodes.length})</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {qrCodes.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border border-dashed border-stone-200 text-center">
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
                <QrIcon size={40} />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">No QR Codes Found</h3>
              <p className="text-stone-500 max-w-md mx-auto">
                {searchQuery 
                  ? `We couldn't find any QR codes matching "${searchQuery}" in ${activeTab === 'areas' ? 'Garden Areas' : 'Plants'}.` 
                  : activeTab === 'areas' 
                    ? "You haven't created any garden areas yet."
                    : "You haven't added any plants yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {qrCodes.map((qr, idx) => (
                <motion.div
                  key={qr.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm group hover:shadow-xl hover:shadow-emerald-900/5 transition-all"
                >
                  <div 
                    id={qr.id}
                    className="flex justify-center mb-8 bg-stone-50 p-8 rounded-3xl border border-stone-100 group-hover:bg-white group-hover:border-emerald-100 transition-all"
                  >
                    <div className="p-4 bg-white rounded-2xl shadow-xl shadow-stone-900/5">
                      <QRCodeSVG value={qr.url} size={150} level="H" includeMargin={true} />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 truncate">{qr.subtitle}</div>
                    <h3 className="text-xl font-bold text-stone-900 mb-2 truncate" title={qr.title}>{qr.title}</h3>
                    <div className="flex items-center space-x-2">
                      <div className="text-[10px] font-mono text-stone-400 bg-stone-50 px-2 py-1 rounded-md shrink-0">
                        {qr.code}
                      </div>
                      <div className="text-[10px] font-medium text-stone-400 truncate">
                        {qr.url}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="bg-stone-50 p-4 rounded-2xl">
                        <div className="text-[10px] text-stone-400 font-bold uppercase tracking-tight mb-1">Total Scans</div>
                        <div className="text-lg font-black text-stone-900">{qr.scans}</div>
                     </div>
                     <div className="bg-stone-50 p-4 rounded-2xl">
                        <div className="text-[10px] text-stone-400 font-bold uppercase tracking-tight mb-1">Created</div>
                        <div className="text-xs font-bold text-stone-900">{qr.createdAt}</div>
                     </div>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => copyToClipboard(qr.url)}
                      className="flex-grow flex items-center justify-center space-x-2 py-3 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all active:scale-95"
                    >
                      <Copy size={14} />
                      <span>Copy URL</span>
                    </button>
                    <button 
                      onClick={() => downloadQR(qr.id, qr.title)}
                      className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all active:scale-95"
                      title="Download PNG"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={() => handlePrint(qr.title)}
                      className="p-3 bg-stone-50 text-stone-400 rounded-xl hover:text-stone-900 transition-all active:scale-95"
                      title="Print QR"
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
