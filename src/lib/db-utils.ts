/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  getDocs, 
  getDoc,
  getDocsFromCache,
  getDocFromCache,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  where,
  QueryConstraint,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Plant, PlantCategory, Garden, GardenArea, PlantMarker } from '../types';
import { 
  gardens as fallbackGardens, 
  areas as fallbackAreas, 
  plants as fallbackPlants, 
  markers as fallbackMarkers, 
  categories as fallbackCategories 
} from '../data';

// Global registry for active listeners to allow cross-tab sync during quota limits
const localListeners: Record<string, Set<(data: any) => void>> = {
  'plants_all': new Set(),
  'categories_all': new Set(),
  'gardens_all': new Set(),
  'areas_all': new Set(),
};

// Handle cross-tab synchronization via storage events
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith('botanical_cache_')) {
      const cacheKey = e.key.replace('botanical_cache_', '');
      const listeners = localListeners[cacheKey];
      if (listeners && e.newValue) {
        try {
          const { data } = JSON.parse(e.newValue);
          listeners.forEach(cb => cb(data));
        } catch (err) {
          console.warn('Failed to sync cross-tab data:', err);
        }
      }
    }
  });
}

function notifyLocalListeners(key: string, data: any) {
  const listeners = localListeners[key];
  if (listeners) {
    listeners.forEach(cb => cb(data));
  }
}

// Persistent cache using localStorage to reduce quota usage across sessions
const CACHE_TTL = 3600000; // 1 hour for persistent cache
const QUOTA_COOLDOWN = 3600000; // 1 hour circuit breaker

function getCachedData<T>(key: string, ignoreTTL: boolean = false): T | null {
  try {
    const cached = localStorage.getItem(`botanical_cache_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // If quota is exceeded, we prefer stale data over placeholder data
      if (ignoreTTL || Date.now() - timestamp < CACHE_TTL) {
        return data as T;
      }
    }
  } catch (e) {
    console.warn('Cache read error:', e);
  }
  return null;
}

function setCachedData(key: string, data: any) {
  try {
    localStorage.setItem(`botanical_cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Cache write error:', e);
  }
}

function clearCachedData(key: string) {
  try {
    localStorage.removeItem(`botanical_cache_${key}`);
  } catch (e) {
    console.warn('Cache clear error:', e);
  }
}

// Circuit breaker state persistence
export function getQuotaState() {
  const state = localStorage.getItem('botanical_quota_exceeded');
  if (state) {
    const { timestamp } = JSON.parse(state);
    if (Date.now() - timestamp < QUOTA_COOLDOWN) {
      return true;
    }
    localStorage.removeItem('botanical_quota_exceeded');
  }
  return false;
}

export function resetQuotaState() {
  localStorage.removeItem('botanical_quota_exceeded');
}

function handleQuotaError(error: any) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes("Quota limit exceeded") || errorMessage.includes("Quota exceeded")) {
    localStorage.setItem('botanical_quota_exceeded', JSON.stringify({
      timestamp: Date.now()
    }));
  }
}

export const collections = {
  PLANTS: 'plants',
  CATEGORIES: 'categories',
  GARDENS: 'gardens',
  AREAS: 'areas',
  MARKERS: 'markers',
  SCANS: 'scans',
};

export function subscribeToScans(callback: (scans: any[]) => void) {
  // Limit to last 100 scans to save quota
  const q = query(collection(db, collections.SCANS), orderBy('timestamp', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const scans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(scans);
  }, (error) => {
    // Handle error silently or log it - scans might not exist yet
    console.warn('Scans subscription error:', error);
  });
}

