import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/product-service';
import { getDatabase } from '@/lib/mongodb';
import { generateCategoryId } from '@/lib/id-generator';
import { withTimeout, categoriesCache, formatErrorResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    // Check cache first
    const cached = categoriesCache.get('all');
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const fetchCategories = async () => {
      const db = await getDatabase();
      
      // Get all categories - don't count in loop, use aggregation pipeline instead
      const categories = await db.collection('categories').find({}).toArray();
      
      if (categories.length === 0) {
        return [];
      }
      
      // Use aggregation pipeline for efficient counting
      const categoryIds = categories.map(c => c._id);
      
      const counts = await db.collection('products').aggregate([
        { $match: { category_id: { $in: categoryIds } } },
        { $group: { _id: '$category_id', count: { $sum: 1 } } }
      ]).toArray();
      
      const subcounts = await db.collection('subcategories').aggregate([
        { $match: { category_id: { $in: categoryIds } } },
        { $group: { _id: '$category_id', count: { $sum: 1 } } }
      ]).toArray();
      
      // Create lookup maps
      const countMap: Record<string, number> = {};
      const subcountMap: Record<string, number> = {};
      
      counts.forEach(item => {
        countMap[String(item._id)] = item.count;
      });
      
      subcounts.forEach(item => {
        subcountMap[String(item._id)] = item.count;
      });
      
      // Enrich categories with counts
      const categoriesWithCounts = categories.map(category => ({
        ...category,
        product_count: countMap[String(category._id)] || 0,
        subcategory_count: subcountMap[String(category._id)] || 0
      }));
      
      return categoriesWithCounts;
    };

    // Apply 20 second timeout
    const data = await withTimeout(fetchCategories(), 20000, 'Categories request timeout');
    
    // Cache the result
    categoriesCache.set('all', data);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { category_name, description } = await request.json();
    
    if (!category_name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if category with same name already exists
    const existingCategory = await db.collection('categories').findOne({
      category_name: { $regex: new RegExp(`^${category_name}$`, 'i') }
    });
    
    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category with this name already exists' },
        { status: 400 }
      );
    }

    // Generate new category ID using your convention
    const categoryId = await generateCategoryId(category_name);
    
    const newCategory = {
      _id: categoryId,
      category_id: categoryId,
      category_name: category_name.trim(),
      description: description?.trim() || '',
      subcategory_ids: [],
      product_ids: [],
      product_count: 0,
      subcategory_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('categories').insertOne(newCategory as any);
    
    return NextResponse.json({
      success: true,
      data: newCategory,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');
    const cascade = searchParams.get('cascade') === 'true';
    
    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if category has products
    const products = await db.collection('products').find({ category_id: categoryId }).toArray();
    if (products.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete category with existing products. Please move or delete products first.' },
        { status: 400 }
      );
    }

    // Get subcategories
    const subcategories = await db.collection('subcategories').find({ category_id: categoryId }).toArray();
    
    // If cascade is true, check if all subcategories are empty and delete them
    let deletedSubcategoriesCount = 0;
    if (cascade && subcategories.length > 0) {
      // Check if any subcategory has products
      for (const sub of subcategories) {
        const subId = sub._id || sub.subcategory_id;
        const subProducts = await db.collection('products').find({ subcategory_id: subId }).toArray();
        if (subProducts.length > 0) {
          return NextResponse.json(
            { success: false, error: 'Cannot delete: One or more subcategories have products.' },
            { status: 400 }
          );
        }
      }
      
      // All subcategories are empty - delete them
      const deleteSubsResult = await db.collection('subcategories').deleteMany({ category_id: categoryId });
      deletedSubcategoriesCount = deleteSubsResult.deletedCount || 0;
    } else if (subcategories.length > 0) {
      // Not cascading and has subcategories - don't allow
      return NextResponse.json(
        { success: false, error: 'Cannot delete category with existing subcategories. Please delete subcategories first.' },
        { status: 400 }
      );
    }

    // Delete the category
    const result = await db.collection('categories').deleteOne({ _id: categoryId } as any);
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
      deletedSubcategories: deletedSubcategoriesCount
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
