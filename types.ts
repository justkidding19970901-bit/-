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
  stock: number;
  model: string;
  brand: string;
  category: string;
  specs: ProductSpec[];
  imageUrls: string[];
  videoUrl: string;
  tags: string;
}

export type Platform = 'momo' | 'yahoo' | 'pinkoi';

export const EMPTY_PRODUCT: Omit<Product, 'id'> = {
  name: '',
  description: '',
  price: 0,
  originalPrice: undefined,
  stock: 0,
  model: '',
  brand: '',
  category: '',
  specs: [],
  imageUrls: [],
  videoUrl: '',
  tags: '',
};