export async function recordScan(id: string, type: 'plant' | 'area'): Promise<void> {
  try {
    await addDoc(collection(db, collections.SCANS), {
      [type === 'plant' ? 'plantId' : 'areaId']: id,
      type,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Error recording scan:', error);
  }
}

export async function getPlants(): Promise<Plant[]> {
  const cacheKey = 'plants_all';
  const isQuotaExceeded = getQuotaState();
  
  // Always try to get the most "live" data possible
  if (isQuotaExceeded) {
    // 1. Try Firestore persistent cache first (most reliable "live" local data)
    try {
      const q = query(collection(db, collections.PLANTS), orderBy('createdAt', 'desc'));
      const cacheSnapshot = await getDocsFromCache(q);
      if (!cacheSnapshot.empty) {
        return cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
      }
    } catch (e) {
      console.warn('Plants Firestore cache fail:', e);
    }
    
    // 2. Try our localStorage cache
    const cached = getCachedData<Plant[]>(cacheKey, true);
    if (cached) return cached;
    
    // 3. Fallback to static data
    return fallbackPlants as Plant[];
  }

  try {
    const q = query(collection(db, collections.PLANTS), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const plants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
    setCachedData(cacheKey, plants);
    return plants;
  } catch (error) {
    handleQuotaError(error);
    const quotaNow = getQuotaState();
    
    // Attempt to get from Firestore persistence cache if online fetch failed
    try {
      const q = query(collection(db, collections.PLANTS), orderBy('createdAt', 'desc'));
      const cacheSnapshot = await getDocsFromCache(q);
      if (!cacheSnapshot.empty) {
        const cachePlants = cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
        return cachePlants;
      }
    } catch (cacheErr) {
      console.warn('Firestore cache fetch failed:', cacheErr);
    }

    if (!quotaNow) {
      handleFirestoreError(error, OperationType.GET, collections.PLANTS);
    }
    return getCachedData<Plant[]>(cacheKey, true) || (fallbackPlants as Plant[]);
  }
}

export function subscribeToPlants(callback: (plants: Plant[]) => void) {
  const isQuotaExceeded = getQuotaState();
  
  // 1. Try our localStorage cache first for immediate UI
  const cached = getCachedData<Plant[]>('plants_all', isQuotaExceeded);
  if (cached) callback(cached);

  // 2. If quota hit, aggressively try to fetch from Firestore's persistent disk cache
  if (isQuotaExceeded) {
    (async () => {
      try {
        const q = query(collection(db, collections.PLANTS), orderBy('createdAt', 'desc'));
        const cacheSnapshot = await getDocsFromCache(q);
        if (!cacheSnapshot.empty) {
          const cachePlants = cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
          callback(cachePlants);
        }
      } catch (e) {
        console.warn('Subscription cache fail:', e);
      }
    })();

    localListeners['plants_all'].add(callback);
    return () => {
      localListeners['plants_all'].delete(callback);
    };
  }

  // Register for local updates
  localListeners['plants_all'].add(callback);

  const q = query(collection(db, collections.PLANTS), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const plants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
    setCachedData('plants_all', plants);
    callback(plants);
    notifyLocalListeners('plants_all', plants);
  }, (error) => {
    handleQuotaError(error);
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.LIST, collections.PLANTS);
    }
  });

  return () => {
    unsubscribe();
    localListeners['plants_all'].delete(callback);
  };
}

export async function savePlant(plant: Partial<Plant>): Promise<string> {
  try {
    let savedId = plant.id || '';
    let finalPlant: Plant;

    if (plant.id) {
      const plantRef = doc(db, collections.PLANTS, plant.id);
      const data = {
        ...plant,
        updatedAt: Timestamp.now().toDate().toISOString(),
      };
      await setDoc(plantRef, data, { merge: true });
      finalPlant = data as Plant;
    } else {
      const newId = `p-${Date.now()}`;
      savedId = newId;
      const plantRef = doc(db, collections.PLANTS, newId);
      const data = {
        ...plant,
        id: newId,
        createdAt: Timestamp.now().toDate().toISOString(),
        updatedAt: Timestamp.now().toDate().toISOString(),
      } as Plant;
      await setDoc(plantRef, data);
      finalPlant = data;
    }

    // Update local cache immediately so it's visible even if reads are blocked
    const cached = getCachedData<Plant[]>('plants_all') || [];
    const index = cached.findIndex(p => p.id === savedId);
    if (index >= 0) {
      cached[index] = { ...cached[index], ...finalPlant };
    } else {
      cached.unshift(finalPlant);
    }
    setCachedData('plants_all', cached);
    setCachedData(`plant_${savedId}`, finalPlant);
    notifyLocalListeners('plants_all', cached);

    return savedId;
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.WRITE, collections.PLANTS);
    return '';
  }
}

