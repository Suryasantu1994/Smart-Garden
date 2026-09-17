/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PlantMarkerProps {
  x: number;
  y: number;
  label?: string;
  number: number;
  active?: boolean;
  onClick: () => void;
  color?: string;
}

export default function PlantMarker({ x, y, number, active, onClick, color, label }: PlantMarkerProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="absolute z-20 group"
      style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative flex flex-col items-center">
        {/* Plant Name Tag */}
        {label && (
          <div className={cn(
            "absolute bottom-full mb-2 whitespace-nowrap px-3 py-1.5 rounded-lg bg-stone-900 text-white text-[10px] font-bold shadow-xl transition-all duration-300 pointer-events-none",
            active ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100"
          )}>
            {label}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-stone-900" />
          </div>
        )}

        {/* Outer Ring Animation */}
        {active && (
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-emerald-400"
          />
        )}
        
        {/* Main Marker */}
        <div
          className={cn(
            "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white text-[10px] md:text-xs font-bold shadow-xl transition-all duration-300 border-2 border-white relative z-10",
            active ? "scale-110 ring-4 ring-emerald-500/30" : "hover:scale-105"
          )}
          style={{ backgroundColor: color || '#059669' }}
        >
          {number}
        </div>
      </div>
    </motion.button>
  );
}
