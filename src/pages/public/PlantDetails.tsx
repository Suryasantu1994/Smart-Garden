/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useParams, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Droplets,
  Sun,
  Maximize2,
  Thermometer,
  Wind,
  MapPin,
  Calendar,
  History,
  Heart,
  ChevronRight,
  ShieldCheck,
  Zap,
  Sprout,
  RefreshCw,
  X
} from 'lucide-react';
import { plants as fallbackPlants, categories as fallbackCategories, areas as fallbackAreas } from '../../data';
import { getPlantById, getCategories, getAreas, recordScan, getPlants } from '../../lib/db-utils';
import { Plant, PlantCategory } from '../../types';

export default function PlantDetails() {
  const { plantId } = useParams<{ plantId: string }>();
  const location = useLocation();
  const [plant, setPlant] = useState<any | null>(null);
  const [category, setCategory] = useState<any | null>(null);
  const [activeAreas, setActiveAreas] = useState<any[]>([]);
  const [categories, setCategories] = useState<PlantCategory[]>([]);
  const [otherPlants, setOtherPlants] = useState<Plant[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    async function loadPlantData() {
      if (!plantId) return;
      setIsLoading(true);
      try {
        const [dbPlant, dbCategories, dbAreas, dbAllPlants] = await Promise.all([
          getPlantById(plantId),
          getCategories(),
          getAreas(),
          getPlants()
        ]);

        setCategories(dbCategories);

        if (dbPlant) {
          setPlant(dbPlant);
          setCategory(dbCategories.find(c => c.id === dbPlant.categoryId));
          setActiveAreas(dbAreas.slice(0, 2)); 
          
          // Random other plants
          const others = dbAllPlants
            .filter(p => p.id !== plantId)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
          setOtherPlants(others);

          // Check for QR scan
          const searchParams = new URLSearchParams(location.search);
          if (searchParams.get('ref') === 'qr' && !recordedRef.current) {
            recordScan(plantId, 'plant');
            recordedRef.current = true;
          }
        } else {
          // Fallback
          const fallbackP = fallbackPlants.find(p => p.id === plantId);
          if (fallbackP) {
            setPlant(fallbackP);
            setCategory(fallbackCategories.find(c => c.id === fallbackP.categoryId));
            setActiveAreas(fallbackAreas.slice(0, 2));
            setOtherPlants(fallbackPlants.filter(p => p.id !== plantId).slice(0, 3));
            
            // Check for QR scan
            const searchParams = new URLSearchParams(location.search);
            if (searchParams.get('ref') === 'qr' && !recordedRef.current) {
              recordScan(plantId, 'plant');
              recordedRef.current = true;
            }
          }
        }
      } catch (error) {
        console.error('Error loading plant details:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPlantData();
  }, [plantId, location.search]);

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    if (!isFavorite) {
      toast.success(`${plant?.commonName} added to favorites!`, {
        description: 'You can view your favorites in your profile.'
      });
    } else {
      toast.info(`${plant?.commonName} removed from favorites.`);
    }
  };

  if (isLoading) {
    return (
      <div className="pt-32 pb-24 min-h-screen flex flex-col items-center justify-center bg-stone-50 space-y-4">
        <RefreshCw className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Reading Botanical Records...</p>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-24 bg-stone-50 min-h-screen">
      {/* Header / Hero */}
      <section className="relative h-[60vh] min-h-[500px] overflow-hidden">
        <img
          src={plant.primaryImage}
          alt={plant.commonName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-transparent"></div>
        
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Link to="/explore" className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all">
                  <ArrowLeft size={20} />
                </Link>
                <span className="bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-emerald-900/20">
                  {category?.name}
                </span>
                <span className="bg-white/10 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-white/20">
                  {plant.family}
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">{plant.commonName}</h1>
              <p className="text-xl md:text-2xl text-emerald-400 font-medium italic mb-8">{plant.botanicalName}</p>
              
              <div className="flex flex-wrap gap-12">
                {[
                  { icon: Droplets, label: 'Water', value: plant.waterRequirement },
                  { icon: Sun, label: 'Sunlight', value: plant.sunlightRequirement },
                  { icon: Maximize2, label: 'Height', value: plant.averageHeight || '15-20m' },
                ].map((stat, idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
                      <stat.icon size={24} />
                    </div>
                    <div>
                      <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest">{stat.label}</div>
                      <div className="text-lg font-bold text-white capitalize">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pb-24">
        <div className="space-y-16">
          {/* Description */}
          <section>
            <h2 className="text-3xl font-bold text-stone-900 mb-8 flex items-center space-x-3">
              <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
              <span>Overview</span>
            </h2>
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100">
              <p className="text-xl text-stone-600 leading-relaxed mb-8">
                {plant.description}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-bold text-stone-900 flex items-center space-x-2">
                    <Zap size={18} className="text-emerald-600" />
                    <span>Key Benefits</span>
                  </h4>
                  <p className="text-stone-500 leading-relaxed">{plant.benefits}</p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-stone-900 flex items-center space-x-2">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    <span>Care Summary</span>
                  </h4>
                  <p className="text-stone-500 leading-relaxed">{plant.careInstructions}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Characteristics Grid */}
          <section>
            <h2 className="text-3xl font-bold text-stone-900 mb-8 flex items-center space-x-3">
              <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
              <span>Characteristics</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { icon: Thermometer, label: 'Temperature', value: plant.temperature || '20°C - 35°C' },
                { icon: Wind, label: 'Humidity', value: plant.humidity || 'Low-Mod' },
                { icon: History, label: 'Growth Rate', value: plant.growthRate || 'Fast' },
                { icon: Calendar, label: 'Blooming', value: plant.floweringSeason || 'Spring' },
                { icon: MapPin, label: 'Native Region', value: plant.nativeRegion || 'India' },
                { icon: Sprout, label: 'Scientific Name', value: plant.scientificName || plant.botanicalName },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col items-center text-center group hover:bg-emerald-50 transition-colors">
                  <div className="w-12 h-12 bg-stone-50 text-stone-400 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-emerald-600 transition-all">
                    <item.icon size={24} />
                  </div>
                  <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">{item.label}</div>
                  <div className="text-sm font-bold text-stone-900">{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Discover More Plants */}
          <section>
            <h2 className="text-3xl font-bold text-stone-900 mb-8 flex items-center space-x-3">
              <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
              <span>Discover More</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {otherPlants.map((p, idx) => {
                const plantCategory = categories.find(c => c.id === p.categoryId);
                return (
                  <Link
                    key={p.id}
                    to={`/plant/${p.id}`}
                    onClick={() => window.scrollTo(0, 0)}
                    className="group bg-white rounded-[2.5rem] overflow-hidden border border-stone-200 hover:border-emerald-200 transition-all hover:shadow-2xl hover:shadow-emerald-900/5 flex flex-col"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={p.primaryImage}
                        alt={p.commonName}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute top-4 left-4">
                        <span className="bg-white/90 backdrop-blur-md text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          {plantCategory?.name || 'Species'}
                        </span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                        <div className="bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">
                          View Details
                        </div>
                      </div>
                    </div>

                    <div className="p-6 flex-grow flex flex-col">
                      <h3 className="text-xl font-bold text-stone-900 mb-1 group-hover:text-emerald-600 transition-colors">
                        {p.commonName}
                      </h3>
                      <p className="text-stone-400 text-sm italic font-medium">
                        {p.botanicalName}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Lightbox */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
                onClick={() => setSelectedImage(null)}
              >
                <motion.button
                  className="absolute top-6 right-6 text-white/50 hover:text-white p-2"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={32} />
                </motion.button>

                <motion.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  src={selectedImage.replace('w=600', 'w=1200')} // High res for lightbox
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Favorites Button */}
          <div className="flex justify-center pt-8">
            <button 
              onClick={toggleFavorite}
              className={`flex items-center space-x-4 px-10 py-5 rounded-full font-bold transition-all active:scale-[0.98] shadow-2xl ${
                isFavorite 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-900/20' 
                  : 'bg-[#00a86b] hover:bg-[#00925d] text-white shadow-emerald-900/20'
              }`}
            >
              <Heart size={24} fill={isFavorite ? 'currentColor' : 'none'} className="transition-transform" />
              <span className="text-xl tracking-tight">{isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