export async function deletePlant(id: string): Promise<void> {
  try {
    clearCachedData('plants_all');
    clearCachedData(`plant_${id}`);
    await deleteDoc(doc(db, collections.PLANTS, id));
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.DELETE, `${collections.PLANTS}/${id}`);
  }
}

export async function getCategories(): Promise<PlantCategory[]> {
  const cacheKey = 'categories_all';
  const isQuotaExceeded = getQuotaState();
  
  if (isQuotaExceeded) {
    try {
      const q = query(collection(db, collections.CATEGORIES), orderBy('name', 'asc'));
      const cacheSnapshot = await getDocsFromCache(q);
      if (!cacheSnapshot.empty) {
        return cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantCategory));
      }
    } catch (e) {
      console.warn('Categories Firestore cache fail:', e);
    }
    
    const cached = getCachedData<PlantCategory[]>(cacheKey, true);
    return cached || (fallbackCategories as PlantCategory[]);
  }

  try {
    const q = query(collection(db, collections.CATEGORIES), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantCategory));
    setCachedData(cacheKey, categories);
    return categories;
  } catch (error) {
    handleQuotaError(error);
    const quotaNow = getQuotaState();

    try {
      const q = query(collection(db, collections.CATEGORIES), orderBy('name', 'asc'));
      const cacheSnapshot = await getDocsFromCache(q);
      if (!cacheSnapshot.empty) {
        return cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantCategory));
      }
    } catch (cacheErr) {
      console.warn('Firestore cache fetch failed:', cacheErr);
    }

    if (!quotaNow) {
      handleFirestoreError(error, OperationType.GET, collections.CATEGORIES);
    }
    return getCachedData<PlantCategory[]>(cacheKey, true) || (fallbackCategories as PlantCategory[]);
  }
}

export function subscribeToCategories(callback: (categories: PlantCategory[]) => void) {
  const isQuotaExceeded = getQuotaState();
  const cached = getCachedData<PlantCategory[]>('categories_all', isQuotaExceeded);
  if (cached) callback(cached);

  if (isQuotaExceeded) {
    (async () => {
      try {
        const q = query(collection(db, collections.CATEGORIES));
        const cacheSnapshot = await getDocsFromCache(q);
        if (!cacheSnapshot.empty) {
          const cats = cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantCategory));
          cats.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          callback(cats);
        }
      } catch (e) {
        console.warn('Categories sub cache fail:', e);
      }
    })();

    localListeners['categories_all'].add(callback);
    return () => {
      localListeners['categories_all'].delete(callback);
    };
  }

  localListeners['categories_all'].add(callback);

  const q = query(collection(db, collections.CATEGORIES));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantCategory));
    // Sort in memory for consistency
    categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setCachedData('categories_all', categories);
    callback(categories);
    notifyLocalListeners('categories_all', categories);
  }, (error) => {
    handleQuotaError(error);
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.LIST, collections.CATEGORIES);
    }
  });

  return () => {
    unsubscribe();
    localListeners['categories_all'].delete(callback);
  };
}

export async function saveCategory(category: Partial<PlantCategory>): Promise<string> {
  try {
    const data = {
      ...category,
      updatedAt: Timestamp.now().toDate().toISOString(),
    };
    
    let savedId = category.id || '';
    if (category.id && !category.id.startsWith('temp-')) {
      const categoryRef = doc(db, collections.CATEGORIES, category.id);
      await setDoc(categoryRef, data, { merge: true });
    } else {
      const newId = `cat-${Date.now()}`;
      savedId = newId;
      const categoryRef = doc(db, collections.CATEGORIES, newId);
      await setDoc(categoryRef, {
        ...data,
        id: newId,
        createdAt: Timestamp.now().toDate().toISOString(),
      });
    }

    // Update cache
    const cached = getCachedData<PlantCategory[]>('categories_all') || [];
    const index = cached.findIndex(c => c.id === savedId);
    const finalCat = { ...category, id: savedId } as PlantCategory;
    if (index >= 0) {
      cached[index] = { ...cached[index], ...finalCat };
    } else {
      cached.push(finalCat);
    }
    setCachedData('categories_all', cached);
    notifyLocalListeners('categories_all', cached);

    return savedId;
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.WRITE, collections.CATEGORIES);
    return '';
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    clearCachedData('categories_all');
    await deleteDoc(doc(db, collections.CATEGORIES, id));
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.DELETE, `${collections.CATEGORIES}/${id}`);
  }
}

