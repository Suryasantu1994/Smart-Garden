/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tags, Search, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { categories as fallbackCategories } from '../../data';
import { PlantCategory } from '../../types';
import { subscribeToCategories, saveCategory, deleteCategory } from '../../lib/db-utils';
import CategoryModal from '../../components/admin/CategoryModal';

export default function AdminCategories() {
  const [categories, setCategories] = useState<PlantCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PlantCategory | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToCategories((dbCategories) => {
      setCategories(dbCategories.length > 0 ? dbCategories : fallbackCategories as PlantCategory[]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (categoryData: Partial<PlantCategory>) => {
    try {
      await saveCategory(categoryData);
      toast.success(categoryData.id ? 'Category updated!' : 'Category created!');
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the category "${name}"?`)) {
      try {
        await deleteCategory(id);
        toast.success(`Category "${name}" deleted.`);
      } catch (error) {
        toast.error('Failed to delete category');
      }
    }
  };

  const openAddModal = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: PlantCategory) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="animate-spin text-emerald-600" size={48} />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Loading Categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">Plant Categories</h1>
          <p className="text-stone-500">Organize your botanical collection with custom classification groups.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
        >
          <Plus size={20} />
          <span>New Category</span>
        </button>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredCategories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm group hover:shadow-xl hover:shadow-emerald-900/5 transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: cat.color }}
                >
                  <Tags size={28} />
                </div>
                <div className="flex space-x-1">
                  <button 
                    onClick={() => openEditModal(cat)}
                    className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-stone-900 mb-3">{cat.name}</h3>
              <p className="text-sm text-stone-500 leading-relaxed mb-6 h-12 line-clamp-2">{cat.description}</p>
              
              <div className="pt-6 border-t border-stone-50 flex items-center justify-between">
                 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Type</span>
                 <span className="text-sm font-black text-stone-900">Botanical</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        onSave={handleSave}
        category={selectedCategory}
      />
    </div>
  );
}
