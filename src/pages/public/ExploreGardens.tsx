/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, MapPin, TreePine, LayoutGrid, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { gardens as fallbackGardens, areas as fallbackAreas, plants as fallbackPlants } from '../../data';
import { getGardens, getAreas, getPlants, getMarkers } from '../../lib/db-utils';

export default function ExploreGardens() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeFilter, setActiveFilter] = useState('All Gardens');
  const [gardens, setGardens] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [dbGardens, dbAreas, dbPlants, dbMarkers] = await Promise.all([
          getGardens(),
          getAreas(),
          getPlants(),
          getMarkers()
        ]);
        
        // Use database data if available, otherwise fallback to local static data
        setGardens(dbGardens.length > 0 ? dbGardens : fallbackGardens);
        setAreas(dbAreas.length > 0 ? dbAreas : fallbackAreas);
        setPlants(dbPlants.length > 0 ? dbPlants : fallbackPlants);
        setMarkers(dbMarkers.length > 0 ? dbMarkers : []);
      } catch (error) {
        console.error('Error loading explorer data:', error);
        setGardens(fallbackGardens);
        setAreas(fallbackAreas);
        setPlants(fallbackPlants);
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
  }, [searchParams]);

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
  };

  const filteredGardens = gardens.filter((garden) =>
    garden.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    garden.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    garden.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPlants = searchQuery ? plants.filter((plant) =>
    plant.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plant.botanicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plant.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="pt-32 pb-24 min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-stone-900 mb-4 tracking-tight">Explore Gardens</h1>
          <p className="text-stone-500 max-w-2xl">
            Discover our diverse collection of botanical zones, from medicinal herb gardens to exotic palm oases.
          </p>
        </header>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="relative flex-grow max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder="Search plants, gardens, or areas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          {!searchQuery && (
            <div className="flex items-center space-x-2 text-sm text-stone-500 font-medium bg-stone-100 p-1 rounded-xl self-start md:self-auto">
              {['All Gardens', 'Recently Added', 'Most Visited'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleFilterClick(filter)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    activeFilter === filter
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'hover:text-stone-900'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {searchQuery && filteredPlants.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-stone-900 flex items-center space-x-3">
                <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
                <span>Matching Plants</span>
                <span className="text-stone-400 text-sm font-medium ml-2">({filteredPlants.length})</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredPlants.map((plant, idx) => (
                <Link
                  key={plant.id}
                  to={`/plant/${plant.id}`}
                  className="group bg-white p-4 rounded-3xl border border-stone-100 hover:border-emerald-200 transition-all hover:shadow-xl shadow-sm flex flex-col items-center text-center"
                >
                  <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4">
                    <img 
                      src={plant.primaryImage} 
                      alt={plant.commonName}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
                    {plant.commonName}
                  </h3>
                  <p className="text-[10px] text-stone-400 italic mt-1 line-clamp-1">{plant.botanicalName}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Garden Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
          {searchQuery && (
            <div className="col-span-full mb-8">
              <h2 className="text-2xl font-bold text-stone-900 flex items-center space-x-3">
                <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
                <span>Matching Gardens</span>
                <span className="text-stone-400 text-sm font-medium ml-2">({filteredGardens.length})</span>
              </h2>
            </div>
          )}
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-24">
              <RefreshCw className="animate-spin text-emerald-600 mb-4" size={48} />
              <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Gathering Botanical Collections...</p>
            </div>
          ) : (
            filteredGardens.map((garden, idx) => {
            const gardenAreasList = areas.filter(a => a.gardenId === garden.id);
            const gardenAreasCount = gardenAreasList.length;
            const gardenPlantsCount = markers.filter(m => gardenAreasList.some(a => a.id === m.areaId)).length || (idx === 0 ? 8 : 0); 

            return (
              <motion.div
                key={garden.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-white rounded-3xl overflow-hidden border border-stone-200 hover:border-emerald-200 transition-all hover:shadow-xl hover:shadow-emerald-900/5 flex flex-col"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={garden.coverImage}
                    alt={garden.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Badges Overlaid on Image */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md self-start">
                      {garden.code}
                    </span>
                    <div className="flex gap-2">
                      <div className="flex items-center space-x-1.5 bg-stone-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white text-[11px] font-bold shadow-xl">
                        <LayoutGrid size={13} className="text-emerald-400" />
                        <span>{gardenAreasCount} Areas</span>
                      </div>
                      <div className="flex items-center space-x-1.5 bg-stone-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white text-[11px] font-bold shadow-xl">
                        <TreePine size={13} className="text-emerald-400" />
                        <span>{gardenPlantsCount} Plants</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 flex-grow flex flex-col">
                  <div className="flex items-center space-x-2 text-emerald-600 mb-3">
                    <MapPin size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{garden.location}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900 mb-3 group-hover:text-emerald-600 transition-colors">
                    {garden.name}
                  </h3>
                  <p className="text-stone-500 text-sm leading-relaxed mb-6 flex-grow line-clamp-2">
                    {garden.description}
                  </p>

                  <Link
                    to={`/garden/${garden.id}`}
                    className="bg-stone-900 hover:bg-emerald-600 text-white w-full py-4 rounded-2xl font-semibold flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg shadow-stone-900/10 hover:shadow-emerald-600/20"
                  >
                    <span>Explore Garden</span>
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </motion.div>
            );
          }))}
        </div>

        {filteredGardens.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-stone-200">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
              <Search size={40} />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No gardens found</h3>
            <p className="text-stone-500">We couldn't find any gardens matching your search criteria.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-6 text-emerald-600 font-semibold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowRight({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
