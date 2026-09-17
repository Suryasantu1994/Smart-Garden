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
  LayoutGrid
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { subscribeToAreas, subscribeToGardens, subscribeToScans } from '../../lib/db-utils';
import { GardenArea, Garden } from '../../types';
import { getBasePublicUrl } from '../../constants';

export default function AdminQRCodes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [areas, setAreas] = useState<GardenArea[]>([]);
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      subscribeToGardens(setGardens),
      subscribeToAreas(undefined, setAreas),
      subscribeToScans(setScans)
    ];

    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      unsubs.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, []);

  const qrCodes = areas.map((area) => {
    const garden = gardens.find(g => g.id === area.gardenId);
    const areaScans = scans.filter(s => s.areaId === area.id).length;
    
    // Use central public URL for all QR codes
    const baseUrl = getBasePublicUrl();
    const scanUrl = `${baseUrl}/scan/${area.code}`;

    return {
      id: `qr-${area.id}`,
      areaName: area.name,
      gardenName: garden?.name || 'Unknown Garden',
      code: area.code,
      url: scanUrl,
      scans: areaScans,
      createdAt: area.createdAt ? new Date(area.createdAt).toLocaleDateString() : 'N/A'
    };
  }).filter(qr => 
    qr.areaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    qr.gardenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    qr.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  const handleDownload = (id: string, name: string) => {
    const svg = document.querySelector(`#${id} svg`);
    if (!svg) {
      toast.error('Could not find QR code element');
      return;
    }
    
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
        toast.success(`QR Code for ${name} downloaded!`);
      };
      
      img.src = url;
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download QR code');
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
      <header>
        <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">QR Code Management</h1>
        <p className="text-stone-500">Generate, download, and track QR codes for your garden areas.</p>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search by area, garden or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>

      {qrCodes.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border border-dashed border-stone-200 text-center">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
            <QrIcon size={40} />
          </div>
          <h3 className="text-xl font-bold text-stone-900 mb-2">No QR Codes Found</h3>
          <p className="text-stone-500 max-w-md mx-auto">
            {searchQuery 
              ? `We couldn't find any QR codes matching "${searchQuery}".` 
              : "You haven't created any garden areas yet. Create an area first to generate its QR code."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {qrCodes.map((qr, idx) => (
            <motion.div
              key={qr.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
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
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">{qr.gardenName}</div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">{qr.areaName}</h3>
                <div className="flex items-center space-x-2">
                  <div className="text-[10px] font-mono text-stone-400 bg-stone-50 px-2 py-1 rounded-md">
                    {qr.code}
                  </div>
                  <div className="text-[10px] font-medium text-stone-400 truncate max-w-[150px]">
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
                  onClick={() => handleDownload(qr.id, qr.areaName)}
                  className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all active:scale-95"
                  title="Download PNG"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={() => handlePrint(qr.areaName)}
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
    </div>
  );
}
