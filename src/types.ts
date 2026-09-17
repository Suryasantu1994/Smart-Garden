/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Garden {
  id: string;
  name: string;
  code: string;
  location: string;
  description: string;
  coverImage: string;
  status: 'active' | 'inactive';
  displayOrder: number;
  createdAt: string;
}

export interface GardenArea {
  id: string;
  gardenId: string;
  name: string;
  code: string;
  description: string;
  imageUrl: string;
  status: 'active' | 'inactive';
  displayOrder: number;
  createdAt: string;
}

export interface PlantCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface Plant {
  id: string;
  categoryId: string;
  commonName: string;
  botanicalName: string;
  scientificName?: string;
  family?: string;
  shortDescription: string;
  description: string;
  benefits?: string;
  careInstructions?: string;
  sunlightRequirement: 'low' | 'partial' | 'full sun';
  waterRequirement: 'low' | 'moderate' | 'high';
  soilType?: string;
  temperature?: string;
  humidity?: string;
  averageHeight?: string;
  growthRate?: string;
  floweringSeason?: string;
  nativeRegion?: string;
  primaryImage: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface PlantImage {
  id: string;
  plantId: string;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface PlantMarker {
  id: string;
  areaId: string;
  plantId: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  label?: string;
  notes?: string;
  status: 'active' | 'inactive';
}

export interface QRCode {
  id: string;
  gardenId: string;
  areaId: string;
  code: string;
  label: string;
  targetUrl: string;
  status: 'active' | 'inactive';
  scanCount: number;
  createdAt: string;
}

export interface Analytics {
  totalScans: number;
  totalGardens: number;
  totalAreas: number;
  totalPlants: number;
}
