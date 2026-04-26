export interface ProductSpec {
  name: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  cost?: number;
  stock: number;
  model: string;
  brand: string;
  category: string;
  // Platform-specific category codes (filled in by user based on each platform's
  // category tree). Leave blank to fall back to the free-text `category` above.
  momoCategoryCode?: string;
  yahooCategoryCode?: string;
  pinkoiCategory?: string;
  specs: ProductSpec[];
  imageUrls: string[];
  videoUrl: string;
  tags: string;
  weightG: number;
  condition: '新品' | '二手';
  origin: string;
  warranty: string;
  shippingDays: number;
}

export type Platform = 'momo' | 'yahoo' | 'pinkoi';

export const EMPTY_PRODUCT: Omit<Product, 'id'> = {
  name: '',
  description: '',
  price: 0,
  originalPrice: undefined,
  cost: undefined,
  stock: 0,
  model: '',
  brand: '',
  category: '',
  momoCategoryCode: '',
  yahooCategoryCode: '',
  pinkoiCategory: '',
  specs: [],
  imageUrls: [],
  videoUrl: '',
  tags: '',
  weightG: 0,
  condition: '新品',
  origin: '台灣',
  warranty: '',
  shippingDays: 3,
};