export async function getGardens(): Promise<any[]> {
  const cacheKey = 'gardens_all';
  const isQuotaExceeded = getQuotaState();
  
  if (isQuotaExceeded) {
    try {
      const q = query(collection(db, collections.GARDENS));
      const cacheSnapshot = await getDocsFromCache(q);
      if (!cacheSnapshot.empty) {
        const cacheGardens = cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        return cacheGardens.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      }
    } catch (e) {
      console.warn('Gardens Firestore cache fail:', e);
    }
    
    const cached = getCachedData<any[]>(cacheKey, true);
    return cached || fallbackGardens;
  }

  try {
    const q = query(collection(db, collections.GARDENS));
    const snapshot = await getDocs(q);
    const gardens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const sortedGardens = gardens.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    setCachedData(cacheKey, sortedGardens);
    return sortedGardens;
  } catch (error) {
    handleQuotaError(error);
    const quotaNow = getQuotaState();

    try {
      const q = query(collection(db, collections.GARDENS));
      const cacheSnapshot = await getDocsFromCache(q);
      if (!cacheSnapshot.empty) {
        const cacheGardens = cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        return cacheGardens.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      }
    } catch (cacheErr) {
      console.warn('Firestore cache fetch failed:', cacheErr);
    }

    if (!quotaNow) {
      handleFirestoreError(error, OperationType.GET, collections.GARDENS);
    }
    return getCachedData<any[]>(cacheKey, true) || fallbackGardens;
  }
}

export async function getAreas(gardenId?: string): Promise<GardenArea[]> {
  const cacheKey = `areas_${gardenId || 'all'}`;
  const isQuotaExceeded = getQuotaState();
  const cached = getCachedData<GardenArea[]>(cacheKey, isQuotaExceeded);
  
  if (isQuotaExceeded) {
    const fallback = gardenId 
      ? (fallbackAreas as GardenArea[]).filter(a => a.gardenId === gardenId)
      : (fallbackAreas as GardenArea[]);
    return cached || fallback;
  }

  try {
    const constraints: QueryConstraint[] = [];
    if (gardenId) {
      constraints.push(where('gardenId', '==', gardenId));
    }
    
    const q = query(collection(db, collections.AREAS), ...constraints);
    const snapshot = await getDocs(q);
    let areas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GardenArea));
    
    areas.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    setCachedData(cacheKey, areas);
    return areas;
  } catch (error) {
    handleQuotaError(error);
    const quotaNow = getQuotaState();

    try {
      const constraints: QueryConstraint[] = [];
      if (gardenId) {
        constraints.push(where('gardenId', '==', gardenId));
      }
      const q = query(collection(db, collections.AREAS), ...constraints);
      const cacheSnapshot = await getDocsFromCache(q);
      if (!cacheSnapshot.empty) {
        const cacheAreas = cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GardenArea));
        return cacheAreas.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      }
    } catch (cacheErr) {
      console.warn('Firestore cache fetch failed:', cacheErr);
    }

    if (!quotaNow) {
      handleFirestoreError(error, OperationType.GET, collections.AREAS);
    }
    const fallback = gardenId 
      ? (fallbackAreas as GardenArea[]).filter(a => a.gardenId === gardenId)
      : (fallbackAreas as GardenArea[]);
    return getCachedData<GardenArea[]>(cacheKey, true) || fallback;
  }
}

