/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Save, AlertCircle, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { GardenArea } from '../../types';
import { compressImage } from '../../lib/image-utils';

interface AreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (area: Partial<GardenArea>) => void;
  area?: GardenArea | null;
  gardenId: string;
}

export default function AreaModal({ isOpen, onClose, onSave, area, gardenId }: AreaModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<GardenArea>>({
    gardenId: gardenId,
    name: '',
    code: '',
    description: '',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=800',
  });

  useEffect(() => {
    if (area) {
      setFormData(area);
    } else {
      setFormData({
        gardenId: gardenId,
        name: '',
        code: '',
        description: '',
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=800',
      });
    }
  }, [area, isOpen, gardenId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type', {
          description: 'Please upload only JPG, PNG or WEBP images.'
        });
        return;
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File too large', {
          description: 'Maximum image size is 10MB.'
        });
        return;
      }

      // Warning for Firestore document limits if using base64
      if (file.size > 1024 * 1024) {
        toast.warning('Large Image Detected', {
          description: 'While we support 10MB uploads, images larger than 1MB might experience slower loading in this demo environment.'
        });
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          // Even if we allow 10MB upload, we compress it to fit Firestore
          const compressed = await compressImage(base64);
          setFormData({ ...formData, imageUrl: compressed });
          toast.success('Image optimized for database storage');
        } catch (error) {
          console.error('Compression error:', error);
          setFormData({ ...formData, imageUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-stone-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
                {area ? 'Edit Area Details' : 'Add New Area'}
              </h2>
              <p className="text-stone-500 text-sm">Define the interactive zone information below.</p>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-stone-100 rounded-2xl text-stone-400 hover:text-stone-900 transition-all active:scale-90"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form Content */}
          <form id="area-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left Column: Media & Primary Info */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Area Map Image</label>
                  
                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="relative aspect-video rounded-3xl overflow-hidden bg-stone-50 border-2 border-dashed border-stone-200 group">
                    {formData.imageUrl ? (
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
                        <ImageIcon size={48} />
                        <span className="text-xs font-bold uppercase mt-2">No Image Selected</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        type="button" 
                        onClick={triggerFileSelect}
                        className="bg-white text-stone-900 px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 active:scale-95 transition-all"
                      >
                        <Upload size={18} />
                        <span>Change Image</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-400 text-center uppercase tracking-widest">Supports JPG, PNG, WEBP (Max 10MB)</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Area Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      placeholder="e.g. Medicinal Herb Section"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Area Code</label>
                      <input
                        required
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                        placeholder="e.g. MH-01"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Description */}
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Area Description</label>
                  <textarea
                    required
                    rows={12}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium resize-none"
                    placeholder="Describe what's in this area..."
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="p-8 border-t border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/50">
            <div className="flex items-center space-x-2 text-stone-400">
               <AlertCircle size={16} />
               <span className="text-[10px] font-bold uppercase tracking-widest">Unsaved changes will be lost</span>
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-4 rounded-2xl font-bold text-stone-600 hover:bg-stone-100 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                form="area-form"
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
              >
                <Save size={18} />
                <span>{area ? 'Update Area' : 'Create Area'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
