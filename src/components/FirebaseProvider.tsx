/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getQuotaState } from '../lib/db-utils';

interface FirebaseContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  quotaExceeded: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  quotaExceeded: false,
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    // Check initial quota state
    setQuotaExceeded(getQuotaState());

    // Listen for storage events (if another tab hits quota)
    const handleStorage = () => {
      setQuotaExceeded(getQuotaState());
    };
    window.addEventListener('storage', handleStorage);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user is in admins collection or is the bootstrap admin
        const isBootstrapAdmin = user.email === 'vkatakam@gitam.edu';
        
        if (getQuotaState()) {
          setIsAdmin(isBootstrapAdmin);
        } else {
          try {
            const adminRef = doc(db, 'admins', user.uid);
            const adminSnap = await getDoc(adminRef);
            setIsAdmin(adminSnap.exists() || isBootstrapAdmin);
          } catch (e) {
            console.warn('Admin check failed (likely quota):', e);
            setIsAdmin(isBootstrapAdmin);
          }
        }
      } else {
        // Check localStorage fallback for demo login
        const isDemoAdmin = localStorage.getItem('admin_auth') === 'true';
        setIsAdmin(isDemoAdmin);
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, isAdmin, loading, quotaExceeded }}>
      {children}
    </FirebaseContext.Provider>
  );
}