export function subscribeToAreas(gardenId: string | undefined, callback: (areas: GardenArea[]) => void) {
  const key = `areas_${gardenId || 'all'}`;
  if (!localListeners[key]) localListeners[key] = new Set();
  
  localListeners[key].add(callback);

  const isQuotaExceeded = getQuotaState();
  const cached = getCachedData<GardenArea[]>(key, isQuotaExceeded);
  if (cached) callback(cached);

  if (isQuotaExceeded) {
    (async () => {
      try {
        const constraints: QueryConstraint[] = [];
        if (gardenId) {
          constraints.push(where('gardenId', '==', gardenId));
        }
        const q = query(collection(db, collections.AREAS), ...constraints);
        const cacheSnapshot = await getDocsFromCache(q);
        if (!cacheSnapshot.empty) {
          const cacheAreas = cacheSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GardenArea));
          callback(cacheAreas.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
        }
      } catch (e) {
        console.warn('Areas sub cache fail:', e);
      }
    })();

    return () => {
      localListeners[key].delete(callback);
    };
  }

  const constraints: QueryConstraint[] = [];
  if (gardenId) {
    constraints.push(where('gardenId', '==', gardenId));
  }
  
  const q = query(collection(db, collections.AREAS), ...constraints);
  const unsubscribe = onSnapshot(q, (snapshot) => {
    let areas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GardenArea));
    areas.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    setCachedData(key, areas);
    callback(areas);
    notifyLocalListeners(key, areas);
  }, (error) => {
    handleQuotaError(error);
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.LIST, collections.AREAS);
    }
  });

  return () => {
    unsubscribe();
    localListeners[key].delete(callback);
  };
}

export async function saveArea(area: any): Promise<string> {
  try {
    const data = {
      ...area,
      updatedAt: Timestamp.now().toDate().toISOString(),
    };
    
    let savedId = area.id || '';
    if (area.id) {
      const areaRef = doc(db, collections.AREAS, area.id);
      await setDoc(areaRef, data, { merge: true });
    } else {
      const newId = `a-${Date.now()}`;
      savedId = newId;
      const areaRef = doc(db, collections.AREAS, newId);
      await setDoc(areaRef, {
        ...data,
        id: newId,
        createdAt: Timestamp.now().toDate().toISOString(),
        displayOrder: 0,
      });
    }

    // Update caches
    const finalArea = { ...area, id: savedId };
    const gardenId = area.gardenId || 'all';
    
    const allAreas = getCachedData<any[]>('areas_all') || [];
    const allIndex = allAreas.findIndex(a => a.id === savedId);
    if (allIndex >= 0) allAreas[allIndex] = { ...allAreas[allIndex], ...finalArea };
    else allAreas.push(finalArea);
    setCachedData('areas_all', allAreas);

    const gardenAreas = getCachedData<any[]>(`areas_${gardenId}`) || [];
    const gIndex = gardenAreas.findIndex(a => a.id === savedId);
    if (gIndex >= 0) gardenAreas[gIndex] = { ...gardenAreas[gIndex], ...finalArea };
    else gardenAreas.push(finalArea);
    setCachedData(`areas_${gardenId}`, gardenAreas);
    
    setCachedData(`area_${savedId}`, finalArea);
    notifyLocalListeners('areas_all', allAreas);
    notifyLocalListeners(`areas_${gardenId}`, gardenAreas);

    return savedId;
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.WRITE, collections.AREAS);
    return '';
  }
}

export async function deleteArea(id: string): Promise<void> {
  try {
    clearCachedData('areas_all');
    clearCachedData(`area_${id}`);
    await deleteDoc(doc(db, collections.AREAS, id));
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.DELETE, `${collections.AREAS}/${id}`);
  }
}

export async function getPlantById(id: string): Promise<Plant | null> {
  const cacheKey = `plant_${id}`;
  const isQuotaExceeded = getQuotaState();
  const cached = getCachedData<Plant>(cacheKey, isQuotaExceeded);
  
  if (isQuotaExceeded) {
    return cached || (fallbackPlants.find(p => p.id === id) as Plant) || null;
  }

  try {
    const docRef = doc(db, collections.PLANTS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const plant = { id: docSnap.id, ...docSnap.data() } as Plant;
      setCachedData(cacheKey, plant);
      return plant;
    }
    return cached || (fallbackPlants.find(p => p.id === id) as Plant) || null;
  } catch (error) {
    handleQuotaError(error);
    const quotaNow = getQuotaState();

    try {
      const docRef = doc(db, collections.PLANTS, id);
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) {
        return { id: cacheSnap.id, ...cacheSnap.data() } as Plant;
      }
    } catch (cacheErr) {
      console.warn('Firestore cache fetch failed:', cacheErr);
    }

    if (!quotaNow) {
      handleFirestoreError(error, OperationType.GET, `${collections.PLANTS}/${id}`);
    }
    return getCachedData<Plant>(cacheKey, true) || (fallbackPlants.find(p => p.id === id) as Plant) || null;
  }
}

