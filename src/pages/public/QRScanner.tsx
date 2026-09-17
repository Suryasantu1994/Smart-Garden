/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ArrowLeft, Camera, QrCode as QrIcon, Info, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';

export default function QRScanner() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // Expected format: https://.../scan/CODE or just the CODE
        try {
          const url = new URL(decodedText);
          if (url.pathname.startsWith('/scan/')) {
            const code = url.pathname.split('/scan/')[1];
            scanner.clear();
            navigate(`/scan/${code}`);
          } else {
            // Treat as raw code
            scanner.clear();
            navigate(`/scan/${decodedText}`);
          }
        } catch (e) {
          // Not a URL, treat as raw code
          scanner.clear();
          navigate(`/scan/${decodedText}`);
        }
      },
      (errorMessage) => {
        // Not showing errors continuously as they occur frequently during scanning
        // console.warn(errorMessage);
      }
    );

    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner", err));
    };
  }, [navigate]);

  return (
    <div className="pt-24 pb-24 min-h-screen bg-stone-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-white hover:text-emerald-400 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Scan Garden QR</h1>
          <div className="w-6"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative aspect-square"
        >
          <div id="reader" className="w-full h-full"></div>
          
          {/* Overlay for better UI */}
          <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 flex flex-col items-center justify-center">
             <div className="w-64 h-64 border-4 border-emerald-500 rounded-3xl relative">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
                
                {/* Scanning line animation */}
                <motion.div
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] z-10"
                />
             </div>
          </div>
        </motion.div>

        <div className="mt-12 space-y-6 text-center">
          <div className="flex items-center justify-center space-x-3 text-stone-400 text-sm">
            <Camera size={18} className="text-emerald-500" />
            <span>Point your camera at a plant or garden area QR code</span>
          </div>
          
          <div className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 text-stone-300">
            <div className="flex items-start space-x-4 text-left">
              <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <Info size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Trouble scanning?</h4>
                <p className="text-xs leading-relaxed opacity-70">
                  Ensure the QR code is well-lit and fits within the square frame. You can also use your device's native camera app.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center space-x-2 text-stone-500 hover:text-white transition-colors text-sm font-medium"
          >
            <RefreshCcw size={16} />
            <span>Restart Camera</span>
          </button>
        </div>
      </div>
    </div>
  );
}
