/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  CheckCircle2,
  XCircle,
  Sprout,
  Image as ImageIcon,
  MoreVertical,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { categories as localCategories, plants as localInitialPlants } from '../../data';
import { Plant, PlantCategory } from '../../types';
import PlantModal from '../../components/admin/PlantModal';
import { subscribeToPlants, savePlant, deletePlant, subscribeToCategories, collections } from '../../lib/db-utils';
import { db } from '../../lib/firebase';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';

export default function AdminPlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [categories, setCategories] = useState<PlantCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);

  useEffect(() => {
    setIsLoading(true);
    // Subscribe to Firestore updates
    const unsubs = [
      subscribeToPlants((updatedPlants) => {
        setPlants(updatedPlants);
        if (categories.length > 0) setIsLoading(false);
      }),
      subscribeToCategories((updatedCategories) => {
        setCategories(updatedCategories.length > 0 ? updatedCategories : localCategories as PlantCategory[]);
        if (plants.length > 0) setIsLoading(false);
      })
    ];

    // Fallback timer
    const timer = setTimeout(() => setIsLoading(false), 2000);

    return () => {
      unsubs.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, [plants.length, categories.length]);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      // Seed Categories first
      for (const cat of localCategories) {
        const catRef = doc(db, 'categories', cat.id);
        batch.set(catRef, cat);
      }

      // Seed Plants
      for (const plant of localInitialPlants) {
        const plantRef = doc(db, 'plants', plant.id);
        batch.set(plantRef, {
          ...plant,
          createdAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      toast.success('Database seeded with initial botanical data!');
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed database.');
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredPlants = plants.filter(p => {
    const matchesSearch = p.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.botanicalName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string, name: string) => {
    toast.custom((t) => (
      <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-stone-100 flex flex-col space-y-4 min-w-[320px]">
        <div className="flex items-center space-x-3 text-rose-600">
          <AlertTriangle size={24} />
          <h4 className="font-bold">Delete Plant?</h4>
        </div>
        <p className="text-stone-500 text-sm">Are you sure you want to delete <span className="font-bold text-stone-900">{name}</span>? This will remove it from all gardens.</p>
        <div className="flex space-x-3">
          <button 
            onClick={() => toast.dismiss(t)}
            className="flex-grow py-2 rounded-xl font-bold text-stone-400 hover:bg-stone-50 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t);
              const promise = deletePlant(id);
              toast.promise(promise, {
                loading: 'Deleting plant...',
                success: `Plant "${name}" deleted permanentely.`,
                error: 'Failed to delete plant.'
              });
            }}
            className="flex-grow py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-900/20"
          >
            Delete
          </button>
        </div>
      </div>
    ));
  };

  const handleSavePlant = async (plantData: Partial<Plant>) => {
    const promise = savePlant(plantData);
    
    toast.promise(promise, {
      loading: editingPlant ? 'Updating plant...' : 'Creating new species...',
      success: (id) => {
        setIsModalOpen(false);
        setEditingPlant(null);
        return editingPlant 
          ? `Plant "${plantData.commonName}" updated successfully.` 
          : `Plant "${plantData.commonName}" added to database.`;
      },
      error: 'Failed to save changes.'
    });
  };

  const handleAddPlant = () => {
    setEditingPlant(null);
    setIsModalOpen(true);
  };

  const handleEditPlant = (plant: Plant) => {
    setEditingPlant(plant);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight flex items-center gap-3">
            Plant Database
            {isLoading && <RefreshCw className="animate-spin text-emerald-500" size={24} />}
          </h1>
          <p className="text-stone-500">Manage your collection of species, botanical data, and care instructions.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {plants.length === 0 && !isLoading && (
            <button 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Database size={20} />
              <span>{isSeeding ? 'Seeding...' : 'Seed Initial Data'}</span>
            </button>
          )}
          <button 
            onClick={handleAddPlant}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
          >
            <Plus size={20} />
            <span>Add New Plant</span>
          </button>
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search by common or botanical name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                const catName = e.target.value === 'all' ? 'all categories' : categories.find(c => c.id === e.target.value)?.name;
                toast.success(`Showing ${catName}`);
              }}
              className="w-full pl-4 pr-10 py-3 bg-stone-50 border border-stone-100 rounded-2xl appearance-none outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-600 text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
          </div>
          <button 
            onClick={() => toast.info('Advanced filters coming soon!')}
            className="p-3 bg-stone-50 text-stone-600 rounded-2xl border border-stone-100 hover:bg-stone-100 transition-all active:scale-90"
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Plant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 min-h-[400px]">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-32 space-y-4">
             <RefreshCw className="animate-spin text-emerald-600" size={48} />
             <p className="text-stone-400 font-medium">Connecting to botanical database...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredPlants.map((plant, idx) => {
              const category = categories.find(c => c.id === plant.categoryId);
              return (
                <motion.div
                  key={plant.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-emerald-900/5 transition-all"
                >
                  <div className="relative h-56">
                    <img src={plant.primaryImage} alt={plant.commonName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute top-4 left-4">
                       <span 
                         className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-lg"
                         style={{ backgroundColor: category?.color }}
                       >
                         {category?.name}
                       </span>
                    </div>
                    <div className="absolute top-4 right-4 flex space-x-2">
                       <button 
                         onClick={() => handleEditPlant(plant)}
                         className="p-2 bg-white/90 backdrop-blur-md text-stone-600 rounded-xl hover:text-emerald-600 transition-all shadow-sm active:scale-90"
                       >
                          <Edit size={16} />
                       </button>
                       <button 
                         onClick={() => handleDelete(plant.id, plant.commonName)}
                         className="p-2 bg-white/90 backdrop-blur-md text-stone-600 rounded-xl hover:text-rose-600 transition-all shadow-sm active:scale-90"
                       >
                          <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                  
                  <div className="p-8 flex-grow flex flex-col">
                    <div className="mb-4">
                       <h3 className="text-xl font-bold text-stone-900 group-hover:text-emerald-600 transition-colors mb-1">{plant.commonName}</h3>
                       <p className="text-sm italic text-stone-400 font-medium">{plant.botanicalName}</p>
                    </div>
                    
                    <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 mb-6">
                      {plant.shortDescription}
                    </p>
                    
                    <div className="mt-auto pt-6 border-t border-stone-50 flex items-center justify-between">
                       <div className="flex items-center space-x-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            plant.status === 'active' ? "bg-emerald-500" : "bg-stone-300"
                          )}></div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{plant.status}</span>
                       </div>
                       <div className="flex -space-x-2">
                          {[1, 2].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center overflow-hidden">
                               <img src={`https://i.pravatar.cc/100?u=${i}`} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-400">
                             +3
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {!isLoading && filteredPlants.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-stone-200">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
            <Sprout size={40} />
          </div>
          <h3 className="text-xl font-bold text-stone-900 mb-2">No plants found</h3>
          <p className="text-stone-500">Add a plant or seed the database to begin.</p>
        </div>
      )}

      {/* Plant Modal */}
      <PlantModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlant(null);
        }}
        onSave={handleSavePlant}
        plant={editingPlant}
        categories={categories}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
