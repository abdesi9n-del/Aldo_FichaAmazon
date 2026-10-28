export interface ProductSpecification {
  key: string;
  value: string;
}

export interface ExtractedProduct {
  id: string;
  source: 'amazon' | 'mercadolibre' | 'other';
  url: string;
  title: string;
  brand: string;
  model?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  discountPercentage?: number;
  rating?: number;
  reviewsCount?: number;
  availability: string;
  condition: string;
  seller: string;
  skuOrAsin: string;
  mainImage: string;
  images: string[];
  bulletPoints: string[];
  specifications: ProductSpecification[];
  description: string;
  warranty?: string;
  extractedAt: string;
}

export type ActiveWindowTab = 'general' | 'images' | 'specs' | 'description';
