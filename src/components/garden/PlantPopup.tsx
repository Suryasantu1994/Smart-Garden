/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, Droplets, Sun, Maximize2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Plant, PlantCategory } from '../../types';

interface PlantPopupProps {
  plant: Plant;
  category?: PlantCategory;
  onClose: () => void;
}

export default function PlantPopup({ plant, category, onClose }: PlantPopupProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[60]"
      />

      {/* Popup Container */}
      <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-6 pointer-events-none">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full max-w-lg md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90vh] md:max-h-[80vh]"
        >
          {/* Header Image */}
          <div className="relative h-48 md:h-64 shrink-0">
            <img
              src={plant.primaryImage}
              alt={plant.commonName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="absolute bottom-6 left-8">
              <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block">
                {category?.name || 'Plant'}
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{plant.commonName}</h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 md:p-10 overflow-y-auto">
            <div className="mb-6">
              <span className="text-sm italic text-emerald-600 font-medium">{plant.botanicalName}</span>
              <p className="text-stone-500 text-sm mt-4 leading-relaxed line-clamp-3">
                {plant.shortDescription}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-stone-50 p-4 rounded-2xl flex flex-col items-center text-center">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-2">
                  <Droplets size={18} />
                </div>
                <div className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Water</div>
                <div className="text-xs font-bold text-stone-900 capitalize">{plant.waterRequirement}</div>
              </div>
              <div className="bg-stone-50 p-4 rounded-2xl flex flex-col items-center text-center">
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mb-2">
                  <Sun size={18} />
                </div>
                <div className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Sunlight</div>
                <div className="text-xs font-bold text-stone-900 capitalize">{plant.sunlightRequirement}</div>
              </div>
              <div className="bg-stone-50 p-4 rounded-2xl flex flex-col items-center text-center">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-2">
                  <Maximize2 size={18} />
                </div>
                <div className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Height</div>
                <div className="text-xs font-bold text-stone-900 capitalize">{plant.averageHeight || 'N/A'}</div>
              </div>
            </div>

            <Link
              to={`/plant/${plant.id}`}
              className="w-full bg-stone-900 hover:bg-emerald-600 text-white py-5 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all active:scale-[0.98] group"
            >
              <span>View Full Details</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
