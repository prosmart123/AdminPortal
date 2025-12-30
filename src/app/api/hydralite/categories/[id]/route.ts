import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

// MongoDB configuration
const username = encodeURIComponent("kunal");
const password = encodeURIComponent("kunal");
const mongo_uri = `mongodb+srv://${username}:${password}@cluster0.9k8qle5.mongodb.net/?appName=Cluster0`;

let client: MongoClient | null = null;

async function getHydraliteDatabase() {
  if (!client) {
    client = new MongoClient(mongo_uri);
    await client.connect();
  }
  return client.db('hydralite');
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getHydraliteDatabase();
    const collection = db.collection('categories');
    
    const categoryId = params.id;
    
    // Try to find by ObjectId first, then by custom id field
    let category;
    try {
      category = await collection.findOne({ _id: new ObjectId(categoryId) });
    } catch {
      category = await collection.findOne({ id: categoryId });
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('Error fetching hydralite category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getHydraliteDatabase();
    const collection = db.collection('categories');

    const categoryId = params.id;
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if another category with the same name exists
    let existingCategory;
    try {
      existingCategory = await collection.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: new ObjectId(categoryId) }
      });
    } catch {
      existingCategory = await collection.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        id: { $ne: categoryId }
      });
    }

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category name already exists' },
        { status: 400 }
      );
    }

    // Update category
    const updateData = {
      name: name.trim(),
      updated_at: new Date().toISOString(),
    };

    let result;
    try {
      result = await collection.updateOne(
        { _id: new ObjectId(categoryId) },
        { $set: updateData }
      );
    } catch {
      result = await collection.updateOne(
        { id: categoryId },
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully'
    });

  } catch (error) {
    console.error('Error updating hydralite category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getHydraliteDatabase();
    const categoriesCollection = db.collection('categories');
    const productsCollection = db.collection('products');

    const categoryId = params.id;

    // Find the category first to get its name
    let category;
    try {
      category = await categoriesCollection.findOne({ _id: new ObjectId(categoryId) });
    } catch {
      category = await categoriesCollection.findOne({ id: categoryId });
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if any products are using this category
    const productsUsingCategory = await productsCollection.countDocuments({ 
      category: category.name 
    });

    if (productsUsingCategory > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete category. ${productsUsingCategory} product(s) are using this category.` },
        { status: 400 }
      );
    }

    // Delete category
    let result;
    try {
      result = await categoriesCollection.deleteOne({ _id: new ObjectId(categoryId) });
    } catch {
      result = await categoriesCollection.deleteOne({ id: categoryId });
    }

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting hydralite category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}