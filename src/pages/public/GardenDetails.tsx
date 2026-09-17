/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, TreePine, LayoutGrid, ArrowLeft, ArrowRight, Info, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { gardens as fallbackGardens, areas as fallbackAreas, plants as fallbackPlants, markers as fallbackMarkers } from '../../data';
import { getGardenById, getAreas, getMarkers } from '../../lib/db-utils';

export default function GardenDetails() {
  const { gardenId } = useParams<{ gardenId: string }>();
  const [garden, setGarden] = useState<any | null>(null);
  const [gardenAreas, setGardenAreas] = useState<any[]>([]);
  const [allMarkers, setAllMarkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGardenData() {
      if (!gardenId) return;
      setIsLoading(true);
      try {
        const [dbGarden, dbAreas, dbMarkers] = await Promise.all([
          getGardenById(gardenId),
          getAreas(gardenId),
          getMarkers()
        ]);

        if (dbGarden) {
          setGarden(dbGarden);
          setGardenAreas(dbAreas);
          setAllMarkers(dbMarkers);
        } else {
          // Fallback to static data
          const fallbackG = fallbackGardens.find(g => g.id === gardenId);
          if (fallbackG) {
            setGarden(fallbackG);
            setGardenAreas(fallbackAreas.filter(a => a.gardenId === gardenId));
            setAllMarkers(fallbackMarkers);
          }
        }
      } catch (error) {
        console.error('Error loading garden details:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadGardenData();
  }, [gardenId]);

  if (isLoading) {
    return (
      <div className="pt-32 pb-24 min-h-screen flex flex-col items-center justify-center bg-stone-50 space-y-4">
        <RefreshCw className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Entering the Sanctuary...</p>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-24 bg-stone-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src={garden.coverImage}
          alt={garden.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-transparent"></div>
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link to="/explore" className="inline-flex items-center space-x-2 text-emerald-400 mb-6 font-medium hover:text-emerald-300 transition-colors">
                <ArrowLeft size={16} />
                <span>Back to Explore</span>
              </Link>
              <div className="flex items-center space-x-3 text-emerald-400 mb-4">
                <MapPin size={18} />
                <span className="text-sm font-bold uppercase tracking-widest">{garden.location}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">{garden.name}</h1>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-3 bg-stone-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-white shadow-2xl">
                  <LayoutGrid size={20} className="text-emerald-400" />
                  <span className="text-lg font-bold">
                    {gardenAreas.length} <span className="font-medium text-stone-200 ml-1">Areas</span>
                  </span>
                </div>
                <div className="flex items-center space-x-3 bg-stone-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-white shadow-2xl">
                  <TreePine size={20} className="text-emerald-400" />
                  <span className="text-lg font-bold">
                    {allMarkers.filter(m => gardenAreas.some(a => a.id === m.areaId)).length || (gardenId === 'vbf' ? 8 : 0)} <span className="font-medium text-stone-200 ml-1">Plants</span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-16 bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center space-x-2">
              <Info className="text-emerald-600" size={24} />
              <span>About this Garden</span>
            </h2>
            <p className="text-lg text-stone-600 leading-relaxed italic">
              "{garden.description}"
            </p>
          </div>
        </div>
      </section>

      {/* Areas Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-stone-900 mb-2">Garden Areas</h2>
            <p className="text-stone-500">Explore the different zones within this garden to discover unique plant collections.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {gardenAreas.map((area, idx) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="group relative h-[400px] rounded-[2.5rem] overflow-hidden border border-stone-200 shadow-sm hover:shadow-2xl hover:shadow-emerald-900/10 transition-all"
              >
                <img
                  src={area.imageUrl}
                  alt={area.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent"></div>
                
                <div className="absolute inset-0 p-10 flex flex-col justify-end">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg">
                      {area.code}
                    </span>
                    <span className="bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-white/10 flex items-center space-x-2 shadow-xl">
                      <TreePine size={12} className="text-emerald-400" />
                      <span>{allMarkers.filter(m => m.areaId === area.id).length || 8} Plants</span>
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-emerald-400 transition-colors">
                    {area.name}
                  </h3>
                  <p className="text-stone-300 text-sm leading-relaxed mb-8 max-w-md line-clamp-2">
                    {area.description}
                  </p>
                  <Link
                    to={`/garden/${garden.id}/area/${area.id}`}
                    className="inline-flex items-center space-x-3 bg-white hover:bg-emerald-600 text-stone-900 hover:text-white px-8 py-4 rounded-2xl font-bold transition-all self-start active:scale-95 group/btn shadow-xl shadow-stone-900/20"
                  >
                    <span>Explore Area</span>
                    <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {gardenAreas.length === 0 && (
            <div className="text-center py-20 bg-stone-100 rounded-[3rem] border border-dashed border-stone-300">
              <LayoutGrid size={48} className="mx-auto text-stone-300 mb-4" />
              <p className="text-stone-500 font-medium">No areas mapped for this garden yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
