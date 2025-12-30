'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag, ChevronDown, ChevronRight, Scissors } from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  category_id?: string;
  category_name: string;
}

interface Subcategory {
  _id: string;
  subcategory_id?: string;
  subcategory_name: string;
  category_id: string;
  description?: string;
  product_count?: number;
  product_ids?: string[];
  created_at?: Date;
  updated_at?: Date;
}

interface SubcategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubcategoryChange?: () => void;
  standalone?: boolean;
  highlightQuery?: string;
}

export function SubcategoryManagementModal({ isOpen, onClose, onSubcategoryChange, standalone = false, highlightQuery = '' }: SubcategoryManagementModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    subcategory_name: '',
    category_id: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [createNewCategory, setCreateNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [useExistingSubcategory, setUseExistingSubcategory] = useState(false);
  const [existingSubcategoryId, setExistingSubcategoryId] = useState('');
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
  const [subcategoryDetails, setSubcategoryDetails] = useState<{[key: string]: any[]}>({});
  const [subcategoryLoading, setSubcategoryLoading] = useState<Record<string, boolean>>({});
  const [subcategoryCounts, setSubcategoryCounts] = useState<Record<string, number>>({});
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [cutProduct, setCutProduct] = useState<{id: string, productId: string, name: string, subcategoryId: string} | null>(null);
  const [pasting, setPasting] = useState(false);

  useEffect(() => {
    if (isOpen || standalone) {
      fetchCategories();
      fetchSubcategories();
      setShowAddForm(false);
      setFormData({ subcategory_name: '', category_id: '', description: '' });
      setUseExistingSubcategory(false);
      setExistingSubcategoryId('');
    }
  }, [isOpen, standalone]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      } else {
        toast.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const getSubKey = (sub: Subcategory) => sub.subcategory_id || sub._id;

  const refreshCountsForSubs = async (subs: Subcategory[]) => {
    const entries = await Promise.all(
      subs.map(async (sub) => {
        const key = getSubKey(sub);
        if (!key) return null;
        try {
          const res = await fetch(`/api/products?subcategory_id=${key}&limit=1&countOnly=true`);
          const data = await res.json();
          const total = typeof data.total === 'number' ? data.total : sub.product_count || 0;
          return [key, total] as const;
        } catch (e) {
          console.error('Count fetch failed for subcategory', key, e);
          return [key, sub.product_count || 0] as const;
        }
      })
    );

    const next: Record<string, number> = {};
    for (const entry of entries) {
      if (!entry) continue;
      const [key, total] = entry;
      next[key] = total;
    }
    setSubcategoryCounts((prev) => ({ ...prev, ...next }));
  };

  const fetchSubcategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subcategories');
      const result = await response.json();
      if (result.success) {
        setSubcategories(result.data);
        refreshCountsForSubs(result.data);
      } else {
        toast.error('Failed to fetch subcategories');
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error('Failed to fetch subcategories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!useExistingSubcategory && !formData.subcategory_name.trim()) {
      toast.error('Subcategory name is required');
      return;
    }

    if (useExistingSubcategory && !existingSubcategoryId) {
      toast.error('Select an existing subcategory');
      return;
    }

    // STRICT: Must have a valid category selected OR creating new with name
    const hasExistingCategory = formData.category_id && formData.category_id.trim() !== '';
    const isCreatingNewCategoryWithName = createNewCategory && newCategoryName.trim();

    if (!hasExistingCategory && !isCreatingNewCategoryWithName) {
      toast.error('Select an existing category OR enter a new category name and enable "Create new category"');
      return;
    }

    setSubmitting(true);
    try {
      let categoryId = '';
      let finalSubcategoryName = formData.subcategory_name;

      if (useExistingSubcategory) {
        const existing = subcategories.find((s) => getSubKey(s) === existingSubcategoryId);
        if (!existing) {
          toast.error('Selected subcategory not found');
          setSubmitting(false);
          return;
        }
        categoryId = existing.category_id;
        finalSubcategoryName = existing.subcategory_name;
      } else {
        // Use the selected category if available, otherwise create new
        if (hasExistingCategory) {
          categoryId = formData.category_id;
        } else if (isCreatingNewCategoryWithName) {
          // Create new category
          const findExistingCategoryId = (name: string) => {
            const target = name.trim().toLowerCase();
            const match = categories.find((c) => c.category_name.trim().toLowerCase() === target);
            return match ? match.category_id || match._id : null;
          };

          const createCategoryIfNeeded = async (name: string) => {
            const existingId = findExistingCategoryId(name);
            if (existingId) return existingId;

            setCreatingCategory(true);
            const catRes = await fetch('/api/categories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ category_name: name }),
            });
            const catResult = await catRes.json();
            setCreatingCategory(false);

            if (catResult.success) {
              await fetchCategories();
              return catResult.data.category_id || catResult.data._id;
            }

            const msg = (catResult.error || '').toLowerCase();
            if (catRes.status === 400 && msg.includes('exists')) {
              await fetchCategories();
              const refreshedId = findExistingCategoryId(name);
              if (refreshedId) return refreshedId;
            }

            throw new Error(catResult.error || 'Failed to create category');
          };

          categoryId = await createCategoryIfNeeded(newCategoryName.trim());
        }
      }

      // Final safety check - categoryId must be set
      if (!categoryId || categoryId.trim() === '') {
        toast.error('No category available');
        setSubmitting(false);
        return;
      }

      // Refresh categories to ensure we have latest data
      const freshCategoriesRes = await fetch('/api/categories');
      const freshCategoriesData = await freshCategoriesRes.json();
      const freshCategories = freshCategoriesData.success ? freshCategoriesData.data : categories;

      // Verify the category actually exists using fresh categories
      const categoryExists = freshCategories.some((cat: any) => cat._id === categoryId || cat.category_id === categoryId);
      if (!categoryExists) {
        toast.error('Selected category does not exist. Please refresh and reselect.');
        setSubmitting(false);
        return;
      }

      const submitSubcategory = async () => {
        const payload = {
          subcategory_name: finalSubcategoryName,
          category_id: categoryId,
        };
        console.log('📤 Sending payload:', payload);
        const res = await fetch('/api/subcategories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        return res.json();
      };

      let result = await submitSubcategory();
      
      if (result.success) {
        toast.success('Subcategory created successfully!');
        setFormData({ subcategory_name: '', category_id: '', description: '' });
        setNewCategoryName('');
        setCreateNewCategory(false);
        setUseExistingSubcategory(false);
        setExistingSubcategoryId('');
        setShowAddForm(false);
        fetchSubcategories();
        onSubcategoryChange?.();
      } else {
        console.error('Subcategory creation failed:', result.error);
        toast.error(result.error || 'Failed to create subcategory');
      }
    } catch (error) {
      console.error('Error creating subcategory:', error);
      toast.error('Failed to create subcategory');
    } finally {
      setSubmitting(false);
      setCreatingCategory(false);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string, subcategoryName: string) => {
    try {
      // Check products before delete
      const checkRes = await fetch(`/api/products?subcategory_id=${subcategoryId}&limit=1`);
      const checkData = await checkRes.json();
      const hasProducts = checkData?.success && ((checkData.total ?? 0) > 0 || (checkData.data?.length ?? 0) > 0 || (checkData.products?.length ?? 0) > 0);

      if (hasProducts) {
        toast.error('This subcategory has products. Remove or move them first before deleting.');
        return;
      }

      if (!confirm(`Are you sure you want to delete "${subcategoryName}"?`)) {
        return;
      }

      const response = await fetch(`/api/subcategories?id=${subcategoryId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Subcategory deleted successfully!');
        fetchSubcategories();
        onSubcategoryChange?.();
      } else {
        toast.error(result.error || 'Failed to delete subcategory');
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error('Failed to delete subcategory');
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    try {
      console.log('🗑️ Deleting category:', { categoryId, categoryName });
      
      // Get all subcategories for this category
      const subcatsRes = await fetch(`/api/subcategories/${categoryId}`);
      const subcatsData = await subcatsRes.json();
      const categorySubcategories = subcatsData?.success ? (subcatsData.data || []) : [];
      
      console.log('📊 Found subcategories:', categorySubcategories.length);
      
      // Check products in category itself
      const categoryProductsRes = await fetch(`/api/products?category_id=${categoryId}&limit=1`);
      const categoryProductsData = await categoryProductsRes.json();
      const hasCategoryProducts = categoryProductsData?.success && ((categoryProductsData.total ?? 0) > 0 || (categoryProductsData.data?.length ?? 0) > 0 || (categoryProductsData.products?.length ?? 0) > 0);

      if (hasCategoryProducts) {
        toast.error('This category has products. Remove or move them first before deleting.');
        return;
      }

      // Check products in all subcategories
      const subcategoryProductChecks = await Promise.all(
        categorySubcategories.map(async (sub: any) => {
          const subId = sub._id || sub.subcategory_id;
          const res = await fetch(`/api/products?subcategory_id=${subId}&limit=1`);
          const data = await res.json();
          const hasProducts = data?.success && ((data.total ?? 0) > 0 || (data.data?.length ?? 0) > 0 || (data.products?.length ?? 0) > 0);
          return { subcategoryName: sub.subcategory_name, hasProducts };
        })
      );

      const subcategoriesWithProducts = subcategoryProductChecks.filter(check => check.hasProducts);
      
      console.log('📦 Subcategories with products:', subcategoriesWithProducts);

      if (subcategoriesWithProducts.length > 0) {
        const names = subcategoriesWithProducts.map(s => s.subcategoryName).join(', ');
        toast.error(`Cannot delete: Subcategories have products (${names}). Remove products first.`);
        return;
      }

      // All clear - no products anywhere
      const message = categorySubcategories.length > 0 
        ? `Delete "${categoryName}" and its ${categorySubcategories.length} empty subcategories?`
        : `Delete "${categoryName}"?`;
      
      if (!confirm(message)) {
        console.log('❌ User cancelled deletion');
        return;
      }

      console.log('🔥 Calling DELETE API with ID:', categoryId);
      const response = await fetch(`/api/categories?id=${categoryId}&cascade=true`, {
        method: 'DELETE',
      });

      const result = await response.json();
      console.log('📥 DELETE response:', result);
      
      if (result.success) {
        toast.success(`Category and ${result.deletedSubcategories || 0} subcategories deleted!`);
        fetchCategories();
        fetchSubcategories();
        onSubcategoryChange?.();
      } else {
        console.error('❌ Delete failed:', result.error);
        toast.error(result.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('💥 Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const fetchSubcategoryDetails = async (subcategoryId: string) => {
    if (subcategoryDetails[subcategoryId]) return; // Already fetched
    
    try {
      const response = await fetch(`/api/products?subcategory_id=${subcategoryId}&limit=200`);
      const productsData = await response.json();
      const list = productsData.success ? productsData.products || productsData.data || [] : [];
      const total = typeof productsData.total === 'number' ? productsData.total : list.length;

      setSubcategoryDetails((prev) => ({
        ...prev,
        [subcategoryId]: list,
      }));
      setSubcategoryCounts((prev) => ({
        ...prev,
        [subcategoryId]: total,
      }));

      // Also store under alternate key to avoid _id/subcategory_id mismatches
      const sub = subcategories.find((s) => getSubKey(s) === subcategoryId);
      if (sub) {
        const altKey = sub._id && sub._id !== subcategoryId ? sub._id : sub.subcategory_id;
        if (altKey && altKey !== subcategoryId) {
          setSubcategoryDetails((prev) => ({
            ...prev,
            [altKey]: list,
          }));
          setSubcategoryCounts((prev) => ({
            ...prev,
            [altKey]: total,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching subcategory details:', error);
    }
  };

  const toggleSubcategoryExpansion = (subcategoryId: string) => {
    if (expandedSubcategory === subcategoryId) {
      setExpandedSubcategory(null);
    } else {
      setExpandedSubcategory(subcategoryId);
      setSubcategoryLoading((prev) => ({ ...prev, [subcategoryId]: true }));
      fetchSubcategoryDetails(subcategoryId).finally(() => {
        setSubcategoryLoading((prev) => ({ ...prev, [subcategoryId]: false }));
      });
    }
  };

  const copyProductId = async (product: any, subcategoryId: string) => {
    try {
      setCutProduct({
        id: product._id,
        productId: product.product_id,
        name: product.product_name,
        subcategoryId: subcategoryId
      });
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(product.product_id);
      } else {
        const ta = document.createElement('textarea');
        ta.value = product.product_id;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.success('Product cut! Click paste button on target subcategory.');
    } catch (error) {
      console.error('Copy failed', error);
      toast.error('Failed to cut product');
      setCutProduct(null);
    }
  };

  const handlePaste = async (targetSubcategoryId: string, targetSubcategoryName: string) => {
    if (!cutProduct) return;

    // Prevent pasting into same subcategory
    if (cutProduct.subcategoryId === targetSubcategoryId) {
      toast.error('Product is already in this subcategory');
      return;
    }

    setPasting(true);
    try {
      const response = await fetch(`/api/products/${cutProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subcategory_id: targetSubcategoryId })
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch (err) {
        console.error('Non-JSON response from paste:', err);
      }

      if (response.ok && result?.success) {
        toast.success(`Product moved to "${targetSubcategoryName}"`);
        // Optimistically move in local state for instant UI update
        setSubcategoryDetails((prev) => {
          const next = { ...prev };
          const sourceKey = cutProduct.subcategoryId;
          const targetKey = targetSubcategoryId;

          const sourceList = [...(next[sourceKey] || [])];
          const targetList = [...(next[targetKey] || [])];

          const idx = sourceList.findIndex((p) => p._id === cutProduct.id || p.product_id === cutProduct.productId);
          if (idx >= 0) {
            const [moved] = sourceList.splice(idx, 1);
            // Update the subcategory_id locally
            const updated = { ...moved, subcategory_id: targetSubcategoryId };
            targetList.unshift(updated);
            next[sourceKey] = sourceList;
            next[targetKey] = targetList;
          }
          return next;
        });

        // Update cached counts immediately
        setSubcategoryCounts((prev) => {
          const next = { ...prev };
          if (cutProduct.subcategoryId) {
            next[cutProduct.subcategoryId] = Math.max(0, (next[cutProduct.subcategoryId] || 1) - 1);
          }
          next[targetSubcategoryId] = (next[targetSubcategoryId] || 0) + 1;
          return next;
        });

        // Update selected to the target
        setSelectedSubcategory(targetSubcategoryId);
        setSelectedProduct(cutProduct.id);
        setCutProduct(null);

        // Refresh from server to stay consistent
        fetchSubcategories();
        fetchSubcategoryDetails(cutProduct.subcategoryId);
        fetchSubcategoryDetails(targetSubcategoryId);
        onSubcategoryChange?.();
      } else {
        const msg = result?.error || result?.message || `Failed to move product (status ${response.status})`;
        toast.error(msg);
      }
    } catch (error) {
      console.error('Paste failed:', error);
      toast.error('Failed to move product');
    } finally {
      setPasting(false);
    }
  };

  const getProductCount = (sub: Subcategory) => {
    const key = getSubKey(sub);
    if (subcategoryCounts[key] !== undefined) return subcategoryCounts[key];
    if (subcategoryDetails[key]) return subcategoryDetails[key].length;
    return sub.product_count || 0;
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat._id === categoryId || cat.category_id === categoryId);
    return category?.category_name || 'Unknown Category';
  };

  // Group subcategories by category
  const groupedSubcategories = subcategories.reduce((acc, sub) => {
    const categoryName = getCategoryName(sub.category_id);
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(sub);
    return acc;
  }, {} as Record<string, Subcategory[]>);

  if (!isOpen && !standalone) return null;

  const contentHeader = (
    <div className="flex items-center justify-between p-6 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <Tag className="w-6 h-6 text-teal-600" />
        <h2 className="text-xl font-bold text-slate-800">Manage</h2>
      </div>
      {!standalone && (
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
      )}
    </div>
  );

  const contentBody = (
    <div className={standalone ? "p-3 md:p-4" : "p-3 md:p-6 overflow-y-auto max-h-[calc(90vh-120px)]"}>
          {/* Add Subcategory Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-4 border-2 border-dashed border-teal-300 text-teal-600 rounded-xl hover:bg-teal-50 hover:border-teal-400 transition-all flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>
          )}

          {/* Add Subcategory Form */}
          {showAddForm && (
            <form onSubmit={handleAddSubcategory} className="bg-slate-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-slate-800 mb-4">Add Subcategory</h3>
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        checked={!createNewCategory}
                        onChange={() => setCreateNewCategory(false)}
                        className="accent-teal-600"
                        disabled={submitting || creatingCategory}
                      />
                      <span>Select existing category</span>
                    </label>
                    {!createNewCategory && (
                      <select
                        value={formData.category_id}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, category_id: e.target.value }));
                          setCreateNewCategory(false);
                        }}
                        className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none transition-colors"
                        disabled={submitting || creatingCategory}
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category._id} value={category.category_id || category._id}>
                            {category.category_name}
                          </option>
                        ))}
                      </select>
                    )}

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        checked={createNewCategory}
                        onChange={() => setCreateNewCategory(true)}
                        className="accent-teal-600"
                        disabled={submitting || creatingCategory}
                      />
                      <span>Create new category</span>
                    </label>
                    {createNewCategory && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter new category name"
                          className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none transition-colors"
                          disabled={submitting || creatingCategory}
                        />
                        <p className="text-xs text-slate-500">A new category will be created, then this subcategory will be placed under it.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Subcategory <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        checked={useExistingSubcategory}
                        onChange={() => {
                          setUseExistingSubcategory(true);
                          setFormData(prev => ({ ...prev, subcategory_name: '' }));
                        }}
                        className="accent-teal-600"
                        disabled={submitting}
                      />
                      <span>Select existing subcategory</span>
                    </label>
                    {useExistingSubcategory && (
                      <select
                        value={existingSubcategoryId}
                        onChange={(e) => setExistingSubcategoryId(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none transition-colors"
                        disabled={submitting}
                      >
                        <option value="">Select a subcategory</option>
                        {subcategories.map((sub) => (
                          <option key={getSubKey(sub)} value={getSubKey(sub)}>
                            {sub.subcategory_name}
                          </option>
                        ))}
                      </select>
                    )}

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        checked={!useExistingSubcategory}
                        onChange={() => {
                          setUseExistingSubcategory(false);
                          setExistingSubcategoryId('');
                        }}
                        className="accent-teal-600"
                        disabled={submitting}
                      />
                      <span>Create new subcategory</span>
                    </label>
                    {!useExistingSubcategory && (
                      <input
                        type="text"
                        value={formData.subcategory_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, subcategory_name: e.target.value }))}
                        placeholder="Enter subcategory name"
                        className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none transition-colors"
                        disabled={submitting}
                      />
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({ subcategory_name: '', category_id: '', description: '' });
                      setNewCategoryName('');
                      setCreateNewCategory(false);
                      setUseExistingSubcategory(false);
                      setExistingSubcategoryId('');
                    }}
                    className="flex-1 h-11 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                    disabled={submitting || creatingCategory}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                    disabled={submitting || creatingCategory}
                  >
                    {submitting ? 'Creating...' : 'Create Subcategory'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Subcategories List */}
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading subcategories...</div>
          ) : subcategories.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No subcategories found</div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              <h3 className="font-semibold text-slate-800 text-sm md:text-base">Existing Subcategories ({subcategories.length})</h3>
              {Object.entries(groupedSubcategories).map(([categoryName, categorySubcategories]) => {
                // Find the actual category object by matching the name
                const category = categories.find(cat => cat.category_name === categoryName);
                const categoryId = category?._id || category?.category_id || categorySubcategories[0]?.category_id;
                return (
                <div key={categoryName} className="bg-slate-50 rounded-xl p-3 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-700 text-sm md:text-base">{categoryName} ({categorySubcategories.length})</h4>
                    {categoryId && (
                      <button
                        onClick={() => handleDeleteCategory(categoryId, categoryName)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {categorySubcategories.map((subcategory) => (
                      <div
                        key={getSubKey(subcategory)}
                        onClick={() => {
                          setSelectedSubcategory(getSubKey(subcategory));
                          toggleSubcategoryExpansion(getSubKey(subcategory));
                        }}
                        className={`bg-white rounded-lg overflow-hidden hover:shadow-sm transition-all cursor-pointer ${
                          selectedSubcategory === getSubKey(subcategory)
                            ? 'border-2 border-dashed border-green-500'
                            : 'border border-slate-200'
                        }`}
                      >
                        {/* Subcategory Header */}
                        <div className="flex items-center justify-between p-2 md:p-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {expandedSubcategory === getSubKey(subcategory) ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                              <div>
                                <h5 className="font-medium text-slate-800 text-sm md:text-base">{subcategory.subcategory_name}</h5>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {cutProduct && cutProduct.subcategoryId !== getSubKey(subcategory) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePaste(getSubKey(subcategory), subcategory.subcategory_name);
                                }}
                                className="px-2 py-1 text-xs md:text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                                title="Paste product here"
                                disabled={pasting}
                              >
                                {pasting ? 'Pasting...' : 'Paste'}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubcategory(subcategory._id, subcategory.subcategory_name);
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete subcategory"
                            >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        </div>

                        {/* Expanded Products */}
                        {expandedSubcategory === getSubKey(subcategory) && subcategoryDetails[getSubKey(subcategory)] && (
                          <div className="border-t border-slate-200 bg-slate-50 p-2">
                            {subcategoryLoading[getSubKey(subcategory)] ? (
                              <div className="text-xs text-slate-500">Loading products...</div>
                            ) : subcategoryDetails[getSubKey(subcategory)].length > 0 ? (
                              <div>
                                <h6 className="font-medium text-slate-700 mb-1 text-sm">
                                  Products ({subcategoryDetails[getSubKey(subcategory)].length})
                                </h6>
                                <div className="space-y-1">
                                  {subcategoryDetails[getSubKey(subcategory)].map((product: any) => (
                                    <div 
                                      key={product._id} 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProduct(product._id);
                                      }}
                                      className={`bg-white p-1.5 rounded text-xs md:text-sm flex justify-between items-center gap-2 cursor-pointer transition-all ${
                                        cutProduct?.id === product._id
                                          ? 'animate-marching-ants border-0'
                                          : (selectedProduct === product._id || (highlightQuery && (
                                              product.product_name?.toLowerCase().includes(highlightQuery.toLowerCase()) ||
                                              product.product_id?.toLowerCase().includes(highlightQuery.toLowerCase()) ||
                                              product.product_title?.toLowerCase().includes(highlightQuery.toLowerCase())
                                            )))
                                            ? 'border-2 border-dashed border-red-500'
                                            : 'border border-slate-200'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <span className="font-medium truncate text-xs block overflow-hidden text-ellipsis" title={product.product_name}>{product.product_name}</span>
                                        {product.product_title && (
                                          <p className="text-slate-500 text-[10px] md:text-xs mt-0.5 truncate block overflow-hidden text-ellipsis" title={product.product_title}>{product.product_title}</p>
                                        )}
                                        <p className="text-[9px] md:text-[11px] text-slate-400 mt-0.5 truncate block overflow-hidden text-ellipsis">ID: {product.product_id}</p>
                                      </div>
                                      <button
                                        onClick={() => copyProductId(product, getSubKey(subcategory))}
                                        className="p-1 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex-shrink-0"
                                        title="Cut product"
                                      >
                                        <Scissors className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-slate-500 text-xs py-1">
                                This subcategory has no products yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
              })}
            </div>
          )}
    </div>
  );

  if (standalone) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {contentHeader}
        {contentBody}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {contentHeader}
        {contentBody}
      </div>
    </div>
  );
}
