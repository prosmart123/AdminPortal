export interface Product {
  _id: string;
  product_id: string;
  product_name: string;
  product_title: string;
  product_description: string;
  image_urls: string[];
  image_count: number;
  subcategory_id: string;
  category_id: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  _id: string;
  category_name: string;
  product_ids: string[];
  subcategory_ids: string[];
  product_count: number;
  subcategory_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Subcategory {
  _id: string;
  subcategory_name: string;
  category_id: string;
  product_ids: string[];
  product_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Admin {
  _id: string;
  username: string;
  password: string;
  role: string;
  permissions: string[];
  email: string;
  created_at: Date;
  last_login: Date | null;
  is_active: boolean;
}

export interface ProductFormData {
  product_name: string;
  product_title: string;
  product_description: string;
  category_id: string;
  subcategory_id: string;
}

export interface IdConvention {
  _id: string;
  collection_name: string;
  prefix: string;
  format: string;
  description: string;
  example: string;
  created_at: Date;
}
