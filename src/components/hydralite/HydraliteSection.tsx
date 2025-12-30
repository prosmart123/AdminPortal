'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Loader2, Grid, List } from 'lucide-react';
import toast from 'react-hot-toast';

interface HydraliteProduct {
  _id: string;
  id: string;
  name: string;
  description?: string;
  category?: string;
  assets?: Array<{
    type: string;
    path: string;
  }>;
}

interface HydraliteSectionProps {
  className?: string;
}

export function HydraliteSection({ className = '' }: HydraliteSectionProps) {
  const router = useRouter();
  const [products, setProducts] = useState<HydraliteProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch products preview
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '6'); // Show only 6 products as preview

      const response = await fetch(`/api/hydralite?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.data || []);
      } else {
        toast.error('Failed to load Hydralite products');
      }
    } catch (error) {
      console.error('Error fetching Hydralite products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const getImageUrl = (product: HydraliteProduct) => {
    const imageAsset = product.assets?.find(asset => 
      asset.type === 'image' || asset.path?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    return imageAsset?.path || '/hydralite_logo.png';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
              <img src="/hydralite_logo.png" alt="Hydralite" className="h-10 object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Hydralite Products</h2>
              <p className="text-slate-600">Manage your Hydralite product catalog</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/hydralite')}
            className="px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-all"
          >
            View All Products
          </button>
        </div>
      </div>

      {/* Products Preview */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 min-h-[400px]">
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              <span className="ml-3 text-slate-600">Loading products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No Hydralite products yet</h3>
              <p className="text-slate-500 mb-6">
                Start building your Hydralite product catalog
              </p>
              <button
                onClick={() => router.push('/hydralite/new')}
                className="px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-all"
              >
                Add First Product
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Recent Products</h3>
                <button
                  onClick={() => router.push('/hydralite')}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  View All ({products.length}+)
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="border-2 border-slate-200 rounded-xl overflow-hidden hover:border-teal-300 transition-all bg-white cursor-pointer"
                    onClick={() => router.push(`/hydralite/${product._id}`)}
                  >
                    <div className="aspect-square bg-slate-100 relative">
                      <img
                        src={getImageUrl(product)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/hydralite_logo.png';
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-800 mb-2 truncate">
                        {product.name}
                      </h3>
                      {product.category && (
                        <p className="text-sm text-teal-600 mb-2">{product.category}</p>
                      )}
                      {product.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}