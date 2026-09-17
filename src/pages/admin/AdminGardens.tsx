/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  LayoutGrid,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { gardens as fallbackGardens } from '../../data';
import { Garden } from '../../types';
import { subscribeToGardens, saveGarden, deleteGarden, getAreas } from '../../lib/db-utils';
import GardenModal from '../../components/admin/GardenModal';
import { db } from '../../lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';

export default function AdminGardens() {
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToGardens((dbGardens) => {
      setGardens(dbGardens.length > 0 ? dbGardens : fallbackGardens as Garden[]);
      setIsLoading(false);
    });

    // Also fetch areas to show counts
    getAreas().then(setAreas);

    return () => unsubscribe();
  }, []);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      for (const garden of fallbackGardens) {
        const gardenRef = doc(db, 'gardens', garden.id);
        batch.set(gardenRef, {
          ...garden,
          createdAt: new Date().toISOString(),
          displayOrder: 0,
        });
      }

      await batch.commit();
      toast.success('Gardens seeded to Firestore!');
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed gardens.');
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredGardens = gardens.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? All associated areas and markers will be removed.`)) {
      try {
        await deleteGarden(id);
        toast.success(`Garden "${name}" deleted successfully.`);
      } catch (error) {
        toast.error('Failed to delete garden');
      }
    }
  };

  const toggleStatus = async (garden: Garden) => {
    const newStatus = garden.status === 'active' ? 'inactive' : 'active';
    try {
      await saveGarden({ ...garden, status: newStatus });
      toast.success(`Status updated for "${garden.name}"`, {
        description: `The garden is now ${newStatus}.`
      });
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSave = async (gardenData: Partial<Garden>) => {
    try {
      await saveGarden(gardenData);
      setIsModalOpen(false);
      setSelectedGarden(null);
      toast.success(gardenData.id ? 'Garden updated successfully!' : 'Garden created successfully!');
    } catch (error) {
      toast.error('Failed to save garden');
    }
  };

  const openEditModal = (garden: Garden) => {
    setSelectedGarden(garden);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedGarden(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Loading Gardens...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">Gardens Management</h1>
          <p className="text-stone-500">Create and manage your botanical collections and zones.</p>
        </div>
        <div className="flex space-x-3">
          {gardens.length > 0 && !gardens.some(g => g.id.startsWith('g-')) && (
            <button 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={isSeeding ? 'animate-spin' : ''} size={20} />
              <span>{isSeeding ? 'Seeding...' : 'Seed Gardens'}</span>
            </button>
          )}
          <button 
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Plus size={20} />
            <span>Add New Garden</span>
          </button>
        </div>
      </header>

      {/* Table Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-stone-100 shadow-sm">
        <div className="relative flex-grow max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search gardens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button 
            onClick={() => toast.info('Filter options coming soon!')}
            className="flex-grow md:flex-grow-0 flex items-center justify-center space-x-2 px-4 py-3 bg-stone-50 text-stone-600 rounded-xl border border-stone-100 text-sm font-bold hover:bg-stone-100 active:scale-95 transition-all"
          >
            <Filter size={18} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Garden Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50/50 text-stone-400 text-[10px] font-bold uppercase tracking-widest border-b border-stone-100">
                <th className="px-8 py-6">Garden Name</th>
                <th className="px-8 py-6">Location</th>
                <th className="px-8 py-6">Code</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Areas</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredGardens.map((garden, idx) => {
                const gardenAreas = areas.filter(a => a.gardenId === garden.id);
                return (
                  <motion.tr 
                    key={garden.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group hover:bg-stone-50/50 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-stone-100 shadow-sm">
                          <img src={garden.coverImage} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-stone-900">{garden.name}</div>
                          <div className="text-xs text-stone-400">ID: {garden.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2 text-stone-500">
                        <MapPin size={14} className="text-emerald-500" />
                        <span className="text-sm">{garden.location}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-stone-100 text-stone-600 px-2 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase">
                        {garden.code}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => toggleStatus(garden)}
                        className={cn(
                          "flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors",
                          garden.status === 'active' 
                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                            : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                        )}
                      >
                        {garden.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span>{garden.status}</span>
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2 text-stone-600">
                        <LayoutGrid size={14} />
                        <span className="text-sm font-bold">{gardenAreas.length}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link 
                          to={`/admin/gardens/${garden.id}/areas`}
                          className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Manage Areas"
                        >
                          <LayoutGrid size={18} />
                        </Link>
                        <button 
                          onClick={() => openEditModal(garden)}
                          className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit Garden"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(garden.id, garden.name)}
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Garden"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <GardenModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedGarden(null);
        }}
        onSave={handleSave}
        garden={selectedGarden}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
