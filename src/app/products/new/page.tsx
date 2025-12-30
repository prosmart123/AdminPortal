'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageData {
  file?: File;
  url?: string;
  name?: string;
}

interface ImageData {
  file?: File;
  url?: string;
  name?: string;
}

interface Category {
  _id: string;
  category_name: string;
  category_id?: string;
}

interface Subcategory {
  _id: string;
  subcategory_name: string;
  category_id: string;
  subcategory_id?: string;
}

export default function ProductNewPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [formData, setFormData] = useState({
    product_name: '',
    product_title: '',
    product_description: '',
    category_id: '',
    subcategory_id: '',
    images: [] as ImageData[],
  });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!formData.category_id) {
        setSubcategories([]);
        return;
      }

      try {
        const res = await fetch(`/api/subcategories/${formData.category_id}`);
        const data = await res.json();
        if (data.success) {
          setSubcategories(data.data);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      }
    };

    fetchSubcategories();
  }, [formData.category_id]);

  const handleChange = (field: string, value: string | string[] | ImageData[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'category_id') {
      setFormData((prev) => ({ ...prev, subcategory_id: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.product_name || !formData.category_id || !formData.subcategory_id || !formData.product_description) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (formData.images.length < 1) {
      toast.error('Please add at least one image.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get category and subcategory names
      const selectedCategory = categories.find((c) => (c.category_id || c._id) === formData.category_id);
      const selectedSubcategory = subcategories.find((s) => (s.subcategory_id || s._id) === formData.subcategory_id);

      // Build FormData with actual File objects
      const formDataToSend = new FormData();
      formDataToSend.append('product_name', formData.product_name);
      formDataToSend.append('product_title', formData.product_title || formData.product_name);
      formDataToSend.append('product_description', formData.product_description);
      formDataToSend.append('category_id', formData.category_id);
      formDataToSend.append('subcategory_id', formData.subcategory_id);
      formDataToSend.append('category_name', selectedCategory?.category_name || '');
      formDataToSend.append('subcategory_name', selectedSubcategory?.subcategory_name || '');

      // Append only files that exist
      for (let i = 0; i < formData.images.length; i++) {
        const imageData = formData.images[i];
        if (imageData.file) {
          formDataToSend.append(`images[${i}]`, imageData.file, imageData.name || `image_${i}.jpg`);
        }
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${formData.product_name} has been created successfully!`);
        router.push('/products');
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
    router.push('/products');
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.category_id || cat._id,
    label: cat.category_name,
  }));

  const subcategoryOptions = subcategories.map((sub) => ({
    value: sub.subcategory_id || sub._id,
    label: sub.subcategory_name,
  }));

  return (
    <AdminLayout title="Add Product">
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
        {/* Header Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/products')}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h2 className="text-lg font-bold text-slate-800">Add New Product</h2>
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

        {/* Mobile Images First */}
        <div className="lg:hidden bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Product Images</h3>
          <ImageUploader
            images={formData.images}
            onChange={(images) => handleChange('images', images)}
            maxImages={10}
            productName={formData.product_name || 'new_product'}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-5 lg:items-stretch">
          {/* Left Column - Form Fields */}
          <div className="lg:flex-1 lg:w-2/3">
            {/* Product Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm h-full flex flex-col">
              <h3 className="text-base font-bold text-slate-800 mb-5">Product Details</h3>

              <div className="space-y-4 flex-1">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    placeholder="Enter product name"
                    value={formData.product_name}
                    onChange={(e) => handleChange('product_name', e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Product Title (optional)
                  </label>
                  <input
                    placeholder="Enter product title"
                    value={formData.product_title}
                    onChange={(e) => handleChange('product_title', e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(v) => handleChange('category_id', v)}
                      options={categoryOptions}
                      placeholder="Select category"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Subcategory <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={formData.subcategory_id}
                      onValueChange={(v) => handleChange('subcategory_id', v)}
                      options={subcategoryOptions}
                      placeholder="Select subcategory"
                      disabled={!formData.category_id}
                    />
                  </div>
                </div>

                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                  <label className="block text-sm font-semibold text-slate-700">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    placeholder="Enter product description"
                    value={formData.product_description}
                    onChange={(e) => handleChange('product_description', e.target.value)}
                    className="w-full flex-1 min-h-[200px] px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 resize-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Images (Desktop Only) */}
          <div className="hidden lg:block lg:flex-none lg:w-1/3">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
              <h3 className="text-base font-bold text-slate-800 mb-5">Product Images</h3>
              <div className="flex-1">
                <ImageUploader
                  images={formData.images}
                  onChange={(images) => handleChange('images', images)}
                  maxImages={10}
                  productName={formData.product_name || 'new_product'}
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
