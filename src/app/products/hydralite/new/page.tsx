'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AssetUploader } from '@/components/admin/AssetUploader';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, Save, X, Plus, Trash2 } from 'lucide-react';
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

interface HydraliteCategory {
  _id: string;
  id: string;
  name: string;
}

export default function HydraliteProductNewPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<HydraliteCategory[]>([]);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: '',
    subcategory: '',
    key_features: [] as KeyFeature[],
    assets: [] as AssetData[],
  });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/hydralite/categories');
        const data = await res.json();
        if (data.success) {
          setCategories(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-generate ID from name
  useEffect(() => {
    if (formData.name && !formData.id) {
      const generatedId = formData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      handleChange('id', generatedId);
    }
  }, [formData.name]);

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
      formDataToSend.append('id', formData.id || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      if (formData.category) {
        formDataToSend.append('category', formData.category);
      }
      if (formData.subcategory) {
        formDataToSend.append('subcategory', formData.subcategory);
      }
      if (formData.key_features.length > 0) {
        formDataToSend.append('key_features', JSON.stringify(formData.key_features));
      }

      // Append asset files
      for (let i = 0; i < formData.assets.length; i++) {
        const assetData = formData.assets[i];
        if (assetData.file) {
          formDataToSend.append(`assets[${i}]`, assetData.file, assetData.name || `asset_${i}`);
        }
      }

      const response = await fetch('/api/hydralite', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${formData.name} has been created successfully!`);
        router.push('/products?tab=hydralite');
      } else {
        toast.error(result.error || 'Failed to create product');
      }
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong while saving the product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    router.push('/products?tab=hydralite');
  };

  const categoryOptions = [
    { value: '', label: 'Select category' },
    ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
  ];

  return (
    <AdminLayout title="Add Hydralite Product">
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
        {/* Header Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/products?tab=hydralite')}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h2 className="text-lg font-bold text-slate-800">Add New Hydralite Product</h2>
            </div>
            
            {/* Desktop Buttons */}
            <div className="hidden sm:flex gap-3">
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
                {isSubmitting ? 'Creating...' : 'Add Product'}
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
            productName={formData.name || 'new_product'}
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
                    Product ID (auto-generated from name)
                  </label>
                  <input
                    placeholder="Will be auto-generated"
                    value={formData.id}
                    onChange={(e) => handleChange('id', e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-all"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      Subcategory
                    </label>
                    <input
                      placeholder="Enter subcategory"
                      value={formData.subcategory}
                      onChange={(e) => handleChange('subcategory', e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-all"
                    />
                  </div>
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
                  productName={formData.name || 'new_product'}
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
            {isSubmitting ? 'Creating...' : 'Add Product'}
          </button>
        </div>

        {/* Spacer for mobile bottom buttons */}
        <div className="sm:hidden h-20"></div>
      </form>
    </AdminLayout>
  );
}

