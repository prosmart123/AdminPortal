import { getDatabase } from './mongodb';
import { generateProductId } from './id-generator';
import { Product, Category, Subcategory, ProductFormData } from '@/types/product';

interface PaginatedResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductFilters {
  search?: string;
  category_id?: string;
  subcategory_id?: string;
}

export class ProductService {
  static async getNextProductId(productName: string): Promise<string> {
    return await generateProductId(productName);
  }

  static async getAllCategories(): Promise<Category[]> {
    const db = await getDatabase();
    const categories = await db.collection('categories').find({}).toArray();
    return categories as unknown as Category[];
  }

  static async getSubcategoriesByCategory(categoryId: string): Promise<Subcategory[]> {
    const db = await getDatabase();
    const subcategories = await db.collection('subcategories')
      .find({ category_id: categoryId })
      .toArray();
    return subcategories as unknown as Subcategory[];
  }

  static async getAllSubcategories(): Promise<Subcategory[]> {
    const db = await getDatabase();
    const subcategories = await db.collection('subcategories').find({}).toArray();
    return subcategories as unknown as Subcategory[];
  }

  static async getAllProducts(): Promise<Product[]> {
    const db = await getDatabase();
    const products = await db.collection('products')
      .find({})
      .sort({ created_at: -1 })
      .toArray();
    return products as unknown as Product[];
  }

  static async getProductsWithFilters(filters: ProductFilters = {}): Promise<Product[]> {
    const db = await getDatabase();
    const collection = db.collection('products');

    // Build query filter
    const query: Record<string, unknown> = {};

    if (filters.search) {
      // Search in both product_name and product_title for better results
      query.$or = [
        { product_name: { $regex: filters.search, $options: 'i' } },
        { product_title: { $regex: filters.search, $options: 'i' } },
        { product_description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters.category_id && filters.category_id !== 'all') {
      query.category_id = filters.category_id;
    }

    if (filters.subcategory_id && filters.subcategory_id !== 'all') {
      query.subcategory_id = filters.subcategory_id;
    }

    // Get filtered products
    const products = await collection
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return products as unknown as Product[];
  }

  static async getProductsPaginated(
    page: number = 1,
    limit: number = 10,
    filters: ProductFilters = {}
  ): Promise<PaginatedResult> {
    const db = await getDatabase();
    const collection = db.collection('products');

    // Build query filter
    const query: Record<string, unknown> = {};

    if (filters.search) {
      // Search in both product_name and product_title for better results
      query.$or = [
        { product_name: { $regex: filters.search, $options: 'i' } },
        { product_title: { $regex: filters.search, $options: 'i' } },
        { product_description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters.category_id && filters.category_id !== 'all') {
      query.category_id = filters.category_id;
    }

    if (filters.subcategory_id && filters.subcategory_id !== 'all') {
      query.subcategory_id = filters.subcategory_id;
    }

    // Get total count for pagination
    const total = await collection.countDocuments(query);

    // Calculate skip
    const skip = (page - 1) * limit;

    // Get paginated products
    const products = await collection
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return {
      products: products as unknown as Product[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getTotalProductCount(filters: ProductFilters = {}): Promise<number> {
    const db = await getDatabase();
    const collection = db.collection('products');

    const query: Record<string, unknown> = {};

    if (filters.search) {
      // Search in both product_name and product_title for better results
      query.$or = [
        { product_name: { $regex: filters.search, $options: 'i' } },
        { product_title: { $regex: filters.search, $options: 'i' } },
        { product_description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters.category_id && filters.category_id !== 'all') {
      query.category_id = filters.category_id;
    }

    if (filters.subcategory_id && filters.subcategory_id !== 'all') {
      query.subcategory_id = filters.subcategory_id;
    }

    return await collection.countDocuments(query);
  }

  static async createProduct(productData: ProductFormData, imageUrls: string[]): Promise<Product> {
    const db = await getDatabase();
    const productId = await this.getNextProductId(productData.product_name);
    
    const product: Omit<Product, '_id'> = {
      product_id: productId,
      product_name: productData.product_name,
      product_title: productData.product_title,
      product_description: productData.product_description,
      image_urls: imageUrls,
      image_count: imageUrls.length,
      subcategory_id: productData.subcategory_id,
      category_id: productData.category_id,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    };

    // Insert the product
    await db.collection('products').insertOne({ _id: productId, ...product } as any);

    // Update category product_ids array
    await db.collection('categories').updateOne(
      { _id: productData.category_id } as any,
      {
        $push: { product_ids: productId },
        $inc: { product_count: 1 },
        $set: { updated_at: new Date() }
      } as any
    );

    // Update subcategory product_ids array
    await db.collection('subcategories').updateOne(
      { _id: productData.subcategory_id } as any,
      {
        $push: { product_ids: productId },
        $inc: { product_count: 1 },
        $set: { updated_at: new Date() }
      } as any
    );

    return { _id: productId, ...product } as Product;
  }

  static async getProductById(productId: string): Promise<Product | null> {
    const db = await getDatabase();
    const product = await db.collection('products').findOne({ product_id: productId });
    return product as unknown as Product | null;
  }

  static async updateProduct(productId: string, updateData: Partial<Product>): Promise<void> {
    const db = await getDatabase();
    await db.collection('products').updateOne(
      { product_id: productId },
      { 
        $set: { 
          ...updateData, 
          updated_at: new Date() 
        } 
      }
    );
  }

  static async deleteProduct(productId: string): Promise<void> {
    const db = await getDatabase();
    
    // Get product details first
    const product = await this.getProductById(productId);
    if (!product) return;

    // Remove from product collection
    await db.collection('products').deleteOne({ product_id: productId });

    // Remove from category product_ids array
    await db.collection('categories').updateOne(
      { _id: product.category_id } as any,
      {
        $pull: { product_ids: productId },
        $inc: { product_count: -1 },
        $set: { updated_at: new Date() }
      } as any
    );

    // Remove from subcategory product_ids array
    await db.collection('subcategories').updateOne(
      { _id: product.subcategory_id } as any,
      {
        $pull: { product_ids: productId },
        $inc: { product_count: -1 },
        $set: { updated_at: new Date() }
      } as any
    );
  }
}
