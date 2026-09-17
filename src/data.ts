/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Garden, GardenArea, Plant, PlantCategory, PlantMarker } from './types';

export const categories: PlantCategory[] = [
  { id: 'cat-1', name: 'Trees', description: 'Large perennial woody plants', color: '#16a34a' },
  { id: 'cat-2', name: 'Medicinal', description: 'Plants with healing properties', color: '#059669' },
  { id: 'cat-3', name: 'Flowers', description: 'Ornamental flowering plants', color: '#db2777' },
  { id: 'cat-4', name: 'Palms', description: 'Tropical and subtropical trees', color: '#0d9488' },
  { id: 'cat-5', name: 'Shrubs', description: 'Small to medium-sized woody plants', color: '#4d7c0f' },
];

export const gardens: Garden[] = [
  {
    id: 'g-1',
    name: 'Main Botanical Garden',
    code: 'MBG',
    location: 'North Campus',
    description: 'A sprawling collection of native and exotic species across 50 acres.',
    coverImage: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=1200',
    status: 'active',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g-2',
    name: 'Medicinal Garden',
    code: 'MED',
    location: 'East Wing',
    description: 'Curated collection of traditional healing plants and herbs.',
    coverImage: 'https://images.unsplash.com/photo-1598901861713-a4ad16a7d72e?auto=format&fit=crop&q=80&w=1200',
    status: 'active',
    displayOrder: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g-3',
    name: 'Flower Garden',
    code: 'FLW',
    location: 'Central Plaza',
    description: 'Vibrant seasonal blooms and ornamental landscape design.',
    coverImage: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&q=80&w=1200',
    status: 'active',
    displayOrder: 3,
    createdAt: new Date().toISOString(),
  },
];

export const areas: GardenArea[] = [
  {
    id: 'a-1',
    gardenId: 'g-1',
    name: 'Palm Zone',
    code: 'G1-PZ',
    description: 'Tropical oasis featuring majestic palm varieties from around the world.',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200',
    status: 'active',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'a-2',
    gardenId: 'g-2',
    name: 'Medicinal Plant Zone',
    code: 'G2-MPZ',
    description: 'A sacred space for traditional medicine and wellness plants.',
    imageUrl: 'https://images.unsplash.com/photo-1599591037488-8a3064d5c9cc?auto=format&fit=crop&q=80&w=1200',
    status: 'active',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
  },
];

export const plants: Plant[] = [
  {
    id: 'p-1',
    categoryId: 'cat-2',
    commonName: 'Neem',
    botanicalName: 'Azadirachta indica',
    scientificName: 'Azadirachta indica',
    family: 'Meliaceae',
    shortDescription: 'A fast-growing evergreen tree widely known for its medicinal uses.',
    description: 'Neem is a versatile tree in the mahogany family. It is native to the Indian subcontinent. It is typically grown in tropical and semi-tropical regions. Neem trees now also grow in islands located in the southern part of Iran. Its fruits and seeds are the source of neem oil.',
    benefits: 'Antiseptic, anti-inflammatory, antioxidant, and immune-boosting properties.',
    careInstructions: 'Requires minimal watering once established. Prune for shape.',
    sunlightRequirement: 'full sun',
    waterRequirement: 'low',
    soilType: 'Well-drained soil',
    temperature: '20°C - 35°C',
    humidity: 'Low to moderate',
    averageHeight: '15-20 meters',
    growthRate: 'Fast',
    floweringSeason: 'Spring',
    nativeRegion: 'Indian Subcontinent',
    primaryImage: 'https://images.unsplash.com/photo-1630138222955-4089c968f9a2?auto=format&fit=crop&q=80&w=800',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-2',
    categoryId: 'cat-2',
    commonName: 'Tulsi',
    botanicalName: 'Ocimum tenuiflorum',
    scientificName: 'Ocimum sanctum',
    family: 'Lamiaceae',
    shortDescription: 'The Queen of Herbs, sacred in many cultures for its healing power.',
    description: 'Holy basil is an erect, many-branched subshrub, 30–60 cm (12–24 in) tall with hairy stems. Leaves are green or purple; they are simple, petioled, with an ovate blade up to 5 cm (2.0 in) long, which usually has a slightly toothed margin; they are strongly scented and have a decussate phyllotaxy.',
    benefits: 'Relieves stress, boosts immunity, and improves respiratory health.',
    careInstructions: 'Water regularly but avoid waterlogging. Harvest leaves frequently.',
    sunlightRequirement: 'full sun',
    waterRequirement: 'moderate',
    soilType: 'Rich, loamy soil',
    temperature: '15°C - 30°C',
    humidity: 'Moderate',
    averageHeight: '30-60 cm',
    growthRate: 'Moderate',
    floweringSeason: 'Summer',
    nativeRegion: 'Southeast Asia',
    primaryImage: 'https://images.unsplash.com/photo-1603517452331-5975f7823351?auto=format&fit=crop&q=80&w=800',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-3',
    categoryId: 'cat-3',
    commonName: 'Rose',
    botanicalName: 'Rosa',
    family: 'Rosaceae',
    shortDescription: 'Classic ornamental flower with diverse varieties and fragrances.',
    description: 'A rose is either a woody perennial flowering plant of the genus Rosa, in the family Rosaceae, or the flower it bears. There are over three hundred species and tens of thousands of cultivars.',
    benefits: 'Aromatherapy, skin care, and ornamental value.',
    careInstructions: 'Deadhead spent blooms. Fertilize in spring. Water at the base.',
    sunlightRequirement: 'full sun',
    waterRequirement: 'moderate',
    soilType: 'Moist, well-drained soil',
    primaryImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

export const markers: PlantMarker[] = [
  { id: 'm-1', areaId: 'a-2', plantId: 'p-1', x: 25, y: 30, status: 'active' },
  { id: 'm-2', areaId: 'a-2', plantId: 'p-2', x: 60, y: 45, status: 'active' },
  { id: 'm-3', areaId: 'a-2', plantId: 'p-3', x: 40, y: 70, status: 'active' },
];
