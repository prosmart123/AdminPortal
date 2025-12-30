'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Folder, ChevronDown, ChevronRight, Scissors } from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  category_id?: string;
  category_name: string;
  description?: string;
  product_count?: number;
  subcategory_count?: number;
  product_ids?: string[];
  subcategory_ids?: string[];
  created_at?: Date;
  updated_at?: Date;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChange?: () => void;
}

export function CategoryManagementModal({ isOpen, onClose, onCategoryChange }: CategoryManagementModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    category_name: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryDetails, setCategoryDetails] = useState<{[key: string]: {subcategories: any[], products: any[]}}>({})
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [subcategoryProducts, setSubcategoryProducts] = useState<Record<string, any[]>>({});
  const [subcategoryLoading, setSubcategoryLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setShowAddForm(false);
      setFormData({ category_name: '', description: '' });
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category_name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Category created successfully!');
        setFormData({ category_name: '', description: '' });
        setShowAddForm(false);
        fetchCategories();
        onCategoryChange?.();
      } else {
        toast.error(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    try {
      // Check if category has subcategories or products
      const [subcatsRes, productsRes] = await Promise.all([
        fetch(`/api/subcategories/${categoryId}`),
        fetch(`/api/products?category_id=${categoryId}&limit=1`)
      ]);
      
      const subcatsData = await subcatsRes.json();
      const productsData = await productsRes.json();
      
      const hasSubcategories = subcatsData?.success && (subcatsData.data?.length ?? 0) > 0;
      const hasProducts = productsData?.success && ((productsData.total ?? 0) > 0 || (productsData.data?.length ?? 0) > 0 || (productsData.products?.length ?? 0) > 0);

      if (hasSubcategories) {
        toast.error('This category has subcategories. Remove or delete them first before deleting the category.');
        return;
      }

      if (hasProducts) {
        toast.error('This category has products. Remove or move them first before deleting the category.');
        return;
      }

      if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) {
        return;
      }

      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Category deleted successfully!');
        fetchCategories();
        onCategoryChange?.();
      } else {
        toast.error(result.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const fetchCategoryDetails = async (categoryId: string) => {
    if (categoryDetails[categoryId]) return; // Already fetched
    
    try {
      const [subcatsRes, productsRes] = await Promise.all([
        fetch(`/api/subcategories/${categoryId}`),
        fetch(`/api/products?category_id=${categoryId}&limit=100`)
      ]);

      const subcatsData = await subcatsRes.json();
      const productsData = await productsRes.json();

      setCategoryDetails(prev => ({
        ...prev,
        [categoryId]: {
          subcategories: subcatsData.success ? subcatsData.data : [],
          products: productsData.success ? productsData.products || productsData.data || [] : []
        }
      }));
    } catch (error) {
      console.error('Error fetching category details:', error);
    }
  };

  const fetchSubcategoryProducts = async (subcategoryId: string) => {
    if (subcategoryProducts[subcategoryId]) return;
    setSubcategoryLoading((prev) => ({ ...prev, [subcategoryId]: true }));
    try {
      const response = await fetch(`/api/products?subcategory_id=${subcategoryId}&limit=200`);
      const productsData = await response.json();
      setSubcategoryProducts((prev) => ({
        ...prev,
        [subcategoryId]: productsData.success ? productsData.products || productsData.data || [] : [],
      }));
    } catch (error) {
      console.error('Error fetching subcategory products:', error);
      toast.error('Failed to load products for subcategory');
    } finally {
      setSubcategoryLoading((prev) => ({ ...prev, [subcategoryId]: false }));
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
      fetchCategoryDetails(categoryId);
    }
  };

  const toggleSubcategoryExpansion = (subcategoryId: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(subcategoryId)) {
        next.delete(subcategoryId);
      } else {
        next.add(subcategoryId);
        fetchSubcategoryProducts(subcategoryId);
      }
      return next;
    });
  };

  const copyProductId = async (productId: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(productId);
      } else {
        const ta = document.createElement('textarea');
        ta.value = productId;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.success('Product ID copied. Go to a category/subcategory and press Ctrl+V to assign.');
    } catch (error) {
      console.error('Copy failed', error);
      toast.error('Failed to copy product ID');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Folder className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-bold text-slate-800">Manage Categories</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add New Category Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-4 border-2 border-dashed border-teal-300 text-teal-600 rounded-xl hover:bg-teal-50 hover:border-teal-400 transition-all flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-5 h-5" />
              Add New Category
            </button>
          )}

          {/* Add Category Form */}
          {showAddForm && (
            <form onSubmit={handleAddCategory} className="bg-slate-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-slate-800 mb-4">Add New Category</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.category_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
                    placeholder="Enter category name"
                    className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none transition-colors"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter category description"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none resize-none transition-colors"
                    disabled={submitting}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({ category_name: '', description: '' });
                    }}
                    className="flex-1 h-11 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Category'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Categories List */}
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No categories found</div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800 mb-4">Existing Categories ({categories.length})</h3>
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between p-4">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleCategoryExpansion(category._id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedCategory === category._id ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <div>
                          <h4 className="font-medium text-slate-800">{category.category_name}</h4>
                          {category.description && (
                            <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-slate-400">
                            <span>{category.subcategory_count || 0} subcategories</span>
                            <span>{category.product_count || 0} products</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category._id, category.category_name);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {expandedCategory === category._id && categoryDetails[category._id] && (
                    <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
                      {/* Subcategories */}
                      {categoryDetails[category._id].subcategories.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-medium text-slate-700 mb-2">
                            Subcategories ({categoryDetails[category._id].subcategories.length})
                          </h5>
                          <div className="space-y-2">
                            {categoryDetails[category._id].subcategories.map((sub: any) => (
                              <div key={sub._id} className="bg-white rounded border text-sm">
                                <button
                                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                                  onClick={() => toggleSubcategoryExpansion(sub._id)}
                                >
                                  <div className="flex items-center gap-2">
                                    {expandedSubcategories.has(sub._id) ? (
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400" />
                                    )}
                                    <span className="font-medium text-slate-800">{sub.subcategory_name}</span>
                                  </div>
                                  <span className="text-xs text-slate-500">{sub.product_count || 0} products</span>
                                </button>

                                {expandedSubcategories.has(sub._id) && (
                                  <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-2">
                                    {subcategoryLoading[sub._id] ? (
                                      <div className="text-xs text-slate-500">Loading products...</div>
                                    ) : (subcategoryProducts[sub._id] || []).length > 0 ? (
                                      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                        {subcategoryProducts[sub._id].map((product: any) => (
                                          <div key={product._id} className="bg-white border rounded p-2 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="font-medium text-slate-800 truncate" title={product.product_name}>{product.product_name}</p>
                                              {product.product_title && (
                                                <p className="text-xs text-slate-500 truncate" title={product.product_title}>{product.product_title}</p>
                                              )}
                                              <p className="text-[11px] text-slate-400 mt-1">ID: {product.product_id}</p>
                                            </div>
                                            <button
                                              onClick={() => copyProductId(product.product_id)}
                                              className="p-2 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex-shrink-0"
                                              title="Copy product ID"
                                            >
                                              <Scissors className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-500">No products in this subcategory</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Products */}
                      {categoryDetails[category._id].products.length > 0 && (
                        <div>
                          <h5 className="font-medium text-slate-700 mb-2">
                            Category Products ({categoryDetails[category._id].products.length})
                          </h5>
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                            {categoryDetails[category._id].products.map((product: any) => (
                              <div key={product._id} className="bg-white p-3 rounded border text-sm flex justify-between items-center">
                                <div className="min-w-0">
                                  <span className="font-medium truncate" title={product.product_name}>{product.product_name}</span>
                                  {product.product_title && (
                                    <p className="text-slate-500 text-xs mt-1 truncate" title={product.product_title}>{product.product_title}</p>
                                  )}
                                  <p className="text-[11px] text-slate-400 mt-1">ID: {product.product_id}</p>
                                </div>
                                <button
                                  onClick={() => copyProductId(product.product_id)}
                                  className="p-2 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex-shrink-0"
                                  title="Copy product ID"
                                >
                                  <Scissors className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No items */}
                      {categoryDetails[category._id].subcategories.length === 0 && 
                       categoryDetails[category._id].products.length === 0 && (
                        <div className="text-center text-slate-500 text-sm py-4">
                          This category has no subcategories or products yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