export async function getGardenById(id: string): Promise<any | null> {
  const cacheKey = `garden_${id}`;
  const isQuotaExceeded = getQuotaState();
  const cached = getCachedData<any>(cacheKey, isQuotaExceeded);
  
  if (isQuotaExceeded) {
    return cached || fallbackGardens.find(g => g.id === id) || null;
  }

  try {
    const docRef = doc(db, collections.GARDENS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const garden = { id: docSnap.id, ...docSnap.data() };
      setCachedData(cacheKey, garden);
      return garden;
    }
    return cached || fallbackGardens.find(g => g.id === id) || null;
  } catch (error) {
    handleQuotaError(error);
    const quotaNow = getQuotaState();

    try {
      const docRef = doc(db, collections.GARDENS, id);
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) {
        return { id: cacheSnap.id, ...cacheSnap.data() };
      }
    } catch (cacheErr) {
      console.warn('Firestore cache fetch failed:', cacheErr);
    }

    if (!quotaNow) {
      handleFirestoreError(error, OperationType.GET, `${collections.GARDENS}/${id}`);
    }
    return getCachedData<any>(cacheKey, true) || fallbackGardens.find(g => g.id === id) || null;
  }
}

export function subscribeToGardens(callback: (gardens: any[]) => void) {
  const isQuotaExceeded = getQuotaState();
  const cached = getCachedData<any[]>('gardens_all', isQuotaExceeded);
  if (cached) callback(cached);

  if (isQuotaExceeded) {
    (async () => {
      try {
        const q = query(collection(db, collections.GARDENS));
        const cacheSnapshot = await getDocsFromCache(q);
        if (!cacheSnapshot.empty) {
          const sorted = cacheSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
          callback(sorted);
        }
      } catch (e) {
        console.warn('Gardens sub cache fail:', e);
      }
    })();

    localListeners['gardens_all'].add(callback);
    return () => {
      localListeners['gardens_all'].delete(callback);
    };
  }

  localListeners['gardens_all'].add(callback);

  const q = query(collection(db, collections.GARDENS));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const gardens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const sorted = gardens.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
    setCachedData('gardens_all', sorted);
    callback(sorted);
    notifyLocalListeners('gardens_all', sorted);
  }, (error) => {
    handleQuotaError(error);
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.LIST, collections.GARDENS);
    }
  });

  return () => {
    unsubscribe();
    localListeners['gardens_all'].delete(callback);
  };
}

export async function saveGarden(garden: any): Promise<string> {
  try {
    const data = {
      ...garden,
      updatedAt: Timestamp.now().toDate().toISOString(),
    };
    
    let savedId = garden.id || '';
    if (garden.id) {
      const gardenRef = doc(db, collections.GARDENS, garden.id);
      await setDoc(gardenRef, data, { merge: true });
    } else {
      const newId = `g-${Date.now()}`;
      savedId = newId;
      const gardenRef = doc(db, collections.GARDENS, newId);
      await setDoc(gardenRef, {
        ...data,
        id: newId,
        createdAt: Timestamp.now().toDate().toISOString(),
        displayOrder: 0,
      });
    }

    // Update cache
    const cached = getCachedData<any[]>('gardens_all') || [];
    const finalGarden = { ...garden, id: savedId };
    const index = cached.findIndex(g => g.id === savedId);
    if (index >= 0) cached[index] = { ...cached[index], ...finalGarden };
    else cached.push(finalGarden);
    setCachedData('gardens_all', cached);
    setCachedData(`garden_${savedId}`, finalGarden);
    notifyLocalListeners('gardens_all', cached);

    return savedId;
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.WRITE, collections.GARDENS);
    return '';
  }
}

export async function deleteGarden(id: string): Promise<void> {
  try {
    clearCachedData('gardens_all');
    clearCachedData(`garden_${id}`);
    await deleteDoc(doc(db, collections.GARDENS, id));
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.DELETE, `${collections.GARDENS}/${id}`);
  }
}

