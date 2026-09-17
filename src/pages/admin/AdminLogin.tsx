/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { auth, db } from '../../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const checkAdminAccess = async (uid: string, userEmail: string | null) => {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    
    // Bootstrap admin check
    const normalizedEmail = userEmail?.toLowerCase();
    const isBootstrapAdmin = normalizedEmail === 'vkatakam@gitam.edu';
    
    if (adminSnap.exists() || isBootstrapAdmin) {
      // If they are a bootstrap admin but not in the collection, add them
      if (isBootstrapAdmin && !adminSnap.exists()) {
        try {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(adminRef, {
            email: normalizedEmail,
            role: 'super_admin',
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          console.error('Failed to register bootstrap admin:', e);
          // Continue anyway since isBootstrapAdmin is true
        }
      }
      onLogin();
      navigate('/admin');
    } else {
      await auth.signOut();
      toast.error('Access Denied', {
        description: 'Your account does not have administrative privileges.'
      });
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await checkAdminAccess(result.user.uid, result.user.email);
    } catch (error: any) {
      console.error('Google Sign-in Error:', error);
      
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Google Sign-in Disabled', {
          description: 'The Google Sign-in method is not enabled in the Firebase Console. Please enable it or use the demo credentials.',
          duration: 6000
        });
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Silently handle popup closed
      } else {
        toast.error('Authentication Failed', {
          description: error.message || 'An error occurred during Google Sign-in.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const normalizedEmail = email.trim().toLowerCase();
    
    try {
      // For the demo purpose, we'll allow the demo password 'admin123' if they use the gitam email
      if (password === 'admin123' && normalizedEmail === 'vkatakam@gitam.edu') {
        try {
          const { signInAnonymously } = await import('firebase/auth');
          await signInAnonymously(auth);
        } catch (authError) {
          console.warn('Silent anonymous auth failed, proceeding with local-only session:', authError);
        }
        localStorage.setItem('admin_auth', 'true');
        onLogin();
        navigate('/admin');
      } else {
        // Real Firebase Email Auth
        const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        await checkAdminAccess(result.user.uid, result.user.email);
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Provider Disabled', {
          description: 'Email sign-in is disabled in Firebase Console. Please use the Demo Credentials (vkatakam@gitam.edu / admin123).',
          duration: 8000
        });
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid Credentials', {
          description: 'Please check your email and password. For demo access, use the GITAM admin email and "admin123".'
        });
      } else {
        toast.error('Login Failed', {
          description: error.message || 'An unexpected error occurred.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('vkatakam@gitam.edu');
    setPassword('admin123');
    
    setIsLoading(true);
    try {
      // Sign in anonymously to have a valid Firebase Auth session for Firestore rules
      const { signInAnonymously } = await import('firebase/auth');
      await signInAnonymously(auth);
      
      localStorage.setItem('admin_auth', 'true');
      toast.success('Demo credentials applied with anonymous session', {
        description: 'You are now signed in as a temporary administrator.'
      });
      onLogin();
      navigate('/admin');
    } catch (error) {
      console.error('Anonymous Auth Error:', error);
      // Still set the local storage as a last resort
      localStorage.setItem('admin_auth', 'true');
      onLogin();
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-stone-200">
        
        {/* Left Side: Branding/Visual */}
        <div className="hidden lg:block relative p-16 bg-stone-900 text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
             <img 
               src="https://images.unsplash.com/photo-1598901861713-a4ad16a7d72e?auto=format&fit=crop&q=80&w=1200" 
               className="w-full h-full object-cover opacity-30" 
               alt="Garden"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent"></div>
          </div>
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center space-x-3 mb-12">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                <img src="/GItam-Logo.png" alt="GITAM Logo" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight leading-none text-white">Smart Garden</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">GITAM Admin</span>
              </div>
            </div>
            
            <div className="mt-auto">
              <h2 className="text-4xl font-bold mb-6 leading-tight">Digital Management <br />for Modern Gardens.</h2>
              <p className="text-stone-400 text-lg leading-relaxed mb-12">
                Access your secure dashboard to manage botanical collections, zones, and interactive experiences.
              </p>
              
              <div className="space-y-6">
                 {[
                   { icon: ShieldCheck, title: 'Secure Access', desc: 'Real-time Firebase authentication' },
                   { icon: Lock, title: 'Privacy First', desc: 'Encrypted botanical data records' },
                 ].map((item, idx) => (
                   <div key={idx} className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400 border border-white/10">
                         <item.icon size={20} />
                      </div>
                      <div>
                         <div className="font-bold text-sm">{item.title}</div>
                         <div className="text-stone-500 text-xs">{item.desc}</div>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-16 lg:p-20 flex flex-col justify-center">
          <div className="lg:hidden flex items-center space-x-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-stone-200 shadow-sm">
              <img src="/GItam-Logo.png" alt="GITAM Logo" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-stone-900 tracking-tight leading-none">Smart Garden</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">GITAM University</span>
            </div>
          </div>

          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 mb-2">Admin Login</h1>
              <p className="text-stone-500">Sign in to manage your ecosystem.</p>
            </div>
            <button 
              onClick={handleDemoLogin}
              className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors"
            >
              Demo Access
            </button>
          </div>

          {/* Social Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 py-4 bg-white border border-stone-200 rounded-2xl font-bold text-stone-700 hover:bg-stone-50 transition-all shadow-sm active:scale-[0.98] mb-8 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            <span>Continue with Google</span>
          </button>

          <div className="relative mb-8 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <span className="relative bg-white px-4 text-xs font-bold text-stone-400 uppercase tracking-widest">or use email</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                  placeholder="vkatakam@gitam.edu"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Password</label>
                <button type="button" className="text-xs font-bold text-emerald-600 hover:underline">Forgot?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-14 py-5 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 transition-all active:scale-[0.98] shadow-xl shadow-emerald-900/20 disabled:opacity-70 disabled:pointer-events-none"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-stone-100 flex flex-col items-center">
            <p className="text-stone-400 text-xs mb-4 text-center italic">
              "vkatakam@gitam.edu" is pre-configured as the super-administrator.
            </p>
            <Link to="/" className="text-emerald-600 font-bold text-sm hover:underline flex items-center space-x-2">
               <ArrowLeft size={16} />
               <span>Back to Public Website</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowLeft({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
