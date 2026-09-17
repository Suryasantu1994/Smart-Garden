/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Flower2, Sprout, Leaf, ArrowRight, RefreshCw, Filter } from 'lucide-react';
import { plants as fallbackPlants, categories as fallbackCategories } from '../../data';
import { getPlants, getCategories } from '../../lib/db-utils';
import { Plant, PlantCategory } from '../../types';

export default function ExplorePlants() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState('All Species');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [categories, setCategories] = useState<PlantCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [dbPlants, dbCategories] = await Promise.all([
          getPlants(),
          getCategories()
        ]);
        
        setPlants(dbPlants.length > 0 ? dbPlants : fallbackPlants as Plant[]);
        setCategories(dbCategories.length > 0 ? dbCategories : fallbackCategories as PlantCategory[]);
      } catch (error) {
        console.error('Error loading plants explorer:', error);
        setPlants(fallbackPlants as Plant[]);
        setCategories(fallbackCategories as PlantCategory[]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const query = searchParams.get('search');
    if (query) {
      setSearchQuery(query);
    }
    const cat = searchParams.get('category');
    if (cat) {
      setActiveCategory(cat);
    }
  }, [searchParams]);

  const filteredPlants = plants.filter((plant) => {
    const matchesSearch = 
      plant.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.botanicalName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      activeCategory === 'All Species' || 
      categories.find(c => c.name === activeCategory)?.id === plant.categoryId;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pt-32 pb-24 min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <div className="flex items-center space-x-2 text-emerald-600 mb-4">
             <Leaf size={20} />
             <span className="text-xs font-bold uppercase tracking-[0.2em]">Botanical Library</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 tracking-tight">Plant Directory</h1>
          <p className="text-stone-500 max-w-2xl text-lg">
            Browse our complete collection of botanical species from GITAM University's diverse gardens.
          </p>
        </header>

        {/* Search and Category Filters */}
        <div className="space-y-8 mb-12">
          <div className="relative max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400" size={24} />
            <input
              type="text"
              placeholder="Search by common or botanical name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-white border border-stone-200 rounded-[2rem] shadow-xl shadow-stone-900/5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-lg font-medium"
            />
          </div>

          <div className="flex items-center space-x-4 overflow-x-auto pb-4 no-scrollbar">
            <div className="flex items-center space-x-2 shrink-0 bg-white px-4 py-2 rounded-2xl border border-stone-100 text-stone-400">
               <Filter size={16} />
               <span className="text-xs font-bold uppercase tracking-widest">Filter By</span>
            </div>
            <button
              onClick={() => setActiveCategory('All Species')}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all shrink-0 border ${
                activeCategory === 'All Species'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                  : 'bg-white text-stone-500 border-stone-200 hover:border-emerald-200 hover:text-stone-900'
              }`}
            >
              All Species
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all shrink-0 border ${
                  activeCategory === cat.name
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                    : 'bg-white text-stone-500 border-stone-200 hover:border-emerald-200 hover:text-stone-900'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Plant Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 min-h-[400px]">
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-24">
              <RefreshCw className="animate-spin text-emerald-600 mb-4" size={48} />
              <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Leafing through the records...</p>
            </div>
          ) : (
            filteredPlants.map((plant, idx) => {
              const plantCategory = categories.find(c => c.id === plant.categoryId);
              return (
                <motion.div
                  key={plant.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white rounded-[2.5rem] overflow-hidden border border-stone-200 hover:border-emerald-200 transition-all hover:shadow-2xl hover:shadow-emerald-900/5 flex flex-col"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img
                      src={plant.primaryImage}
                      alt={plant.commonName}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-4 left-4">
                      <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md">
                        {plantCategory?.name || 'Species'}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-stone-900 mb-1 group-hover:text-emerald-600 transition-colors">
                      {plant.commonName}
                    </h3>
                    <p className="text-stone-400 text-sm italic font-medium mb-4">
                      {plant.botanicalName}
                    </p>
                    <p className="text-stone-500 text-xs leading-relaxed mb-6 line-clamp-2">
                      {plant.shortDescription}
                    </p>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex space-x-2">
                         <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Sprout size={14} />
                         </div>
                         <div className="w-8 h-8 rounded-lg bg-stone-50 text-stone-400 flex items-center justify-center">
                            <Flower2 size={14} />
                         </div>
                      </div>
                      <Link
                        to={`/plant/${plant.id}`}
                        className="w-10 h-10 rounded-full bg-stone-900 hover:bg-emerald-600 text-white flex items-center justify-center transition-all active:scale-90"
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {!isLoading && filteredPlants.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-stone-200">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
              <Sprout size={40} />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No species found</h3>
            <p className="text-stone-500">We couldn't find any plants matching your criteria.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All Species');
              }}
              className="mt-6 text-emerald-600 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
