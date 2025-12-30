import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

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

export async function GET(request: NextRequest) {
  try {
    const db = await getHydraliteDatabase();
    const collection = db.collection('categories');
    
    const categories = await collection
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error fetching hydralite categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getHydraliteDatabase();
    const collection = db.collection('categories');

    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category already exists
    const existingCategory = await collection.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category already exists' },
        { status: 400 }
      );
    }

    // Create category document
    const categoryData = {
      id: `hydralite_cat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await collection.insertOne(categoryData);

    return NextResponse.json({
      success: true,
      data: { _id: result.insertedId, ...categoryData }
    });

  } catch (error) {
    console.error('Error creating hydralite category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}