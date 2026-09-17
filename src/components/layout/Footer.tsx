/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { Leaf, Instagram, Twitter, Facebook, Mail, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { FormEvent } from 'react';

export default function Footer() {
  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    toast.success('Thank you for subscribing to our newsletter!');
  };

  return (
    <footer className="bg-stone-900 text-stone-400 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-3 text-white">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-white/10">
                <img src="/GItam-Logo.png" alt="GITAM Logo" className="w-7 h-7 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight leading-none">Smart Garden</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">GITAM University</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed">
              Experience the future of botanical exploration. Our smart identification system brings nature's secrets to your fingertips.
            </p>
            <div className="flex space-x-4">
              {[Instagram, Twitter, Facebook].map((Icon, idx) => (
                <button 
                  key={idx}
                  onClick={() => toast.info(`Connecting to our social media...`)}
                  className="w-10 h-10 bg-white/5 hover:bg-emerald-600 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90"
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Explore</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/explore" className="hover:text-emerald-500 transition-colors">All Gardens</Link></li>
              <li><Link to="/plants" className="hover:text-emerald-500 transition-colors">Plant Database</Link></li>
              <li><Link to="/scanner" className="hover:text-emerald-500 transition-colors">QR Scanner</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-bold mb-6">Stay Updated</h4>
            <p className="text-sm mb-6">Get notified about seasonal blooms and new garden installations.</p>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <input 
                type="email" 
                placeholder="Your email address"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-xs font-medium uppercase tracking-widest">
          <p>© 2024 Smart Garden Project. All rights reserved.</p>
          <div className="flex space-x-8">
            <Link to="/admin/login" className="hover:text-white transition-colors">Admin Portal</Link>
            <button onClick={() => toast.info('Privacy Policy coming soon')} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => toast.info('Terms of Service coming soon')} className="hover:text-white transition-colors">Terms</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
