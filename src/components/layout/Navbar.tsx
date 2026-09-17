/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, Menu, X, QrCode, Search, MapPin, Sprout } from 'lucide-react';
import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getGardens, getPlants } from '../../lib/db-utils';
import { Garden, Plant } from '../../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [dbGardens, dbPlants] = await Promise.all([getGardens(), getPlants()]);
        setGardens(dbGardens);
        setPlants(dbPlants);
      } catch (error) {
        console.error('Error loading search data:', error);
      }
    }
    loadData();
  }, []);

  const filteredGardens = searchQuery.trim() 
    ? gardens.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3)
    : [];
  
  const filteredPlants = searchQuery.trim()
    ? plants.filter(p => p.commonName.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.success(`Searching for "${searchQuery}"...`);
      setIsSearchOpen(false);
      setSearchQuery('');
      navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Explore Gardens', path: '/explore' },
    { name: 'Plants', path: '/plants' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden shadow-lg shadow-stone-900/5 border border-stone-100">
              <img src="/GItam-Logo.png" alt="GITAM Logo" className="w-7 h-7 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "text-xl font-bold tracking-tight leading-none",
                scrolled ? "text-stone-900" : "text-stone-900"
              )}>
                Smart Garden
              </span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">GITAM University</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-emerald-600',
                  location.pathname === link.path ? 'text-emerald-600' : 'text-stone-600'
                )}
              >
                {link.name}
              </Link>
            ))}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-stone-600 hover:text-emerald-600 transition-colors"
            >
              <Search size={20} />
            </button>
            <Link
              to="/scanner"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <QrCode size={18} />
              <span>Scan QR</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-stone-600 hover:text-emerald-600"
            >
              <Search size={20} />
            </button>
            <Link
              to="/scanner"
              className="p-2 bg-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-600/20"
            >
              <QrCode size={20} />
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-stone-600 hover:text-stone-900"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/95 backdrop-blur-xl z-[60] flex items-center justify-center p-6"
          >
            <button 
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-10 right-10 text-white/60 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>
            
            <div className="w-full max-w-2xl">
              <form onSubmit={handleSearch} className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search plants, gardens, or areas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/20 py-8 text-4xl md:text-6xl text-white font-bold placeholder:text-white/20 outline-none focus:border-emerald-500 transition-colors"
                />
                <button 
                  type="submit"
                  className="absolute right-0 bottom-8 text-white/60 hover:text-emerald-500 transition-colors"
                >
                  <Search size={40} />
                </button>
              </form>

              {/* Live Results */}
              {searchQuery.trim() && (
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12 overflow-y-auto max-h-[50vh] pr-4 no-scrollbar">
                  {filteredGardens.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="text-white/40 text-xs font-bold uppercase tracking-[0.2em]">Matching Gardens</h4>
                      <div className="space-y-4">
                        {filteredGardens.map(garden => (
                          <button
                            key={garden.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                              navigate(`/garden/${garden.id}`);
                            }}
                            className="w-full flex items-center space-x-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-left group"
                          >
                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                              <img src={garden.coverImage} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="text-white font-bold group-hover:text-emerald-400 transition-colors">{garden.name}</div>
                              <div className="flex items-center text-white/40 text-xs mt-1">
                                <MapPin size={12} className="mr-1" />
                                {garden.location}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredPlants.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="text-white/40 text-xs font-bold uppercase tracking-[0.2em]">Matching Plants</h4>
                      <div className="space-y-4">
                        {filteredPlants.map(plant => (
                          <button
                            key={plant.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                              navigate(`/plant/${plant.id}`);
                            }}
                            className="w-full flex items-center space-x-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-left group"
                          >
                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                              <img src={plant.primaryImage} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="text-white font-bold group-hover:text-emerald-400 transition-colors">{plant.commonName}</div>
                              <div className="flex items-center text-white/40 text-xs mt-1 italic">
                                <Sprout size={12} className="mr-1" />
                                {plant.botanicalName}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredGardens.length === 0 && filteredPlants.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                      <div className="text-white/20 text-lg font-medium italic">No matches found for "{searchQuery}"</div>
                    </div>
                  )}
                </div>
              )}

              {!searchQuery.trim() && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <span className="text-white/40 text-sm font-bold uppercase tracking-widest w-full mb-2">Popular Searches</span>
                  {['Medicinal', 'Rose', 'Hibiscus', 'Tropical'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => {
                        setSearchQuery(tag);
                      }}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full text-sm font-medium border border-white/10 transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-stone-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'block px-3 py-3 text-base font-medium rounded-xl',
                    location.pathname === link.path
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  )}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/admin/login"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-3 text-base font-medium text-stone-400 hover:text-stone-600"
              >
                Admin Portal
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
