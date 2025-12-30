import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/product-service';
import { withTimeout, formatErrorResponse } from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { categoryId } = params;
    
    const fetchSubcategories = async () => {
      return await ProductService.getSubcategoriesByCategory(categoryId);
    };

    // Apply 15 second timeout
    const subcategories = await withTimeout(
      fetchSubcategories(), 
      15000, 
      'Subcategories request timeout'
    );

    return NextResponse.json({ success: true, data: subcategories });
  } catch (error: any) {
    console.error('Error fetching subcategories:', error);
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}
