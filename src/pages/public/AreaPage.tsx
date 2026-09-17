/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, List, Info, Map as MapIcon, RefreshCw } from 'lucide-react';
import { gardens as fallbackGardens, areas as fallbackAreas, markers as fallbackMarkers, plants as fallbackPlants, categories as fallbackCategories } from '../../data';
import PlantMarker from '../../components/garden/PlantMarker';
import PlantPopup from '../../components/garden/PlantPopup';
import { Plant, GardenArea, Garden, PlantCategory } from '../../types';
import { subscribeToAreas, subscribeToGardens, subscribeToMarkers, subscribeToPlants, subscribeToCategories, recordScan } from '../../lib/db-utils';

export default function AreaPage() {
  const { gardenId, areaId, qrCode } = useParams<{ gardenId?: string; areaId?: string; qrCode?: string }>();
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showLegend, setShowLegend] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const recordedRef = useRef(false);

  const [areas, setAreas] = useState<GardenArea[]>([]);
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [categories, setCategories] = useState<PlantCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedAreas, setHasLoadedAreas] = useState(false);
  const [hasLoadedGardens, setHasLoadedGardens] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      subscribeToGardens((data) => {
        setGardens(data.length > 0 ? data : fallbackGardens as Garden[]);
        setHasLoadedGardens(true);
      }),
      subscribeToAreas(undefined, (data) => {
        setAreas(data.length > 0 ? data : fallbackAreas as GardenArea[]);
        setHasLoadedAreas(true);
      }),
      subscribeToMarkers(undefined, (data) => {
        setMarkers(data);
      }),
      subscribeToPlants((data) => setPlants(data)),
      subscribeToCategories((data) => setCategories(data.length > 0 ? data : fallbackCategories as PlantCategory[])),
    ];

    const timer = setTimeout(() => {
      setMarkers(prev => prev.length > 0 ? prev : fallbackMarkers);
      setPlants(prev => prev.length > 0 ? prev : fallbackPlants as Plant[]);
      setIsLoading(false);
    }, 2000);

    return () => {
      unsubs.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (hasLoadedAreas && hasLoadedGardens) {
      setIsLoading(false);
      
      // Record QR scan if arriving via QR code
      if (qrCode && !recordedRef.current) {
        const targetArea = areas.find(a => a.code?.toLowerCase() === qrCode.toLowerCase());
        if (targetArea) {
          recordScan(targetArea.id, 'area');
          recordedRef.current = true;
        }
      }
    }
  }, [hasLoadedAreas, hasLoadedGardens, areas, gardens, qrCode]);

  // Find the current area based on params
  const area = qrCode 
    ? areas.find(a => a.code?.trim().toLowerCase() === qrCode.trim().toLowerCase()) 
    : areas.find(a => a.id === areaId);
  
  const garden = gardens.find((g) => g.id === (area?.gardenId || gardenId));
  const areaMarkers = markers.filter((m) => m.areaId === area?.id);

  useEffect(() => {
    // Reset zoom on load
    setZoom(1);
  }, [area?.id]);

  if (isLoading || !hasLoadedAreas || !hasLoadedGardens) {
    return (
      <div className="pt-32 pb-24 min-h-screen flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Entering the Garden...</p>
      </div>
    );
  }

  if (!area || !garden) {
    return (
      <div className="pt-32 pb-24 min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info size={40} />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Garden Area Not Found</h2>
          <p className="text-stone-500 mb-8">
            {qrCode 
              ? `We couldn't find a zone matching the code "${qrCode}". (Found ${areas.length} active areas).`
              : 'The requested garden area may no longer be available.'
            }
          </p>
          <div className="space-y-3">
            <Link to="/" className="block w-full bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
              Go to Home Page
            </Link>
            <button 
              onClick={() => window.location.reload()}
              className="block w-full bg-stone-100 text-stone-600 px-8 py-3 rounded-xl font-bold hover:bg-stone-200 transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleMarkerClick = (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    if (plant) setSelectedPlant(plant);
  };

  return (
    <div className="pt-20 pb-24 bg-stone-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pt-8">
          <div>
            <Link to={`/garden/${garden.id}`} className="inline-flex items-center space-x-2 text-emerald-600 mb-3 font-medium hover:underline">
              <ArrowLeft size={16} />
              <span>{garden.name}</span>
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">{area.name}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="p-3 bg-white text-stone-600 rounded-2xl shadow-sm border border-stone-200 hover:text-emerald-600 transition-colors"
            >
              <List size={20} />
            </button>
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-stone-200">
              <button onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="p-2 text-stone-600 hover:text-emerald-600"><ZoomOut size={20} /></button>
              <button onClick={() => setZoom(1)} className="p-2 text-stone-600 hover:text-emerald-600 border-x border-stone-100"><RotateCcw size={20} /></button>
              <button onClick={() => setZoom(Math.min(3, zoom + 0.5))} className="p-2 text-stone-600 hover:text-emerald-600"><ZoomIn size={20} /></button>
            </div>
          </div>
        </div>

        {/* Interactive Map Section */}
        <div className="relative bg-stone-200 rounded-[3rem] overflow-hidden shadow-inner border-8 border-white min-h-[500px] flex items-center justify-center">
          <div
            ref={containerRef}
            className="relative w-full transition-transform duration-500 ease-out flex items-center justify-center"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            <img
              src={area.imageUrl}
              alt={area.name}
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
            
            {/* Markers Container - matches the aspect ratio of the image */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {areaMarkers.map((marker, index) => {
                const plant = plants.find((p) => p.id === marker.plantId);
                const category = categories.find((c) => c.id === plant?.categoryId);
                return (
                  <div key={marker.id} className="pointer-events-auto">
                    <PlantMarker
                      x={marker.x}
                      y={marker.y}
                      number={index + 1}
                      label={plant?.commonName}
                      active={selectedPlant?.id === marker.plantId}
                      onClick={() => handleMarkerClick(marker.plantId)}
                      color={category?.color}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Instructions */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-stone-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium flex items-center space-x-3 pointer-events-none">
            <MapIcon size={16} className="text-emerald-400" />
            <span>Tap markers to discover plants</span>
          </div>

          {/* Floating Legend */}
          <AnimatePresence>
            {showLegend && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-8 right-8 w-64 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/50 hidden md:block"
              >
                <h4 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-widest">Plant Locations</h4>
                <div className="space-y-3">
                  {areaMarkers.map((marker, idx) => {
                    const plant = plants.find((p) => p.id === marker.plantId);
                    const category = categories.find((c) => c.id === plant?.categoryId);
                    return (
                      <button
                        key={marker.id}
                        onClick={() => handleMarkerClick(marker.plantId)}
                        className="flex items-center space-x-3 w-full group text-left"
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: category?.color || '#059669' }}
                        >
                          {idx + 1}
                        </div>
                        <span className="text-xs font-medium text-stone-600 group-hover:text-stone-900 transition-colors truncate">
                          {plant?.commonName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend for Mobile */}
        <div className="mt-8 md:hidden">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm">
            <h4 className="text-sm font-bold text-stone-900 mb-6 uppercase tracking-widest flex items-center space-x-2">
              <List size={16} className="text-emerald-600" />
              <span>Plant Legend</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {areaMarkers.map((marker, idx) => {
                const plant = plants.find((p) => p.id === marker.plantId);
                const category = categories.find((c) => c.id === plant?.categoryId);
                return (
                  <button
                    key={marker.id}
                    onClick={() => handleMarkerClick(marker.plantId)}
                    className="flex items-center space-x-3 p-3 bg-stone-50 rounded-2xl active:scale-95 transition-all text-left"
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: category?.color || '#059669' }}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-xs font-semibold text-stone-700 truncate">
                      {plant?.commonName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100 h-full">
              <h3 className="text-2xl font-bold text-stone-900 mb-6 flex items-center space-x-3">
                <Info size={24} className="text-emerald-600" />
                <span>Area Overview</span>
              </h3>
              <p className="text-stone-600 leading-relaxed text-lg">
                {area.description}
              </p>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-emerald-900 p-10 rounded-[3rem] shadow-xl text-white h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-emerald-800 rounded-full blur-[80px]"></div>
              <h3 className="text-xl font-bold mb-6 relative z-10">Smart Garden Features</h3>
              <ul className="space-y-6 relative z-10">
                {[
                  { title: 'Digital Identification', desc: 'Identify any marked plant instantly' },
                  { title: 'Interactive Map', desc: 'Real-time positioning and visual guide' },
                  { title: 'QR Connectivity', desc: 'Jump to zones using physical codes' },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 shrink-0"></div>
                    <div>
                      <div className="font-bold text-sm mb-1">{item.title}</div>
                      <div className="text-emerald-300/60 text-xs">{item.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Plant Popup */}
      <AnimatePresence>
        {selectedPlant && (
          <PlantPopup
            plant={selectedPlant}
            category={categories.find(c => c.id === selectedPlant.categoryId)}
            onClose={() => setSelectedPlant(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
