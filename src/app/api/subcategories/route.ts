import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/product-service';
import { getDatabase } from '@/lib/mongodb';
import { generateSubcategoryId } from '@/lib/id-generator';
import { withTimeout, subcategoriesCache, formatErrorResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    // Check cache first
    const cached = subcategoriesCache.get('all');
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const fetchSubcategories = async () => {
      const db = await getDatabase();
      
      // Get all subcategories
      const subcategories = await db.collection('subcategories').find({}).toArray();
      
      if (subcategories.length === 0) {
        return [];
      }
      
      // Use aggregation pipeline for efficient counting instead of N+1 queries
      const subcategoryIds = subcategories.map(s => s._id);
      
      const counts = await db.collection('products').aggregate([
        { $match: { subcategory_id: { $in: subcategoryIds } } },
        { $group: { _id: '$subcategory_id', count: { $sum: 1 } } }
      ]).toArray();
      
      // Create lookup map
      const countMap: Record<string, number> = {};
      
      counts.forEach(item => {
        countMap[item._id.toString()] = item.count;
      });
      
      // Enrich subcategories with counts
      const subcategoriesWithCounts = subcategories.map(subcategory => ({
        ...subcategory,
        product_count: countMap[subcategory._id.toString()] || 0
      }));
      
      return subcategoriesWithCounts;
    };

    // Apply 20 second timeout
    const data = await withTimeout(fetchSubcategories(), 20000, 'Subcategories request timeout');
    
    // Cache the result
    subcategoriesCache.set('all', data);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching all subcategories:', error);
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { subcategory_name, category_id, description } = await request.json();
    
    if (!subcategory_name || !category_id) {
      return NextResponse.json(
        { success: false, error: 'Subcategory name and category ID are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if category exists - match either _id or category_id
    const category = await db.collection('categories').findOne({
      $or: [
        { _id: category_id },
        { category_id: category_id }
      ]
    } as any);
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Selected category does not exist' },
        { status: 400 }
      );
    }

    // Check if subcategory with same name already exists in this category
    const existingSubcategory = await db.collection('subcategories').findOne({
      category_id: category_id,
      subcategory_name: { $regex: new RegExp(`^${subcategory_name}$`, 'i') }
    });
    
    if (existingSubcategory) {
      return NextResponse.json(
        { success: false, error: 'Subcategory with this name already exists in this category' },
        { status: 400 }
      );
    }

    // Generate new subcategory ID using your convention
    const subcategoryId = await generateSubcategoryId(subcategory_name);
    
    const newSubcategory = {
      _id: subcategoryId,
      subcategory_id: subcategoryId,
      subcategory_name: subcategory_name.trim(),
      category_id: category_id,
      description: description?.trim() || '',
      product_ids: [],
      product_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Insert the subcategory
    await db.collection('subcategories').insertOne(newSubcategory as any);
    
    // Update category to include this subcategory
    await db.collection('categories').updateOne(
      { _id: category_id } as any,
      {
        $push: { subcategory_ids: subcategoryId },
        $inc: { subcategory_count: 1 },
        $set: { updated_at: new Date() }
      } as any
    );
    
    return NextResponse.json({
      success: true,
      data: newSubcategory,
      message: 'Subcategory created successfully'
    });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create subcategory' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subcategoryId = searchParams.get('id');
    
    if (!subcategoryId) {
      return NextResponse.json(
        { success: false, error: 'Subcategory ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Get subcategory to find its category
    const subcategory = await db.collection('subcategories').findOne({ _id: subcategoryId } as any);
    if (!subcategory) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Check if subcategory has products
    const products = await db.collection('products').find({ subcategory_id: subcategoryId }).toArray();
    if (products.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete subcategory with existing products. Please move or delete products first.' },
        { status: 400 }
      );
    }

    // Delete the subcategory
    const result = await db.collection('subcategories').deleteOne({ _id: subcategoryId } as any);
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Update category to remove this subcategory
    await db.collection('categories').updateOne(
      { _id: subcategory.category_id } as any,
      {
        $pull: { subcategory_ids: subcategoryId },
        $inc: { subcategory_count: -1 },
        $set: { updated_at: new Date() }
      } as any
    );
    
    return NextResponse.json({
      success: true,
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete subcategory' },
      { status: 500 }
    );
  }
}

