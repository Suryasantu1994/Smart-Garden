/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Search, 
  Image as ImageIcon,
  Check,
  X,
  MapPin,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { gardens as fallbackGardens, areas as fallbackAreas, markers as fallbackMarkers, plants as fallbackPlants, categories as fallbackCategories } from '../../data';
import { PlantMarker, Plant, GardenArea, PlantCategory } from '../../types';
import { subscribeToAreas, subscribeToMarkers, subscribeToPlants, subscribeToCategories, saveMarker, deleteMarker } from '../../lib/db-utils';

export default function AdminAreaMapEditor() {
  const { areaId } = useParams<{ areaId: string }>();
  const [markers, setMarkers] = useState<PlantMarker[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [categories, setCategories] = useState<PlantCategory[]>([]);
  const [areas, setAreas] = useState<GardenArea[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [showPlantSearch, setShowPlantSearch] = useState(false);
  const [plantSearchQuery, setPlantSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedMarkerIds, setDeletedMarkerIds] = useState<string[]>([]);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      subscribeToAreas(undefined, (data) => setAreas(data.length > 0 ? data : fallbackAreas as GardenArea[])),
      subscribeToMarkers(areaId, (data) => {
        setMarkers(data.length > 0 ? data : fallbackMarkers.filter(m => m.areaId === areaId));
      }),
      subscribeToPlants((data) => setPlants(data.length > 0 ? data : fallbackPlants as Plant[])),
      subscribeToCategories((data) => setCategories(data.length > 0 ? data : fallbackCategories as PlantCategory[])),
    ];

    const timer = setTimeout(() => setIsLoading(false), 2000);

    return () => {
      unsubs.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, [areaId]);

  const area = areas.find(a => a.id === areaId);

  const filteredPlants = plants.filter(p => 
    p.commonName.toLowerCase().includes(plantSearchQuery.toLowerCase()) ||
    p.botanicalName.toLowerCase().includes(plantSearchQuery.toLowerCase())
  );

  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !areaId) return;
    
    // Calculate click position as percentage of image
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker: PlantMarker = {
      id: `m-new-${Date.now()}`,
      areaId: areaId,
      plantId: '', // To be selected
      x,
      y,
      status: 'active'
    };

    setMarkers([...markers, newMarker]);
    setSelectedMarkerId(newMarker.id);
    setShowPlantSearch(true);
  };

  const selectPlantForMarker = (plantId: string) => {
    setMarkers(markers.map(m => 
      m.id === selectedMarkerId ? { ...m, plantId } : m
    ));
    setShowPlantSearch(false);
    // Keep it selected so they can see the details in sidebar
  };

  const deleteMarkerLocal = (id: string) => {
    if (!id.startsWith('m-new-')) {
      setDeletedMarkerIds([...deletedMarkerIds, id]);
    }
    setMarkers(markers.filter(m => m.id !== id));
    setSelectedMarkerId(null);
  };

  const handleSaveMap = async () => {
    setIsSaving(true);
    try {
      // 1. Delete markers that were removed
      for (const id of deletedMarkerIds) {
        await deleteMarker(id);
      }
      
      // 2. Save current markers
      for (const marker of markers) {
        if (!marker.plantId) continue; // Skip unlinked markers
        await saveMarker(marker);
      }

      setDeletedMarkerIds([]);
      toast.success('Map markers saved successfully!', {
        description: 'All changes have been synced to the database.'
      });
    } catch (error) {
      console.error('Error saving map:', error);
      toast.error('Failed to save markers.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Loading Editor...</p>
      </div>
    );
  }

  if (!area) return <div>Area not found</div>;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <header className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center space-x-4">
          <Link to={`/admin/gardens/${area.gardenId}/areas`} className="p-2 bg-white rounded-xl border border-stone-200 text-stone-600 hover:text-emerald-600 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Marker Editor: {area.name}</h1>
            <p className="text-xs text-stone-500 font-medium">Click on the image to place a plant marker.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           <div className="flex bg-white p-1 rounded-xl border border-stone-200 shadow-sm mr-4">
              <button onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} className="p-2 text-stone-600 hover:text-emerald-600"><ZoomOut size={18} /></button>
              <button onClick={() => setZoom(1)} className="p-2 text-stone-600 hover:text-emerald-600 border-x border-stone-100 text-[10px] font-bold px-3">100%</button>
              <button onClick={() => setZoom(Math.min(2, zoom + 0.2))} className="p-2 text-stone-600 hover:text-emerald-600"><ZoomIn size={18} /></button>
           </div>
           <button 
             onClick={handleSaveMap}
             disabled={isSaving}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
           >
              {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
              <span>{isSaving ? 'Saving...' : 'Save Map'}</span>
           </button>
        </div>
      </header>

      <div className="flex-grow flex gap-8 min-h-0">
        {/* Map Canvas */}
        <div className="flex-grow bg-stone-200 rounded-[2.5rem] border-4 border-white shadow-inner overflow-hidden relative group">
          <div 
            ref={containerRef}
            className="w-full h-full overflow-auto flex items-center justify-center p-12"
          >
            <div 
              className="relative cursor-crosshair shadow-2xl transition-transform duration-300"
              style={{ transform: `scale(${zoom})` }}
              onClick={handleImageClick}
            >
              <img 
                ref={imageRef}
                src={area.imageUrl} 
                alt="Area" 
                className="max-w-full max-h-[70vh] rounded-xl select-none"
                draggable={false}
              />
              
              {/* Render Markers */}
              {markers.map((marker, idx) => {
                const plant = plants.find(p => p.id === marker.plantId);
                const category = categories.find(c => c.id === plant?.categoryId);
                const isSelected = selectedMarkerId === marker.id;
                
                return (
                  <motion.div
                    key={marker.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute z-20 transition-all ${isSelected ? 'z-30' : ''}`}
                    style={{ top: `${marker.y}%`, left: `${marker.x}%`, transform: 'translate(-50%, -50%)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMarkerId(marker.id);
                    }}
                  >
                    <div className="relative flex flex-col items-center">
                      {plant && (
                        <div className={`
                          absolute bottom-full mb-2 whitespace-nowrap px-2 py-1 rounded-lg bg-stone-900 text-white text-[9px] font-bold shadow-xl transition-all duration-300 pointer-events-none
                          ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'}
                        `}>
                          {plant.commonName}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[3px] border-t-stone-900" />
                        </div>
                      )}
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-lg cursor-grab active:cursor-grabbing
                        ${isSelected ? 'ring-4 ring-emerald-500/50 scale-125' : 'hover:scale-110'}
                        ${!marker.plantId ? 'bg-stone-400 animate-pulse' : ''}
                      `}
                      style={{ backgroundColor: !marker.plantId ? undefined : (category?.color || '#059669') }}
                      >
                        {idx + 1}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          <div className="absolute top-6 left-6 flex space-x-2 pointer-events-none">
             <div className="bg-stone-900/80 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center space-x-2">
                <MapPin size={12} className="text-emerald-400" />
                <span>{markers.length} Markers Placed</span>
             </div>
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 flex-grow overflow-y-auto">
            <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center space-x-2">
               <Plus className="text-emerald-600" size={20} />
               <span>Marker Details</span>
            </h3>

            {selectedMarkerId ? (
              <div className="space-y-6">
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                   <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Position</div>
                   <div className="text-xs font-mono text-emerald-800">
                      X: {markers.find(m => m.id === selectedMarkerId)?.x.toFixed(2)}%<br />
                      Y: {markers.find(m => m.id === selectedMarkerId)?.y.toFixed(2)}%
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Linked Plant</label>
                   {markers.find(m => m.id === selectedMarkerId)?.plantId ? (
                     <div className="flex items-center space-x-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                           <img 
                             src={plants.find(p => p.id === markers.find(m => m.id === selectedMarkerId)?.plantId)?.primaryImage} 
                             alt="" className="w-full h-full object-cover" 
                           />
                        </div>
                        <div className="flex-grow overflow-hidden">
                           <div className="text-sm font-bold text-stone-900 truncate">
                             {plants.find(p => p.id === markers.find(m => m.id === selectedMarkerId)?.plantId)?.commonName}
                           </div>
                           <button onClick={() => setShowPlantSearch(true)} className="text-[10px] font-bold text-emerald-600 hover:underline">Change Plant</button>
                        </div>
                     </div>
                   ) : (
                     <button 
                       onClick={() => setShowPlantSearch(true)}
                       className="w-full p-4 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 text-sm font-bold hover:border-emerald-200 hover:text-emerald-600 transition-all flex flex-col items-center gap-2"
                     >
                        <Search size={20} />
                        <span>Link to Plant</span>
                     </button>
                   )}
                </div>

                <div className="pt-6 border-t border-stone-50">
                   <button 
                     onClick={() => deleteMarkerLocal(selectedMarkerId)}
                     className="w-full flex items-center justify-center space-x-2 py-4 text-rose-500 font-bold hover:bg-rose-50 rounded-2xl transition-colors"
                   >
                      <Trash2 size={18} />
                      <span>Remove Marker</span>
                   </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 space-y-4">
                 <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center">
                    <MapPin size={32} />
                 </div>
                 <p className="text-sm">Select a marker on the map to edit its details.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plant Search Modal */}
      <AnimatePresence>
        {showPlantSearch && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlantSearch(false)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-xl h-[600px] bg-white rounded-[3rem] shadow-2xl z-[210] p-10 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Select Plant</h2>
                 <button onClick={() => setShowPlantSearch(false)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                    <X size={24} />
                 </button>
              </div>

              <div className="relative mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                 <input 
                   type="text" 
                   autoFocus
                   placeholder="Search plant database..."
                   value={plantSearchQuery}
                   onChange={(e) => setPlantSearchQuery(e.target.value)}
                   className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                 />
              </div>

              <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                 {filteredPlants.map(plant => (
                   <button
                     key={plant.id}
                     onClick={() => selectPlantForMarker(plant.id)}
                     className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all text-left group"
                   >
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-stone-200 shrink-0">
                         <img src={plant.primaryImage} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow">
                         <div className="text-stone-900 font-bold group-hover:text-emerald-700 transition-colors">{plant.commonName}</div>
                         <div className="text-xs italic text-stone-400">{plant.botanicalName}</div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center">
                            <Check size={18} />
                         </div>
                      </div>
                   </button>
                 ))}
                 {filteredPlants.length === 0 && (
                   <div className="text-center py-12 text-stone-400">
                      No plants found matching your search.
                   </div>
                 )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
