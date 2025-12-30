/**
 * Database index initialization
 * Ensures proper indexes exist for fast queries
 * Run this on startup or manually
 */

import { getDatabase } from './mongodb';

export async function ensureIndexes() {
  try {
    const db = await getDatabase();

    // Products collection indexes
    const productsCollection = db.collection('products');
    await productsCollection.createIndex({ category_id: 1 });
    await productsCollection.createIndex({ subcategory_id: 1 });
    await productsCollection.createIndex({ product_name: 'text', product_title: 'text', product_description: 'text' });
    await productsCollection.createIndex({ created_at: -1 });
    await productsCollection.createIndex({ category_id: 1, subcategory_id: 1 });

    // Categories collection indexes
    const categoriesCollection = db.collection('categories');
    await categoriesCollection.createIndex({ category_id: 1 });
    await categoriesCollection.createIndex({ category_name: 1 });

    // Subcategories collection indexes
    const subcategoriesCollection = db.collection('subcategories');
    await subcategoriesCollection.createIndex({ category_id: 1 });
    await subcategoriesCollection.createIndex({ subcategory_id: 1 });
    await subcategoriesCollection.createIndex({ category_id: 1, subcategory_id: 1 });

    console.log('✅ Database indexes ensured');
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Don't throw - indexes not existing won't break the app, just slow it down
  }
}
