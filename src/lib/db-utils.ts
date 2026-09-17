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
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Plant, PlantCategory, Garden, GardenArea, PlantMarker } from '../types';

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
  try {
    const q = query(collection(db, collections.PLANTS), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collections.PLANTS);
    return [];
  }
}

export function subscribeToPlants(callback: (plants: Plant[]) => void) {
  const q = query(collection(db, collections.PLANTS), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const plants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
    callback(plants);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collections.PLANTS);
  });
}

export async function savePlant(plant: Partial<Plant>): Promise<string> {
  try {
    if (plant.id) {
      const plantRef = doc(db, collections.PLANTS, plant.id);
      await setDoc(plantRef, {
        ...plant,
        updatedAt: Timestamp.now().toDate().toISOString(),
      }, { merge: true });
      return plant.id;
    } else {
      const newId = `p-${Date.now()}`;
      const plantRef = doc(db, collections.PLANTS, newId);
      await setDoc(plantRef, {
        ...plant,
        id: newId,
        createdAt: Timestamp.now().toDate().toISOString(),
        updatedAt: Timestamp.now().toDate().toISOString(),
      });
      return newId;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collections.PLANTS);
    return '';
  }
}

export async function deletePlant(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collections.PLANTS, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collections.PLANTS}/${id}`);
  }
}

export async function getCategories(): Promise<PlantCategory[]> {
  try {
    const q = query(collection(db, collections.CATEGORIES), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantCategory));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collections.CATEGORIES);
    return [];
  }
}

export function subscribeToCategories(callback: (categories: PlantCategory[]) => void) {
  const q = query(collection(db, collections.CATEGORIES));
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantCategory));
    // Sort in memory for consistency
    categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(categories);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collections.CATEGORIES);
  });
}

export async function saveCategory(category: Partial<PlantCategory>): Promise<string> {
  try {
    const data = {
      ...category,
      updatedAt: Timestamp.now().toDate().toISOString(),
    };
    
    if (category.id && !category.id.startsWith('temp-')) {
      const categoryRef = doc(db, collections.CATEGORIES, category.id);
      await setDoc(categoryRef, data, { merge: true });
      return category.id;
    } else {
      const newId = `cat-${Date.now()}`;
      const categoryRef = doc(db, collections.CATEGORIES, newId);
      await setDoc(categoryRef, {
        ...data,
        id: newId,
        createdAt: Timestamp.now().toDate().toISOString(),
      });
      return newId;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collections.CATEGORIES);
    return '';
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collections.CATEGORIES, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collections.CATEGORIES}/${id}`);
  }
}

export async function getGardens(): Promise<any[]> {
  try {
    const q = query(collection(db, collections.GARDENS));
    const snapshot = await getDocs(q);
    const gardens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return gardens.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collections.GARDENS);
    return [];
  }
}

export async function getAreas(gardenId?: string): Promise<GardenArea[]> {
  try {
    const q = query(collection(db, collections.AREAS));
    const snapshot = await getDocs(q);
    let areas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GardenArea));
    
    areas.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
    if (gardenId) {
      areas = areas.filter(a => a.gardenId === gardenId);
    }
    return areas;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collections.AREAS);
    return [];
  }
}

export function subscribeToAreas(gardenId: string | undefined, callback: (areas: GardenArea[]) => void) {
  const q = query(collection(db, collections.AREAS));
  return onSnapshot(q, (snapshot) => {
    let areas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GardenArea));
    
    // Sort in memory to ensure all documents are included even if they lack displayOrder
    areas.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
    if (gardenId) {
      areas = areas.filter(a => a.gardenId === gardenId);
    }
    callback(areas);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collections.AREAS);
  });
}

export async function saveArea(area: any): Promise<string> {
  try {
    const data = {
      ...area,
      updatedAt: Timestamp.now().toDate().toISOString(),
    };
    
    if (area.id) {
      const areaRef = doc(db, collections.AREAS, area.id);
      await setDoc(areaRef, data, { merge: true });
      return area.id;
    } else {
      const newId = `a-${Date.now()}`;
      const areaRef = doc(db, collections.AREAS, newId);
      await setDoc(areaRef, {
        ...data,
        id: newId,
        createdAt: Timestamp.now().toDate().toISOString(),
        displayOrder: 0,
      });
      return newId;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collections.AREAS);
    return '';
  }
}

export async function deleteArea(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collections.AREAS, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collections.AREAS}/${id}`);
  }
}

export async function getPlantById(id: string): Promise<Plant | null> {
  try {
    const docRef = doc(db, collections.PLANTS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Plant;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collections.PLANTS}/${id}`);
    return null;
  }
}

export async function getGardenById(id: string): Promise<any | null> {
  try {
    const docRef = doc(db, collections.GARDENS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collections.GARDENS}/${id}`);
    return null;
  }
}

export function subscribeToGardens(callback: (gardens: any[]) => void) {
  const q = query(collection(db, collections.GARDENS));
  return onSnapshot(q, (snapshot) => {
    const gardens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort in memory to avoid missing documents lacking displayOrder
    gardens.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
    callback(gardens);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collections.GARDENS);
  });
}

export async function saveGarden(garden: any): Promise<string> {
  try {
    const data = {
      ...garden,
      updatedAt: Timestamp.now().toDate().toISOString(),
    };
    
    if (garden.id) {
      const gardenRef = doc(db, collections.GARDENS, garden.id);
      await setDoc(gardenRef, data, { merge: true });
      return garden.id;
    } else {
      const newId = `g-${Date.now()}`;
      const gardenRef = doc(db, collections.GARDENS, newId);
      await setDoc(gardenRef, {
        ...data,
        id: newId,
        createdAt: Timestamp.now().toDate().toISOString(),
        displayOrder: 0,
      });
      return newId;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collections.GARDENS);
    return '';
  }
}

export async function deleteGarden(id: string): Promise<void> {
  try {
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
  try {
    const docRef = doc(db, collections.AREAS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collections.AREAS}/${id}`);
    return null;
  }
}

export async function getMarkers(areaId?: string): Promise<PlantMarker[]> {
  try {
    const q = query(collection(db, collections.MARKERS));
    const snapshot = await getDocs(q);
    let markers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantMarker));
    if (areaId) {
      markers = markers.filter(m => m.areaId === areaId);
    }
    return markers;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collections.MARKERS);
    return [];
  }
}

export function subscribeToMarkers(areaId: string | undefined, callback: (markers: PlantMarker[]) => void) {
  const q = query(collection(db, collections.MARKERS));
  return onSnapshot(q, (snapshot) => {
    let markers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantMarker));
    if (areaId) {
      markers = markers.filter(m => m.areaId === areaId);
    }
    callback(markers);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collections.MARKERS);
  });
}
