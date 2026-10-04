/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  getDocs, 
  getDoc,
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
  QueryConstraint
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

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`botanical_cache_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
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
  const q = query(collection(db, collections.SCANS), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const scans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(scans);
  }, (error) => {
    // Handle error silently or log it - scans might not exist yet
    console.warn('Scans collection might be empty or missing:', error);
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
  const cached = getCachedData<Plant[]>(cacheKey);
  
  if (getQuotaState()) {
    return cached || (fallbackPlants as Plant[]);
  }

  try {
    const q = query(collection(db, collections.PLANTS), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const plants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
    setCachedData(cacheKey, plants);
    return plants;
  } catch (error) {
    handleQuotaError(error);
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.GET, collections.PLANTS);
    }
    return cached || (fallbackPlants as Plant[]);
  }
}

export function subscribeToPlants(callback: (plants: Plant[]) => void) {
  // Use cached data immediately if available
  const cached = getCachedData<Plant[]>('plants_all');
  if (cached) callback(cached);

  // Register for local updates even if quota is exceeded
  localListeners['plants_all'].add(callback);

  if (getQuotaState()) return () => {
    localListeners['plants_all'].delete(callback);
  };

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
    handleFirestoreError(error, OperationType.DELETE, `${collections.PLANTS}/${id}`);
  }
}

export async function getCategories(): Promise<PlantCategory[]> {
  const cacheKey = 'categories_all';
  const cached = getCachedData<PlantCategory[]>(cacheKey);
  
  if (getQuotaState()) {
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
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.GET, collections.CATEGORIES);
    }
    return cached || (fallbackCategories as PlantCategory[]);
  }
}

export function subscribeToCategories(callback: (categories: PlantCategory[]) => void) {
  const cached = getCachedData<PlantCategory[]>('categories_all');
  if (cached) callback(cached);

  localListeners['categories_all'].add(callback);

  if (getQuotaState()) return () => {
    localListeners['categories_all'].delete(callback);
  };

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
    handleFirestoreError(error, OperationType.WRITE, collections.CATEGORIES);
    return '';
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    clearCachedData('categories_all');
    await deleteDoc(doc(db, collections.CATEGORIES, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collections.CATEGORIES}/${id}`);
  }
}

export async function getGardens(): Promise<any[]> {
  const cacheKey = 'gardens_all';
  const cached = getCachedData<any[]>(cacheKey);
  
  if (getQuotaState()) {
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
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.GET, collections.GARDENS);
    }
    return cached || fallbackGardens;
  }
}

export async function getAreas(gardenId?: string): Promise<GardenArea[]> {
  const cacheKey = `areas_${gardenId || 'all'}`;
  const cached = getCachedData<GardenArea[]>(cacheKey);
  
  if (getQuotaState()) {
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
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.GET, collections.AREAS);
    }
    const fallback = gardenId 
      ? (fallbackAreas as GardenArea[]).filter(a => a.gardenId === gardenId)
      : (fallbackAreas as GardenArea[]);
    return cached || fallback;
  }
}

export function subscribeToAreas(gardenId: string | undefined, callback: (areas: GardenArea[]) => void) {
  const key = `areas_${gardenId || 'all'}`;
  if (!localListeners[key]) localListeners[key] = new Set();
  
  localListeners[key].add(callback);

  if (getQuotaState()) return () => {
    localListeners[key].delete(callback);
  };

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
    handleFirestoreError(error, OperationType.DELETE, `${collections.AREAS}/${id}`);
  }
}

export async function getPlantById(id: string): Promise<Plant | null> {
  const cacheKey = `plant_${id}`;
  const cached = getCachedData<Plant>(cacheKey);
  
  if (getQuotaState()) {
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
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.GET, `${collections.PLANTS}/${id}`);
    }
    return cached || (fallbackPlants.find(p => p.id === id) as Plant) || null;
  }
}

export async function getGardenById(id: string): Promise<any | null> {
  const cacheKey = `garden_${id}`;
  const cached = getCachedData<any>(cacheKey);
  
  if (getQuotaState()) {
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
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.GET, `${collections.GARDENS}/${id}`);
    }
    return cached || fallbackGardens.find(g => g.id === id) || null;
  }
}

export function subscribeToGardens(callback: (gardens: any[]) => void) {
  const cached = getCachedData<any[]>('gardens_all');
  if (cached) callback(cached);

  localListeners['gardens_all'].add(callback);

  if (getQuotaState()) return () => {
    localListeners['gardens_all'].delete(callback);
  };

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
    handleFirestoreError(error, OperationType.WRITE, collections.MARKERS);
    return '';
  }
}

export async function deleteMarker(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collections.MARKERS, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collections.MARKERS}/${id}`);
  }
}

export async function getAreaById(id: string): Promise<any | null> {
  const cacheKey = `area_${id}`;
  const cached = getCachedData<any>(cacheKey);
  
  if (getQuotaState()) {
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
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.GET, `${collections.AREAS}/${id}`);
    }
    return cached || fallbackAreas.find(a => a.id === id) || null;
  }
}

export async function getMarkers(areaId?: string): Promise<PlantMarker[]> {
  const cacheKey = `markers_${areaId || 'all'}`;
  const cached = getCachedData<PlantMarker[]>(cacheKey);
  
  if (getQuotaState()) {
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
    if (!getQuotaState()) {
      handleFirestoreError(error, OperationType.GET, collections.MARKERS);
    }
    const fallback = areaId
      ? (fallbackMarkers as PlantMarker[]).filter(m => m.areaId === areaId)
      : (fallbackMarkers as PlantMarker[]);
    return cached || fallback;
  }
}

export function subscribeToMarkers(areaId: string | undefined, callback: (markers: PlantMarker[]) => void) {
  const key = `markers_${areaId || 'all'}`;
  if (!localListeners[key]) localListeners[key] = new Set();
  localListeners[key].add(callback);

  if (getQuotaState()) return () => {
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
