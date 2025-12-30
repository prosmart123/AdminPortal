import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/product-service';
import { CloudinaryService } from '@/lib/cloudinary';

// Add request timeout wrapper helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if pagination is requested
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const category_id = searchParams.get('category_id') || '';
    const subcategory_id = searchParams.get('subcategory_id') || '';

    // Build filters object
    const filters = {
      search: search || undefined,
      category_id: category_id || undefined,
      subcategory_id: subcategory_id || undefined,
    };
    
    // Wrap in timeout (25 seconds for API calls)
    const fetchPromise = async () => {
      if (page && limit) {
        // Paginated request
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;

        const result = await ProductService.getProductsPaginated(pageNum, limitNum, filters);

        return NextResponse.json({ 
          success: true, 
          data: result.products,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages
          }
        });
      } else {
        // Get all products with filters (for backward compatibility)
        const products = await ProductService.getProductsWithFilters(filters);
        return NextResponse.json({ success: true, data: products });
      }
    };

    return await withTimeout(fetchPromise(), 25000);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    
    // Check if it's a timeout error
    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        { success: false, error: 'Request timeout - server is taking too long to respond. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form fields
    const productName = formData.get('product_name') as string;
    const productTitle = formData.get('product_title') as string;
    const productDescription = formData.get('product_description') as string;
    const categoryId = formData.get('category_id') as string;
    const subcategoryId = formData.get('subcategory_id') as string;
    const categoryName = formData.get('category_name') as string;
    const subcategoryName = formData.get('subcategory_name') as string;

    // Validate required fields
    if (!productName || !productTitle || !productDescription || !categoryId || !subcategoryId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract image files in a stable order: `images[0]`, `images[1]`, ...
    const imageFilesWithIndex: Array<{ index: number; file: File }> = [];
    const entries = Array.from(formData.entries()) as Array<[string, FormDataEntryValue]>;

    for (const [key, value] of entries) {
      if (!(key.startsWith('images') && value instanceof File)) continue;

      const match = key.match(/^images\[(\d+)\]$/);
      const index = match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
      imageFilesWithIndex.push({ index, file: value });
    }

    imageFilesWithIndex.sort((a, b) => a.index - b.index);
    const imageFiles = imageFilesWithIndex.map((x) => x.file);

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one image is required' },
        { status: 400 }
      );
    }

    // Generate product ID
    const productId = await ProductService.getNextProductId(productName);

    // Convert files to buffers
    const imageBuffers: Buffer[] = [];
    for (const file of imageFiles) {
      const arrayBuffer = await file.arrayBuffer();
      imageBuffers.push(Buffer.from(arrayBuffer));
    }

    // Upload images to Cloudinary immediately
    const imageUrls = await CloudinaryService.uploadMultipleImages(
      imageBuffers,
      productId,
      categoryName,
      subcategoryName
    );

    // Create product in database with Cloudinary URLs
    const productData = {
      product_name: productName,
      product_title: productTitle,
      product_description: productDescription,
      category_id: categoryId,
      subcategory_id: subcategoryId,
    };

    const product = await ProductService.createProduct(productData, imageUrls);

    return NextResponse.json({ 
      success: true, 
      data: product,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
