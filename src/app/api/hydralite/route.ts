import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/config/env';
import { MongoClient, ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';

// MongoDB configuration
const username = encodeURIComponent("kunal");
const password = encodeURIComponent("kunal");
const mongo_uri = `mongodb+srv://${username}:${password}@cluster0.9k8qle5.mongodb.net/?appName=Cluster0`;

// Cloudinary configuration
const DEST_CREDS = {
  "cloud_name": "dstmt1w5p",
  "api_key": "747859347794899",
  "api_secret": "O04mjGTySv_xuuXHWQ6hR6uuHcM",
};

cloudinary.config({
  cloud_name: DEST_CREDS.cloud_name,
  api_key: DEST_CREDS.api_key,
  api_secret: DEST_CREDS.api_secret,
});

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
    const collection = db.collection('products');

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const all = searchParams.get('all');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query for hydralite products
    let query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    // Get products with or without pagination
    let products;
    let total;

    if (all === 'true') {
      products = await collection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      total = products.length;
    } else {
      products = await collection
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 })
        .toArray();
      total = await collection.countDocuments(query);
    }

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching hydralite products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Additional diagnostic: surface incoming request headers to verify the request reached this route
    console.log('Hydralite POST invoked. Headers snapshot (first 5):', Array.from(request.headers.entries()).slice(0, 5));
    console.log('Content-Type header:', request.headers.get('content-type'));
    console.log('Cloudinary config (from env) loaded:', {
      cloudName: config.cloudinary.cloudName,
      hasApiKey: Boolean(config.cloudinary.apiKey)
    });
    const db = await getHydraliteDatabase();
    const collection = db.collection('products');

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const subcategory = formData.get('subcategory') as string;
    const productId = formData.get('id') as string;
    const keyFeaturesStr = formData.get('key_features') as string;

    console.log('🎯 POST /api/hydralite called with name:', name);

    if (!name || !description) {
      return NextResponse.json(
        { success: false, error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Parse key_features
    let key_features: Array<{ title: string; description: string }> = [];
    if (keyFeaturesStr) {
      try {
        key_features = JSON.parse(keyFeaturesStr);
      } catch (e) {
        console.error('Error parsing key_features:', e);
      }
    }

    // Generate product ID if not provided
    const finalProductId = productId || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Handle asset uploads (images and videos)
    const assets: Array<{ type: string; path: string }> = [];
    const assetEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith('assets['));

    console.log(`📦 Found ${assetEntries.length} asset entries in FormData`);
    console.log('Asset entry keys:', assetEntries.map(([key]) => key));
    // Additional debug to help diagnose uploads not starting
    console.log('Debug: assetEntries details:');
    assetEntries.forEach(([key, file]) => {
      const typeDesc = (file && typeof file === 'object') ? (file as any).type ?? 'unknown' : typeof file;
      console.log(`  - ${key}: type=${typeDesc}, value=${file && (file as any).name ? (file as any).name : 'n/a'}`);
    });

    // Upload all assets to Cloudinary first - fail if any upload fails
    for (const [key, file] of assetEntries) {
      if (file instanceof File) {
        console.log(`📤 Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Determine resource type
          const isVideo = file.type.startsWith('video/');
          const resourceType = isVideo ? 'video' : 'image';

          // Create folder path like: hydralite/product_id/product_name
          const safeName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
          const folderPath = `hydralite/${finalProductId}/${safeName}`;

          console.log('🔧 Uploading to Cloudinary:', {
            cloud_name: DEST_CREDS.cloud_name,
            folder: folderPath,
            resource_type: resourceType,
            file_name: file.name,
            file_size: buffer.length
          });

          // Upload to Cloudinary using base64 data URI (same as ProSmart products)
          const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;
          const publicId = `${safeName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          const uploadResult = await cloudinary.uploader.upload(base64Data, {
            public_id: publicId,
            resource_type: resourceType,
            folder: folderPath,
            overwrite: true,
          });

          console.log('✅ Cloudinary upload success:', uploadResult.secure_url);

          if (uploadResult && uploadResult.secure_url) {
            assets.push({
              type: resourceType,
              path: uploadResult.secure_url
            });
            console.log('✅ Asset added to array:', uploadResult.secure_url);
          } else {
            // If upload didn't return a URL, treat it as a failure
            console.error('❌ Upload result invalid:', uploadResult);
            throw new Error('Cloudinary upload did not return a valid URL');
          }
        } catch (uploadError: any) {
          console.error('❌ Error uploading asset to Cloudinary:', {
            message: uploadError.message,
            error: uploadError,
            stack: uploadError.stack
          });
          // Return error immediately - do NOT save to MongoDB if upload fails
          return NextResponse.json(
            {
              success: false,
              error: `Failed to upload asset to Cloudinary: ${uploadError.message || 'Unknown error'}. Product not saved.`
            },
            { status: 500 }
          );
        }
      }
    }

    console.log(`✅ All ${assets.length} assets uploaded successfully`);

    // Only save to MongoDB if ALL uploads succeeded
    // Create product document with Cloudinary URLs only (no raw data)
    const productData: any = {
      id: finalProductId,
      name,
      description,
      category: category || undefined,
      assets, // Contains only Cloudinary URLs
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (subcategory) {
      productData.subcategory = subcategory;
    }

    if (key_features && key_features.length > 0) {
      productData.key_features = key_features;
    }

    const result = await collection.insertOne(productData);

    console.log(`✅ Product saved to MongoDB with ID: ${result.insertedId}`);

    return NextResponse.json({
      success: true,
      data: { _id: result.insertedId, ...productData }
    });

  } catch (error) {
    console.error('Error creating hydralite product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}