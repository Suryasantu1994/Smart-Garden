/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  LayoutGrid,
  ArrowLeft,
  Map as MapIcon,
  QrCode,
  RefreshCw,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { areas as fallbackAreas, gardens as fallbackGardens } from '../../data';
import { GardenArea, Garden } from '../../types';
import { subscribeToAreas, deleteArea, saveArea, getGardenById } from '../../lib/db-utils';
import { db } from '../../lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import AreaModal from '../../components/admin/AreaModal';

export default function AdminAreas() {
  const { gardenId } = useParams<{ gardenId: string }>();
  const [areas, setAreas] = useState<GardenArea[]>([]);
  const [garden, setGarden] = useState<Garden | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<GardenArea | null>(null);

  useEffect(() => {
    if (!gardenId) return;

    setIsLoading(true);
    
    // Fetch garden details
    getGardenById(gardenId).then(dbGarden => {
      if (dbGarden) {
        setGarden(dbGarden as Garden);
      } else {
        setGarden(fallbackGardens.find(g => g.id === gardenId) as Garden || null);
      }
    });

    // Subscribe to areas
    const unsubscribe = subscribeToAreas(gardenId, (dbAreas) => {
      setAreas(dbAreas.length > 0 ? dbAreas : fallbackAreas.filter(a => a.gardenId === gardenId) as GardenArea[]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [gardenId]);

  const handleSeedData = async () => {
    if (!gardenId) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      const areasToSeed = fallbackAreas.filter(a => a.gardenId === gardenId);
      
      for (const area of areasToSeed) {
        const areaRef = doc(db, 'areas', area.id);
        batch.set(areaRef, {
          ...area,
          createdAt: new Date().toISOString(),
          displayOrder: 0,
        });
      }

      await batch.commit();
      toast.success('Areas seeded to Firestore!');
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed areas.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteArea(id);
        toast.success(`Area "${name}" deleted.`);
      } catch (error) {
        toast.error('Failed to delete area.');
      }
    }
  };

  const handleSaveArea = async (areaData: Partial<GardenArea>) => {
    try {
      await saveArea(areaData);
      setIsModalOpen(false);
      setSelectedArea(null);
      toast.success(areaData.id ? 'Area updated successfully!' : 'Area created successfully!');
    } catch (error) {
      toast.error('Failed to save area.');
    }
  };

  const openEditModal = (area: GardenArea) => {
    setSelectedArea(area);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedArea(null);
    setIsModalOpen(true);
  };

  const handleGetQR = (area: GardenArea) => {
    // Intelligent Domain Switching to ensure QR codes always point to the public site
    const currentOrigin = window.location.origin;
    let baseUrl = currentOrigin;
    if (currentOrigin.includes('ais-dev-')) {
      baseUrl = currentOrigin.replace('ais-dev-', 'ais-pre-');
    }
    
    const publicUrl = `${baseUrl}/scan/${area.code}`;
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`, '_blank');
    toast.success(`QR Code generated for ${area.name}`);
  };

  const filteredAreas = areas.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Loading Garden Areas...</p>
      </div>
    );
  }

  if (!garden) return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold">Garden not found</h2>
      <Link to="/admin/gardens" className="text-emerald-600 hover:underline mt-4 inline-block">Back to Gardens</Link>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/admin/gardens" className="inline-flex items-center space-x-2 text-emerald-600 mb-2 text-sm font-bold hover:underline">
            <ArrowLeft size={14} />
            <span>Back to Gardens</span>
          </Link>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">Areas in {garden.name}</h1>
          <p className="text-stone-50">Manage interactive zones and sections within this garden.</p>
        </div>
        <div className="flex space-x-3">
          {areas.length > 0 && !areas.some(a => a.id.startsWith('a-')) && (
            <button 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Database size={20} />
              <span>{isSeeding ? 'Seeding...' : 'Seed Areas'}</span>
            </button>
          )}
          <button 
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Plus size={20} />
            <span>Add New Area</span>
          </button>
        </div>
      </header>

      {/* Area Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredAreas.map((area, idx) => (
          <motion.div
            key={area.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white rounded-[2.5rem] overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all flex flex-col"
          >
            <div className="relative h-48 overflow-hidden bg-stone-100">
              <img src={area.imageUrl} alt={area.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-4 left-4">
                <span className="bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">
                  {area.code}
                </span>
              </div>
              <div className="absolute top-4 right-4 flex space-x-2">
                <button 
                  onClick={() => openEditModal(area)}
                  className="p-2 bg-white/90 backdrop-blur-md text-stone-600 rounded-lg hover:text-emerald-600 transition-colors shadow-sm"
                  title="Edit Area"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(area.id, area.name)}
                  className="p-2 bg-white/90 backdrop-blur-md text-stone-600 rounded-lg hover:text-rose-600 transition-colors shadow-sm"
                  title="Delete Area"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-8 flex-grow flex flex-col">
              <h3 className="text-xl font-bold text-stone-900 mb-2">{area.name}</h3>
              <p className="text-sm text-stone-500 leading-relaxed mb-8 flex-grow line-clamp-2">{area.description}</p>
              
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-stone-50">
                 <Link 
                   to={`/admin/areas/${area.id}/map`}
                   className="flex items-center justify-center space-x-2 py-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                 >
                    <MapIcon size={14} />
                    <span>Map Markers</span>
                 </Link>
                 <button 
                   onClick={() => handleGetQR(area)}
                   className="flex items-center justify-center space-x-2 py-3 bg-stone-50 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors"
                 >
                    <QrCode size={14} />
                    <span>Get QR</span>
                 </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredAreas.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-stone-200">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
            <LayoutGrid size={40} />
          </div>
          <h3 className="text-xl font-bold text-stone-900 mb-2">No areas found</h3>
          <p className="text-stone-500">Add an area to start mapping your plants.</p>
        </div>
      )}

      <AreaModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedArea(null);
        }}
        onSave={handleSaveArea}
        area={selectedArea}
        gardenId={gardenId!}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
