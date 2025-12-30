import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { ProductService } from '@/lib/product-service';
import { CloudinaryService } from '@/lib/cloudinary';
import { Product } from '@/types/product';

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;
    const product = await ProductService.getProductById(productId);
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;
    const formData = await request.formData();

    // Get current product
    const currentProduct = await ProductService.getProductById(productId);
    if (!currentProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Extract form fields
    const productName = formData.get('product_name') as string;
    const productTitle = formData.get('product_title') as string;
    const productDescription = formData.get('product_description') as string;
    const categoryId = formData.get('category_id') as string;
    const subcategoryId = formData.get('subcategory_id') as string;
    const categoryName = formData.get('category_name') as string;
    const subcategoryName = formData.get('subcategory_name') as string;
    const status = formData.get('status') as string;
    const imageMetadataStr = formData.get('imageMetadata') as string;

    // Parse image metadata
    let imageMetadata: any = { existingImageUrls: [], imageMetadata: [] };
    if (imageMetadataStr) {
      try {
        imageMetadata = JSON.parse(imageMetadataStr);
      } catch (e) {
        console.error('Error parsing image metadata:', e);
      }
    }

    // Extract new image files
    const imageFilesWithIndex: Array<{ index: number; file: File }> = [];
    const entries = Array.from(formData.entries()) as Array<[string, FormDataEntryValue]>;

    for (const [key, value] of entries) {
      if (!(key.startsWith('images') && value instanceof File)) continue;

      const match = key.match(/^images\[(\d+)\]$/);
      const index = match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
      imageFilesWithIndex.push({ index, file: value });
    }

    imageFilesWithIndex.sort((a, b) => a.index - b.index);
    
    // Process image changes
    let finalImageUrls: string[] = [];
    const oldImageUrls = currentProduct.image_urls || [];

    // Track which old images are being kept
    const keptImageIndices = new Set<number>();
    
    // Build final image URLs array, handling both new uploads and kept existing images
    for (const meta of imageMetadata.imageMetadata || []) {
      if (meta.isNew) {
        // Find the corresponding file
        const fileEntry = imageFilesWithIndex.find(f => f.index === meta.index);
        if (fileEntry) {
          // This will be uploaded below
          finalImageUrls[meta.index] = 'PENDING_UPLOAD_' + meta.index;
        }
      } else if (meta.originalUrl) {
        // Keep existing image
        finalImageUrls[meta.index] = meta.originalUrl;
        keptImageIndices.add(oldImageUrls.indexOf(meta.originalUrl));
      }
    }

    // Determine which old images to delete from Cloudinary
    const imagesToDelete: string[] = [];
    for (let i = 0; i < oldImageUrls.length; i++) {
      if (!keptImageIndices.has(i)) {
        imagesToDelete.push(oldImageUrls[i]);
      }
    }

    // Delete removed images from Cloudinary
    for (const imageUrl of imagesToDelete) {
      try {
        const publicId = CloudinaryService.extractPublicIdFromUrl(imageUrl);
        if (publicId) {
          await CloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', imageUrl, error);
      }
    }

    // Upload new images to Cloudinary
    const newImageUrls: Map<number, string> = new Map();
    for (const fileEntry of imageFilesWithIndex) {
      const meta = (imageMetadata.imageMetadata || []).find((m: any) => m.index === fileEntry.index && m.isNew);
      if (meta) {
        const arrayBuffer = await fileEntry.file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const cloudinaryUrl = await CloudinaryService.uploadImage(
          buffer,
          productId,
          categoryName,
          subcategoryName,
          fileEntry.index + 1
        );
        newImageUrls.set(fileEntry.index, cloudinaryUrl);
        finalImageUrls[fileEntry.index] = cloudinaryUrl;
      }
    }

    // Clean up pending markers
    finalImageUrls = finalImageUrls.filter(url => !url.startsWith('PENDING_UPLOAD_'));

    // Update product in database
    const updateData: Partial<Product> = {
      product_name: productName || currentProduct.product_name,
      product_title: productTitle || currentProduct.product_title,
      product_description: productDescription || currentProduct.product_description,
      category_id: categoryId || currentProduct.category_id,
      subcategory_id: subcategoryId || currentProduct.subcategory_id,
      image_urls: finalImageUrls,
      image_count: finalImageUrls.length,
      status: (status === 'active' || status === 'inactive' ? status : 'active') as 'active' | 'inactive'
    };

    await ProductService.updateProduct(productId, updateData);

    return NextResponse.json({ 
      success: true, 
      message: 'Product updated successfully' 
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;
    
    // Get product details first to delete images from Cloudinary
    const product = await ProductService.getProductById(productId);
    if (product) {
      // Delete images from Cloudinary
      for (const imageUrl of product.image_urls) {
        const publicId = CloudinaryService.extractPublicIdFromUrl(imageUrl);
        if (publicId) {
          await CloudinaryService.deleteImage(publicId);
        }
      }
    }

    await ProductService.deleteProduct(productId);

    return NextResponse.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

// Move product to another subcategory
export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;
    const body = await request.json();
    const { subcategory_id } = body;

    if (!subcategory_id) {
      return NextResponse.json(
        { success: false, error: 'Subcategory ID is required' },
        { status: 400 }
      );
    }

    // Use direct DB lookups to avoid service mismatches
    const { getDatabase } = await import('@/lib/mongodb');
    const db = await getDatabase();

    // Verify subcategory exists (check both ObjectId _id and string subcategory_id)
    const subOr: any[] = [{ subcategory_id }];
    if (ObjectId.isValid(subcategory_id)) {
      subOr.unshift({ _id: new ObjectId(subcategory_id) });
    }
    const subcatDoc = await db.collection('subcategories').findOne({ $or: subOr });

    if (!subcatDoc) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Update product (match ObjectId _id when valid, or string product_id)
    const prodOr: any[] = [{ product_id: productId }];
    if (ObjectId.isValid(productId)) {
      prodOr.unshift({ _id: new ObjectId(productId) });
    }
    const result = await db.collection('products').updateOne(
      { $or: prodOr },
      {
        $set: {
          subcategory_id,
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product subcategory updated successfully'
    });
  } catch (error) {
    console.error('Error updating product subcategory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product subcategory' },
      { status: 500 }
    );
  }
}
