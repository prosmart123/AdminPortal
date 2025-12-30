import { NextRequest, NextResponse } from 'next/server';
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

const CLOUDINARY_CONFIG = {
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME as string) || DEST_CREDS.cloud_name,
  api_key: (process.env.CLOUDINARY_API_KEY as string) || DEST_CREDS.api_key,
  api_secret: (process.env.CLOUDINARY_API_SECRET as string) || DEST_CREDS.api_secret,
};

cloudinary.config({
  cloud_name: CLOUDINARY_CONFIG.cloud_name,
  api_key: CLOUDINARY_CONFIG.api_key,
  api_secret: CLOUDINARY_CONFIG.api_secret,
});

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
    const collection = db.collection('products');

    const productId = params.id;

    // Try to find by ObjectId first, then by custom id field
    let product;
    try {
      product = await collection.findOne({ _id: new ObjectId(productId) });
    } catch {
      product = await collection.findOne({ id: productId });
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error fetching hydralite product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getHydraliteDatabase();
    const collection = db.collection('products');

    const productId = params.id;
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const subcategory = formData.get('subcategory') as string;
    const keyFeaturesStr = formData.get('key_features') as string;
    const assetMetadataStr = formData.get('assetMetadata') as string;

    console.log('🎯 PUT /api/hydralite/[id] called for:', productId);

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

    // Find existing product
    let existingProduct;
    try {
      existingProduct = await collection.findOne({ _id: new ObjectId(productId) });
    } catch {
      existingProduct = await collection.findOne({ id: productId });
    }

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Handle asset updates (images and videos)
    let assets: Array<{ type: string; path: string }> = [];

    // First, upload any NEW files to Cloudinary
    const newAssetEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith('assets['));
    console.log(`📦 Found ${newAssetEntries.length} NEW asset files to upload`);

    const newlyUploadedAssets: Array<{ type: string; path: string }> = [];
    for (const [key, file] of newAssetEntries) {
      if (file instanceof File) {
        console.log(`📤 Uploading NEW file: ${file.name}`);
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          const isVideo = file.type.startsWith('video/');
          const resourceType = isVideo ? 'video' : 'image';

          const safeName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
          const folderPath = `hydralite/${productId}/${safeName}`;

          // Upload to Cloudinary using base64 data URI
          const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;
          const publicId = `${safeName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          const uploadResult = await cloudinary.uploader.upload(base64Data, {
            public_id: publicId,
            resource_type: resourceType,
            folder: folderPath,
            overwrite: true,
          });

          console.log('✅ NEW asset uploaded:', uploadResult.secure_url);

          newlyUploadedAssets.push({
            type: resourceType,
            path: uploadResult.secure_url
          });
        } catch (uploadError: any) {
          console.error('❌ Error uploading NEW asset:', uploadError);
          return NextResponse.json(
            {
              success: false,
              error: `Failed to upload new asset: ${uploadError.message || 'Unknown error'}`
            },
            { status: 500 }
          );
        }
      }
    }

    console.log(`✅ Uploaded ${newlyUploadedAssets.length} new assets`);

    // Now handle existing assets from metadata
    let existingAssets: Array<{ type: string; path: string }> = [];
    if (assetMetadataStr) {
      try {
        const assetMetadata = JSON.parse(assetMetadataStr);
        const { existingAssetUrls } = assetMetadata;
        console.log('Existing asset URLs:', existingAssetUrls);

        // Preserve existing assets
        const existingAssetsMap = new Map<string, string>();
        if (existingProduct.assets && Array.isArray(existingProduct.assets)) {
          existingProduct.assets.forEach((asset: { type?: string; path: string }) => {
            existingAssetsMap.set(asset.path, asset.type || 'image');
          });
        }

        existingAssets = (existingAssetUrls || []).map((url: string) => {
          const originalType = existingAssetsMap.get(url) || (url.match(/\.(mp4|avi|mov|wmv)$/i) ? 'video' : 'image');
          return { type: originalType, path: url };
        });
      } catch (e) {
        console.error('Error parsing asset metadata:', e);
        existingAssets = existingProduct.assets || [];
      }
    } else {
      existingAssets = existingProduct.assets || [];
    }

    // Combine newly uploaded assets with existing assets
    assets = [...newlyUploadedAssets, ...existingAssets];
    console.log(`📊 Total assets: ${assets.length} (new: ${newlyUploadedAssets.length}, existing: ${existingAssets.length})`);

    // Update product
    const updateData: any = {
      name,
      description,
      category: category || undefined,
      assets,
      updated_at: new Date().toISOString(),
    };

    if (subcategory) {
      updateData.subcategory = subcategory;
    }

    if (key_features && key_features.length > 0) {
      updateData.key_features = key_features;
    }

    let result;
    try {
      result = await collection.updateOne(
        { _id: new ObjectId(productId) },
        { $set: updateData }
      );
    } catch {
      result = await collection.updateOne(
        { id: productId },
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('✅ Product updated successfully');

    return NextResponse.json({
      success: true,
      data: { ...existingProduct, ...updateData }
    });

  } catch (error) {
    console.error('Error updating hydralite product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getHydraliteDatabase();
    const collection = db.collection('products');

    const productId = params.id;

    // Find and delete product
    let result;
    try {
      result = await collection.deleteOne({ _id: new ObjectId(productId) });
    } catch {
      result = await collection.deleteOne({ id: productId });
    }

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting hydralite product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}