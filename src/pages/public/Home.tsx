/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { QrCode, ArrowRight, TreePine, Flower2, Sprout, Map as MapIcon, Search, Info, RefreshCw, LayoutGrid } from 'lucide-react';
import { useState, useEffect, FormEvent } from 'react';
import { toast } from 'sonner';
import { gardens as fallbackGardens } from '../../data';
import { getGardens, getPlants, getAreas, getMarkers } from '../../lib/db-utils';

export default function Home() {
  const [gardens, setGardens] = useState<any[]>([]);
  const [allAreas, setAllAreas] = useState<any[]>([]);
  const [allMarkers, setAllMarkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    gardens: 0,
    plants: 0,
    areas: 0,
    markers: 0
  });
  const navigate = useNavigate();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [dbGardens, dbPlants, dbAreas, dbMarkers] = await Promise.all([
          getGardens(),
          getPlants(),
          getAreas(),
          getMarkers()
        ]);
        
        setGardens(dbGardens.length > 0 ? dbGardens : fallbackGardens);
        setAllAreas(dbAreas);
        setAllMarkers(dbMarkers);
        setStats({
          gardens: dbGardens.length > 0 ? dbGardens.length : 1,
          plants: dbPlants.length > 0 ? dbPlants.length : 9,
          areas: dbAreas.length > 0 ? dbAreas.length : 1,
          markers: dbMarkers.length > 0 ? dbMarkers.length : 9
        });
      } catch (error) {
        console.error('Error loading home data:', error);
        setGardens(fallbackGardens);
        setStats({
          gardens: 1,
          plants: 9,
          areas: 1,
          markers: 9
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const featuredGardens = gardens.slice(0, 3);

  return (
    <div className="pt-20 bg-stone-50/50">
      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&q=80&w=2400"
            alt="Beautiful garden"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900/90 via-stone-900/40 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-[1px] w-12 bg-emerald-500"></div>
                <span className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">Gitam Botanical Initiative</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
                Explore the Garden. <br />
                <span className="text-emerald-400">Discover Every Plant.</span>
              </h1>
              <p className="text-xl text-stone-200 mb-10 leading-relaxed max-w-lg">
                Scan. Explore. Learn. Connect with nature through our interactive digital garden experience at GITAM University.
              </p>

              <div className="mb-10 max-w-xl">
                <form onSubmit={handleSearch} className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-500 transition-colors" size={24} />
                  <input
                    type="text"
                    placeholder="Search plants, gardens, or areas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] text-white placeholder:text-white/40 focus:bg-white focus:text-stone-900 focus:placeholder:text-stone-400 outline-none transition-all text-lg shadow-2xl"
                  />
                  <button 
                    type="submit"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
                  >
                    <ArrowRight size={20} />
                  </button>
                </form>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/explore"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full text-lg font-semibold flex items-center justify-center space-x-2 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
                >
                  <span>Explore Garden</span>
                  <ArrowRight size={20} />
                </Link>
                <Link
                  to="/scanner"
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full text-lg font-semibold flex items-center justify-center space-x-2 transition-all active:scale-95"
                >
                  <QrCode size={20} />
                  <span>Scan QR Code</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Floating Plant Marker Demo */}
        <div className="absolute right-[15%] top-[40%] hidden lg:block">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: 'spring' }}
            className="relative"
          >
            <div 
              onClick={() => toast.success('You found a plant marker!', {
                description: 'Tap markers on the area map to see plant details.'
              })}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-2xl cursor-pointer animate-bounce group"
            >
              <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold group-hover:scale-110 transition-transform">1</div>
            </div>
            <div className="absolute top-10 -left-16 bg-white p-3 rounded-2xl shadow-2xl w-48 backdrop-blur-sm border border-white/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                  <Sprout size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Neem Tree</h4>
                  <p className="text-[10px] text-stone-500">Medicinal • Ancient</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative py-24 bg-stone-50 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
           <img src="/GItam-Logo.png" alt="" className="w-[800px] h-[800px] object-contain rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-stone-900 mb-6 tracking-tight">How it Works</h2>
              <p className="text-stone-500 max-w-2xl mx-auto text-lg">Your interactive guide to the botanical world is just a scan away.</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: Search, title: 'Find a Garden', desc: 'Browse our collection of curated botanical zones and virtual landscapes online.', delay: 0 },
              { icon: QrCode, title: 'Scan the Code', desc: 'Look for QR markers placed at garden entrances or near specific plants.', delay: 0.1 },
              { icon: Info, title: 'Learn Instantly', desc: 'Access interactive maps, botanical data, and care tips directly on your phone.', delay: 0.2 },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: step.delay }}
                viewport={{ once: true }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-emerald-900/5 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 border border-stone-100">
                  <step.icon size={40} className="transition-colors" />
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-4">{step.title}</h3>
                <p className="text-stone-500 leading-relaxed px-4">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Gardens Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-bold text-stone-900 mb-6 tracking-tight">Featured Gardens</h2>
              <p className="text-lg text-stone-500 leading-relaxed">
                Explore our most popular botanical zones, from tropical paradises to curated medicinal herb collections.
              </p>
            </div>
            <Link 
              to="/explore" 
              className="inline-flex items-center space-x-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors group"
            >
              <span>View all gardens</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 min-h-[400px]">
            {isLoading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 bg-stone-50 rounded-[3rem] border border-dashed border-stone-200">
                 <RefreshCw className="animate-spin text-emerald-600 mb-4" size={48} />
                 <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Opening the Garden Gates...</p>
              </div>
            ) : (
              featuredGardens.map((garden, idx) => {
                const gardenAreas = allAreas.filter(a => a.gardenId === garden.id);
                const gardenPlants = allMarkers.filter(m => gardenAreas.some(a => a.id === m.areaId)).length;
                
                return (
                  <motion.div
                    key={garden.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    viewport={{ once: true }}
                    className="group relative h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-stone-900/10 active:scale-95 transition-all"
                  >
                    <img 
                      src={garden.coverImage} 
                      alt={garden.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-10 w-full">
                      <div className="flex flex-col gap-3 mb-6">
                        <span className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full self-start shadow-lg">
                          {garden.code}
                        </span>
                        <div className="flex gap-2">
                          <div className="flex items-center space-x-2 bg-stone-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-xs font-bold shadow-2xl">
                            <LayoutGrid size={14} className="text-emerald-400" />
                            <span>{gardenAreas.length} Areas</span>
                          </div>
                          <div className="flex items-center space-x-2 bg-stone-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-xs font-bold shadow-2xl">
                            <TreePine size={14} className="text-emerald-400" />
                            <span>{gardenPlants || (idx === 0 ? 8 : 0)} Plants</span>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">{garden.name}</h3>
                  <p className="text-stone-300 text-sm line-clamp-2 mb-6 leading-relaxed">
                    {garden.description}
                  </p>
                  <Link 
                    to={`/explore?garden=${garden.id}`}
                    className="inline-flex items-center space-x-2 text-white font-bold bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl transition-all"
                  >
                    <span>Explore Map</span>
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </motion.div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-emerald-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-emerald-800 rounded-full blur-[120px] opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: 'Total Gardens', value: `${stats.gardens}+`, icon: MapIcon, path: '/explore' },
              { label: 'Plant Species', value: stats.plants.toLocaleString() + '+', icon: Sprout, path: '/plants' },
              { label: 'Garden Areas', value: `${stats.areas}+`, icon: TreePine, path: '/explore' },
              { label: 'QR Locations', value: `${stats.markers}+`, icon: QrCode, path: '/scanner' },
            ].map((stat, idx) => (
              <Link key={idx} to={stat.path} className="hover:scale-110 transition-transform block">
                <div className="text-emerald-400 mb-4 flex justify-center">
                  <stat.icon size={32} />
                </div>
                <div className="text-4xl font-bold mb-2 tracking-tight">{stat.value}</div>
                <div className="text-emerald-200/60 text-sm font-medium uppercase tracking-widest">{stat.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-stone-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img
                src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=2000"
                alt="Forest background"
                className="w-full h-full object-cover opacity-20"
              />
            </div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">Ready to begin your botanical journey?</h2>
              <p className="text-xl text-stone-400 mb-12">Join thousands of users exploring our smart gardens today.</p>
              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/explore"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-full text-lg font-semibold transition-all active:scale-95"
                >
                  Explore Gardens
                </Link>
                <Link
                  to="/scanner"
                  className="bg-white hover:bg-stone-100 text-stone-900 px-10 py-5 rounded-full text-lg font-semibold transition-all active:scale-95"
                >
                  Scan QR Code
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
