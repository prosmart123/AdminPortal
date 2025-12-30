'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AssetUploader } from '@/components/admin/AssetUploader';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, Save, X, Package, Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AssetData {
  file?: File;
  url?: string;
  name?: string;
  type?: 'image' | 'video';
}

interface KeyFeature {
  title: string;
  description: string;
}

interface HydraliteProduct {
  _id: string;
  id: string;
  name: string;
  description: string;
  category?: string;
  subcategory?: string;
  key_features?: KeyFeature[];
  assets?: Array<{ type: string; path: string }>;
  created_at?: string;
  updated_at?: string;
}

interface HydraliteCategory {
  _id: string;
  id: string;
  name: string;
}

export default function HydraliteProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [categories, setCategories] = useState<HydraliteCategory[]>([]);
  const [product, setProduct] = useState<HydraliteProduct | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: '',
    key_features: [] as KeyFeature[],
    assets: [] as AssetData[],
  });

  const [originalFormData, setOriginalFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: '',
    key_features: [] as KeyFeature[],
    assets: [] as AssetData[],
  });

  // Fetch product and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, categoriesRes] = await Promise.all([
          fetch(`/api/hydralite/${productId}`),
          fetch('/api/hydralite/categories'),
        ]);

        const productData = await productRes.json();
        const categoriesData = await categoriesRes.json();

        if (productData.success && productData.data) {
          const p = productData.data;
          setProduct(p);
          
          // Convert assets to AssetData format
          const assetDataArray: AssetData[] = (Array.isArray(p.assets) ? p.assets : []).map((asset: { type: string; path: string }) => ({
            url: asset.path,
            name: asset.path.split('/').pop() || 'asset',
            type: asset.type as 'image' | 'video',
          }));

          const initialData = {
            id: p.id || '',
            name: p.name || '',
            description: p.description || '',
            category: p.category || '',
            key_features: p.key_features || [],
            assets: assetDataArray,
          };
          setFormData(initialData);
          setOriginalFormData(JSON.parse(JSON.stringify(initialData)));
        } else {
          toast.error('Product not found');
          router.push('/products?tab=hydralite');
        }

        if (categoriesData.success) {
          setCategories(categoriesData.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [productId, router]);

  const hasFormChanged = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleKeyFeatureChange = (index: number, field: 'title' | 'description', value: string) => {
    const newFeatures = [...formData.key_features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    handleChange('key_features', newFeatures);
  };

  const addKeyFeature = () => {
    handleChange('key_features', [...formData.key_features, { title: '', description: '' }]);
  };

  const removeKeyFeature = (index: number) => {
    handleChange('key_features', formData.key_features.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.description) {
      toast.error('Please fill in name and description.');
      return;
    }

    if (formData.assets.length < 1) {
      toast.error('Please add at least one image or video.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      if (formData.category) {
        formDataToSend.append('category', formData.category);
      }
      if (formData.key_features.length > 0) {
        formDataToSend.append('key_features', JSON.stringify(formData.key_features));
      }

      // Track which assets are new (with files) and which are existing (URLs only)
      const existingAssetUrls: string[] = [];
      const assetMetadata: Array<{ index: number; originalUrl?: string; isNew: boolean }> = [];

      for (let i = 0; i < formData.assets.length; i++) {
        const assetData = formData.assets[i];
        if (assetData.file) {
          // New asset - append file
          formDataToSend.append(`assets[${i}]`, assetData.file, assetData.name || `asset_${i}`);
          assetMetadata.push({ index: i, isNew: true });
        } else if (assetData.url) {
          // Existing asset - keep URL
          existingAssetUrls.push(assetData.url);
          assetMetadata.push({ index: i, originalUrl: assetData.url, isNew: false });
        }
      }

      // Add metadata about which assets are new/existing
      formDataToSend.append('assetMetadata', JSON.stringify({
        existingAssetUrls,
        assetMetadata
      }));

      const response = await fetch(`/api/hydralite/${productId}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${formData.name} has been updated successfully!`);
        router.push('/products?tab=hydralite');
      } else {
        toast.error(result.error || 'Failed to update product');
      }
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong while saving the product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    if (hasFormChanged()) {
      setShowConfirmDialog(true);
    } else {
      router.push('/products?tab=hydralite');
    }
  };

  const handleBack = () => {
    if (hasFormChanged()) {
      setShowConfirmDialog(true);
    } else {
      router.push('/products?tab=hydralite');
    }
  };

  const confirmDiscard = () => {
    setShowConfirmDialog(false);
    router.push('/products?tab=hydralite');
  };

  const cancelDiscard = () => {
    setShowConfirmDialog(false);
  };

  const categoryOptions = [
    { value: '', label: 'Select category' },
    ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
  ];

  if (isLoading) {
    return (
      <AdminLayout title="Edit Hydralite Product">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
          <p className="text-slate-500">Loading product...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout title="Product Not Found">
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-6">Product not found</p>
          <button
            onClick={() => router.push('/products?tab=hydralite')}
            className="h-11 px-6 bg-white border-2 border-teal-500 text-teal-600 rounded-xl font-semibold hover:bg-teal-50 hover:border-teal-600 transition-all"
          >
            Back to Products
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Hydralite Product">
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
        {/* Header Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-800 truncate">{product.name}</h2>
              </div>
            </div>
            
            {/* Desktop Buttons */}
            <div className="hidden sm:flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleDiscard}
                className="h-10 px-4 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Discard
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-4 bg-white border-2 border-teal-500 text-teal-600 rounded-xl font-semibold hover:bg-teal-50 hover:border-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Assets First */}
        <div className="lg:hidden bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Product Assets (Images/Videos)</h3>
          <AssetUploader
            assets={formData.assets}
            onChange={(assets) => handleChange('assets', assets)}
            maxAssets={20}
            productName={formData.name || 'product'}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-5 lg:items-stretch">
          {/* Left Column - Form Fields */}
          <div className="lg:flex-1 lg:w-2/3 space-y-4 md:space-y-5">
            {/* Product Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-5">Product Details</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Product ID
                  </label>
                  <input
                    value={formData.id}
                    disabled
                    className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Category
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => handleChange('category', v)}
                    options={categoryOptions}
                    placeholder="Select category"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    placeholder="Enter product description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full min-h-[200px] px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 resize-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-800">Key Features</h3>
                <button
                  type="button"
                  onClick={addKeyFeature}
                  className="h-9 px-3 bg-teal-50 border-2 border-teal-500 text-teal-600 rounded-lg font-medium hover:bg-teal-100 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Feature
                </button>
              </div>

              <div className="space-y-4">
                {formData.key_features.map((feature, index) => (
                  <div key={index} className="p-4 border-2 border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Feature {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeKeyFeature(index)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      placeholder="Feature title"
                      value={feature.title}
                      onChange={(e) => handleKeyFeatureChange(index, 'title', e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-all"
                    />
                    <textarea
                      placeholder="Feature description"
                      value={feature.description}
                      onChange={(e) => handleKeyFeatureChange(index, 'description', e.target.value)}
                      className="w-full min-h-[80px] px-3 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 resize-none transition-all"
                    />
                  </div>
                ))}
                {formData.key_features.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No features added yet. Click "Add Feature" to add one.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Assets (Desktop Only) */}
          <div className="hidden lg:block lg:flex-none lg:w-1/3">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
              <h3 className="text-base font-bold text-slate-800 mb-5">Product Assets</h3>
              <div className="flex-1">
                <AssetUploader
                  assets={formData.assets}
                  onChange={(assets) => handleChange('assets', assets)}
                  maxAssets={20}
                  productName={formData.name || 'product'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Buttons */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex gap-3 z-40">
          <button
            type="button"
            onClick={handleDiscard}
            className="flex-1 h-11 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-11 bg-white border-2 border-teal-500 text-teal-600 rounded-xl font-semibold hover:bg-teal-50 hover:border-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Spacer for mobile bottom buttons */}
        <div className="sm:hidden h-20"></div>
      </form>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Are you sure?</h3>
            <p className="text-slate-600 mb-6">
              You are about to leave this page. Any unsaved changes will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDiscard}
                className="flex-1 h-11 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDiscard}
                className="flex-1 h-11 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-colors"
              >
                Leave Page
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