export async function saveMarker(marker: Partial<PlantMarker>): Promise<string> {
  try {
    if (marker.id && !marker.id.startsWith('m-new-')) {
      const markerRef = doc(db, collections.MARKERS, marker.id);
      await setDoc(markerRef, marker, { merge: true });
      return marker.id;
    } else {
      const newId = `m-${Date.now()}`;
      const markerRef = doc(db, collections.MARKERS, newId);
      await setDoc(markerRef, {
        ...marker,
        id: newId,
      });
      return newId;
    }
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.WRITE, collections.MARKERS);
    return '';
  }
}

export async function deleteMarker(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collections.MARKERS, id));
  } catch (error) {
    handleQuotaError(error);
    handleFirestoreError(error, OperationType.DELETE, `${collections.MARKERS}/${id}`);
  }
}

export async function getAreaById(id: string): Promise<any | null> {
  const cacheKey = `area_${id}`;
  const isQuotaExceeded = getQuotaState();
  const cached = getCachedData<any>(cacheKey, isQuotaExceeded);
  
  if (isQuotaExceeded) {
    return cached || fallbackAreas.find(a => a.id === id) || null;
  }

  try {
    const docRef = doc(db, collections.AREAS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const area = { id: docSnap.id, ...docSnap.data() };
      setCachedData(cacheKey, area);
      return area;
    }
    return cached || fallbackAreas.find(a => a.id === id) || null;
  } catch (error) {
    handleQuotaError(error);
    const quotaNow = getQuotaState();

    try {
      const docRef = doc(db, collections.AREAS, id);
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) {
        return { id: cacheSnap.id, ...cacheSnap.data() };
      }
    } catch (cacheErr) {
      console.warn('Firestore cache fetch failed:', cacheErr);
    }

    if (!quotaNow) {
      handleFirestoreError(error, OperationType.GET, `${collections.AREAS}/${id}`);
    }
    return getCachedData<any>(cacheKey, true) || fallbackAreas.find(a => a.id === id) || null;
  }
}

export async function getMarkers(areaId?: string): Promise<PlantMarker[]> {
  const cacheKey = `markers_${areaId || 'all'}`;
  const isQuotaExceeded = getQuotaState();
  const cached = getCachedData<PlantMarker[]>(cacheKey, isQuotaExceeded);
  
  if (isQuotaExceeded) {
    const fallback = areaId
      ? (fallbackMarkers as PlantMarker[]).filter(m => m.areaId === areaId)
      : (fallbackMarkers as PlantMarker[]);
    return cached || fallback;
  }

  try {
    const constraints: QueryConstraint[] = [];
    if (areaId) {
      constraints.push(where('areaId', '==', areaId));
    }
    const q = query(collection(db, collections.MARKERS), ...constraints);
    const snapshot = await getDocs(q);
    const markers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantMarker));
    setCachedData(cacheKey, markers);
    return markers;
  } catch (error) {
    handleQuotaError(error);
    const quotaNow = getQuotaState();
    if (!quotaNow) {
      handleFirestoreError(error, OperationType.GET, collections.MARKERS);
    }
    const fallback = areaId
      ? (fallbackMarkers as PlantMarker[]).filter(m => m.areaId === areaId)
      : (fallbackMarkers as PlantMarker[]);
    return getCachedData<PlantMarker[]>(cacheKey, true) || fallback;
  }
}

export function subscribeToMarkers(areaId: string | undefined, callback: (markers: PlantMarker[]) => void) {
  const key = `markers_${areaId || 'all'}`;
  if (!localListeners[key]) localListeners[key] = new Set();
  localListeners[key].add(callback);

  const isQuotaExceeded = getQuotaState();
  const cached = getCachedData<PlantMarker[]>(key, isQuotaExceeded);
  if (cached) callback(cached);

  if (isQuotaExceeded) return () => {
    localListeners[key].delete(callback);
  };

  const constraints: QueryConstraint[] = [];
  if (areaId) {
    constraints.push(where('areaId', '==', areaId));
  }
  const q = query(collection(db, collections.MARKERS), ...constraints);
  const unsubscribe = onSnapshot(q, (snapshot) => {
    let markers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantMarker));
    setCachedData(key, markers);
    callback(markers);
    notifyLocalListeners(key, markers);
  }, (error) => {
    handleQuotaError(error);
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.LIST, collections.MARKERS);
    }
  });

  return () => {
    unsubscribe();
    localListeners[key].delete(callback);
  };
}
