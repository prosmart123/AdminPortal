'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { CategoryManagementModal } from '@/components/admin/CategoryManagementModal';
import { SubcategoryManagementModal } from '@/components/admin/SubcategoryManagementModal';
import { Select } from '@/components/ui/Select';
import { Search, Plus, Edit, Trash2, Package, Layers, Loader2, Download, Flag, ArrowUpDown, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { fetchWithRetry } from '@/lib/safe-fetch';

interface Product {
  _id: string;
  product_id: string;
  product_name: string;
  product_title: string;
  product_description: string;
  image_urls: string[];
  category_id: string;
  subcategory_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
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
  created_at?: string;
  updated_at?: string;
}

interface HydraliteCategory {
  _id: string;
  id: string;
  name: string;
}



export default function ProductListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'prosmart' | 'hydralite'>(
    (searchParams.get('tab') as 'prosmart' | 'hydralite') || 'prosmart'
  );
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterSubcategories, setFilterSubcategories] = useState<Subcategory[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [flaggedProducts, setFlaggedProducts] = useState<Map<string, 'green' | 'red'>>(new Map());
  const [viewMode, setViewMode] = useState<'list'>('list');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortType, setSortType] = useState<'name-length' | 'alphabetical' | 'date-desc'>('alphabetical');
  const [showHydraliteSortDropdown, setShowHydraliteSortDropdown] = useState(false);

  // Hydralite states
  const [hydraliteProducts, setHydraliteProducts] = useState<HydraliteProduct[]>([]);
  const [hydraliteCategories, setHydraliteCategories] = useState<HydraliteCategory[]>([]);
  const [hydraliteIsLoading, setHydraliteIsLoading] = useState(true);
  const [hydraliteSearch, setHydraliteSearch] = useState('');
  const [debouncedHydraliteSearch, setDebouncedHydraliteSearch] = useState('');
  const [hydraliteCategoryFilter, setHydraliteCategoryFilter] = useState('all');
  const [hydraliteViewMode, setHydraliteViewMode] = useState<'list'>('list');
  const [hydraliteSortType, setHydraliteSortType] = useState<'name-length' | 'alphabetical' | 'date-desc'>('alphabetical');
  const [hydraliteDeletingProductId, setHydraliteDeletingProductId] = useState<string | null>(null);
  const [hydraliteFlaggedProducts, setHydraliteFlaggedProducts] = useState<Map<string, 'green' | 'red'>>(new Map());

  // Hydralite sub-navigation states
  const [hydraliteSubTab, setHydraliteSubTab] = useState<'products' | 'landing'>('products');
  const [landingPageDropdowns, setLandingPageDropdowns] = useState({
    heroProduct1: false,
    heroProduct2: false,
    priorityOrder: false,
  });

  // Landing Page Customization states
  const [heroProducts, setHeroProducts] = useState<string[]>([]);
  const [priorityProducts, setPriorityProducts] = useState<string[]>([]);
  const [landingPageLoading, setLandingPageLoading] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);


  // Click outside handler for export dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportDropdown]);

  // Click outside handler for sort dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    if (showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortDropdown]);

  // Click outside handler for hydralite sort dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!target || !(target as Element).closest) return;
      const element = (target as Element).closest('.hydralite-sort-dropdown');
      if (!element) {
        setShowHydraliteSortDropdown(false);
      }
    };

    if (showHydraliteSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHydraliteSortDropdown]);


  // Sync activeTab with URL search params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'prosmart' | 'hydralite' | null;
    if (tabFromUrl && (tabFromUrl === 'prosmart' || tabFromUrl === 'hydralite')) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Update URL when activeTab changes
  const handleTabChange = (tab: 'prosmart' | 'hydralite') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/products?${params.toString()}`, { scroll: false });
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounce hydralite search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHydraliteSearch(hydraliteSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [hydraliteSearch]);

  // Fetch categories and all subcategories on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categoriesData, allSubcatsData] = await Promise.all([
          fetchWithRetry('/api/categories', { maxRetries: 2 }),
          fetchWithRetry('/api/subcategories', { maxRetries: 2 }),
        ] as const);

        if (categoriesData?.success) {
          setCategories(categoriesData.data);
        } else {
          toast.error('Failed to load categories');
        }
        if (allSubcatsData?.success) {
          setAllSubcategories(allSubcatsData.data);
        } else {
          toast.error('Failed to load subcategories');
        }
      } catch (error: any) {
        console.error('Error fetching initial data:', error);
        toast.error(error?.message || 'Failed to load initial data. Please refresh the page.');
      }
    };

    fetchInitialData();
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (categoryFilter !== 'all') {
        params.append('category_id', categoryFilter);
      }
      if (subcategoryFilter !== 'all') {
        params.append('subcategory_id', subcategoryFilter);
      }

      const data = await fetchWithRetry<any>(`/api/products?${params.toString()}`, { maxRetries: 2 });

      if (data?.success && Array.isArray(data.data)) {
        setProducts(data.data);
      } else {
        toast.error('Failed to load products');
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error(error?.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, categoryFilter, subcategoryFilter]);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch hydralite categories on mount
  useEffect(() => {
    const fetchHydraliteCategories = async () => {
      try {
        const data = await fetchWithRetry<any>('/api/hydralite/categories', { maxRetries: 2 });
        if (data?.success) {
          setHydraliteCategories(data.data || []);
        }
      } catch (error: any) {
        console.error('Error fetching hydralite categories:', error);
      }
    };
    fetchHydraliteCategories();
  }, []);

  // Fetch hydralite products
  const fetchHydraliteProducts = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setHydraliteIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (debouncedHydraliteSearch) {
        params.append('search', debouncedHydraliteSearch);
      }
      if (hydraliteCategoryFilter !== 'all') {
        params.append('category', hydraliteCategoryFilter);
      }

      const data = await fetchWithRetry<any>(`/api/hydralite?${params.toString()}`, { maxRetries: 2 });

      if (data?.success && Array.isArray(data.data)) {
        setHydraliteProducts(data.data);
      } else {
        toast.error('Failed to load hydralite products');
      }
    } catch (error: any) {
      console.error('Error fetching hydralite products:', error);
      toast.error(error?.message || 'Failed to load hydralite products');
    } finally {
      setHydraliteIsLoading(false);
    }
  }, [debouncedHydraliteSearch, hydraliteCategoryFilter]);

  // Fetch hydralite products when filters change
  useEffect(() => {
    if (activeTab === 'hydralite') {
      fetchHydraliteProducts();
    }
  }, [fetchHydraliteProducts, activeTab]);

  // Fetch landing page customization when switching to landing tab
  useEffect(() => {
    if (activeTab === 'hydralite' && hydraliteSubTab === 'landing') {
      fetchLandingPageData();
    }
  }, [activeTab, hydraliteSubTab]);

  const fetchLandingPageData = async () => {
    setLandingPageLoading(true);
    try {
      const [heroRes, priorityRes] = await Promise.all([
        fetch('/api/hydralite/hero-customization'),
        fetch('/api/hydralite/priority')
      ]);
      const heroData = await heroRes.json();
      const priorityData = await priorityRes.json();

      if (heroData.success) {
        setHeroProducts(heroData.data.products || []);
      }
      if (priorityData.success) {
        setPriorityProducts(priorityData.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching landing page data:', error);
      toast.error('Failed to load landing page customization');
    } finally {
      setLandingPageLoading(false);
    }
  };

  const saveHeroProducts = async () => {
    setSavingHero(true);
    try {
      const res = await fetch('/api/hydralite/hero-customization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: heroProducts })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Hero section updated successfully');
      } else {
        toast.error(data.error || 'Failed to update hero section');
      }
    } catch (error) {
      console.error('Error saving hero products:', error);
      toast.error('Failed to save hero section');
    } finally {
      setSavingHero(false);
    }
  };

  const savePriorityOrder = async () => {
    setSavingPriority(true);
    try {
      const res = await fetch('/api/hydralite/priority', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: priorityProducts })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Priority order updated successfully');
      } else {
        toast.error(data.error || 'Failed to update priority order');
      }
    } catch (error) {
      console.error('Error saving priority order:', error);
      toast.error('Failed to save priority order');
    } finally {
      setSavingPriority(false);
    }
  };

  // Fetch filter subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (categoryFilter === 'all') {
        setFilterSubcategories([]);
        return;
      }

      try {
        const data = await fetchWithRetry<any>(`/api/subcategories/${categoryFilter}`, { maxRetries: 1 });
        if (data?.success) {
          setFilterSubcategories(data.data);
        }
      } catch (error: any) {
        console.error('Error fetching subcategories:', error);
        toast.error('Failed to load subcategories');
      }
    };

    fetchSubcategories();
  }, [categoryFilter]);

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setSubcategoryFilter('all');
  };

  const getCategoryKey = (c: Category) => c.category_id || c._id;
  const getSubcategoryKey = (s: Subcategory) => s.subcategory_id || s._id;

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => getCategoryKey(c) === categoryId);
    return category?.category_name || 'Unknown';
  };

  const getSubcategoryName = (subcategoryId: string) => {
    const subcategory = allSubcategories.find((s) => getSubcategoryKey(s) === subcategoryId);
    return subcategory?.subcategory_name || 'Unknown';
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }

    setDeletingProductId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Product deleted successfully');
        // Refresh products
        fetchProducts(false);
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleEdit = (productId: string) => {
    setEditingProductId(productId);
    router.push(`/products/${productId}`);
  };

  const handleCopyLink = async (productId: string) => {
    try {
      const url = `${location.origin}/products/${productId}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.success('Link copied to clipboard');
    } catch (err) {
      console.error('Copy failed', err);
      toast.error('Failed to copy link');
    }
  };

  const handleExport = async (type: 'json' | 'excel') => {
    setShowExportDropdown(false);
    setExportLoading(true);
    try {
      const apiUrl = activeTab === 'prosmart' ? '/api/products?all=true' : '/api/hydralite?all=true';
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (!data.success || !Array.isArray(data.data)) {
        toast.error('Failed to export products!');
        setExportLoading(false);
        return;
      }
      const products = data.data;
      const prefix = activeTab === 'prosmart' ? 'products' : 'hydralite_products';
      if (type === 'json') {
        const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
        const fname = `${prefix}_export_${new Date().toISOString().slice(0, 10)}.json`;
        saveAs(blob, fname);
      } else if (type === 'excel') {
        const ws = XLSX.utils.json_to_sheet(products);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const fname = `${prefix}_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fname);
      }
    } catch (err) {
      toast.error('Export failed!');
    }
    setExportLoading(false);
  };

  // Handle category/subcategory management changes
  const handleCategoryManagementChange = () => {
    // Refresh categories and products
    const fetchInitialData = async () => {
      try {
        const [categoriesRes, allSubcatsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/subcategories'),
        ]);

        const categoriesData = await categoriesRes.json();
        const allSubcatsData = await allSubcatsRes.json();

        if (categoriesData.success) {
          setCategories(categoriesData.data);
        }
        if (allSubcatsData.success) {
          setAllSubcategories(allSubcatsData.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchInitialData();
    fetchProducts(false); // Refresh products as well
  };

  const handleSubcategoryManagementChange = () => {
    handleCategoryManagementChange(); // Same refresh logic
  };


  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map((cat) => ({ value: getCategoryKey(cat), label: cat.category_name })),
  ];

  const subcategoryOptions = [
    { value: 'all', label: 'All Subcategories' },
    ...filterSubcategories.map((sub) => ({ value: getSubcategoryKey(sub), label: sub.subcategory_name })),
  ];

  // Set flag color
  const setFlag = (productId: string, color: 'green' | 'red') => {
    setFlaggedProducts((prev) => {
      const newMap = new Map(prev);
      newMap.set(productId, color);
      return newMap;
    });
  };

  // Remove flag
  const removeFlag = (productId: string) => {
    setFlaggedProducts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(productId);
      return newMap;
    });
  };

  const greenFlagCount = Array.from(flaggedProducts.values()).filter(color => color === 'green').length;
  const redFlagCount = Array.from(flaggedProducts.values()).filter(color => color === 'red').length;


  const sortedProducts = [...products].sort((a, b) => {
    // Handle undefined/null product names
    const nameA = a.product_name || '';
    const nameB = b.product_name || '';

    if (sortType === 'date-desc') {
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const diff = dateB - dateA;
      if (!Number.isNaN(diff) && diff !== 0) return diff;
      // Fallback alphabetical if dates missing or equal
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    }

    if (sortType === 'name-length') {
      // Sort by product name length (longer names first)
      const lengthDiff = nameB.length - nameA.length;
      if (lengthDiff !== 0) return lengthDiff;
      // If lengths are same, sort alphabetically
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    }

    // Alphabetical sorting A-Z
    return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
  });

  const sortedHydraliteProducts = [...hydraliteProducts].sort((a, b) => {
    // Handle undefined/null names
    const nameA = a.name || '';
    const nameB = b.name || '';

    if (hydraliteSortType === 'date-desc') {
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const diff = dateB - dateA;
      if (!Number.isNaN(diff) && diff !== 0) return diff;
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    }

    if (hydraliteSortType === 'name-length') {
      const lengthDiff = nameB.length - nameA.length;
      if (lengthDiff !== 0) return lengthDiff;
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    }

    return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
  });

  const getHydraliteImageUrl = (product: HydraliteProduct) => {
    const imageAsset = product.assets?.find(asset =>
      asset.type === 'image' || asset.path?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    const path = imageAsset?.path || '/hydralite_logo.png';
    // If path is a relative path (starts with /), it might not exist, use fallback
    // Only return the path if it's a full URL (starts with http:// or https://)
    if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
      return path;
    }
    // If it's a relative path, return fallback
    return '/hydralite_logo.png';
  };

  const handleHydraliteDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }

    setHydraliteDeletingProductId(productId);
    try {
      const res = await fetch(`/api/hydralite/${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Product deleted successfully');
        fetchHydraliteProducts(false);
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting hydralite product:', error);
      toast.error('Failed to delete product');
    } finally {
      setHydraliteDeletingProductId(null);
    }
  };

  const setHydraliteFlag = (productId: string, color: 'green' | 'red') => {
    setHydraliteFlaggedProducts((prev) => {
      const newMap = new Map(prev);
      newMap.set(productId, color);
      return newMap;
    });
  };

  const removeHydraliteFlag = (productId: string) => {
    setHydraliteFlaggedProducts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(productId);
      return newMap;
    });
  };

  const hydraliteGreenFlagCount = Array.from(hydraliteFlaggedProducts.values()).filter(color => color === 'green').length;
  const hydraliteRedFlagCount = Array.from(hydraliteFlaggedProducts.values()).filter(color => color === 'red').length;


  const hydraliteCategoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...hydraliteCategories.map((cat) => ({ value: cat.name, label: cat.name })),
  ];

  // Note: Do not short-circuit return on `isLoading` so the page chrome
  // (filters, actions, stats) remains visible. We'll show skeletons only
  // in the products/card areas while `isLoading` is true.

  return (
    <AdminLayout title="Product List" showHeader={false}>
      {/* Floating Tabbar at Header Location */}
      <div className="sticky top-0 z-30 flex items-center justify-center py-2 bg-white">
        {/* Floating Tabbar Container - Centered */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border-2 border-slate-300 shadow-sm">
          <button
            onClick={() => handleTabChange('prosmart')}
            className={`flex items-center justify-center px-4 py-2 rounded-md transition-all ${activeTab === 'prosmart'
              ? 'bg-teal-50 border-2 border-teal-500 shadow-sm'
              : 'bg-white border-2 border-transparent hover:bg-slate-50'
              }`}
            aria-label="ProSmart"
            title="ProSmart"
          >
            <img src="/prosmart_logo_lg.png" alt="ProSmart" className="h-6 md:h-7 object-contain" />
          </button>
          <button
            onClick={() => handleTabChange('hydralite')}
            className={`flex items-center justify-center px-4 py-2 rounded-md transition-all ${activeTab === 'hydralite'
              ? 'bg-teal-50 border-2 border-teal-500 shadow-sm'
              : 'bg-white border-2 border-transparent hover:bg-slate-50'
              }`}
            aria-label="Hydralite"
            title="Hydralite"
          >
            <img src="/hydralite_logo.png" alt="Hydralite" className="h-6 md:h-7 object-contain" />
          </button>
        </div>
      </div>

      {exportLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-xl flex items-center gap-3 shadow-lg">
            <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
            <span className="font-medium text-slate-700">Exporting...</span>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      <div className="space-y-4 md:space-y-5 pt-4">
        {/* Stats Card - Same for both tabs */}
        <div className="bg-white rounded-2xl border-2 border-teal-500 p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Icon and Total Products */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 md:w-16 md:h-16 border-2 border-teal-500 rounded-2xl flex items-center justify-center bg-teal-50 flex-shrink-0">
                <Layers className="w-7 h-7 md:w-8 md:h-8 text-teal-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Products</p>
                <div className="flex items-center mt-1">
                  {activeTab === 'prosmart' ? (
                    isLoading ? (
                      <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-teal-600" />
                    ) : (
                      <p className="text-3xl md:text-4xl font-bold text-slate-800">
                        {products.length}
                      </p>
                    )
                  ) : (
                    hydraliteIsLoading ? (
                      <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-teal-600" />
                    ) : (
                      <p className="text-3xl md:text-4xl font-bold text-slate-800">
                        {hydraliteProducts.length}
                      </p>
                    )
                  )}
                </div>
                {activeTab === 'prosmart' && (debouncedSearch || categoryFilter !== 'all' || subcategoryFilter !== 'all') && (
                  <p className="text-slate-500 text-xs mt-1">
                    Filtered results
                  </p>
                )}
                {activeTab === 'hydralite' && (debouncedHydraliteSearch || hydraliteCategoryFilter !== 'all') && (
                  <p className="text-slate-500 text-xs mt-1">
                    Filtered results
                  </p>
                )}
              </div>
            </div>

            {/* Right: View Toggle Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              {/* Export Dropdown */}
              <div ref={exportDropdownRef} className="relative">
                <button
                  onClick={() => setShowExportDropdown((s) => !s)}
                  className="h-10 px-3 bg-white border-2 border-green-500 text-green-600 rounded-lg font-semibold hover:bg-green-50 hover:border-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  title="Export Products"
                  disabled={exportLoading}
                >
                  {exportLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span className="hidden md:inline text-sm">
                    {exportLoading ? 'Exporting...' : 'Export'}
                  </span>
                </button>
                {showExportDropdown && !exportLoading && (
                  <div className="absolute z-20 mt-2 right-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                    <button
                      onClick={() => handleExport('excel')}
                      className="block w-full px-4 py-2 text-left hover:bg-gray-50 rounded font-medium text-sm text-gray-700 transition-colors"
                      disabled={exportLoading}
                    >
                      Export as Excel
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="block w-full px-4 py-2 mt-1 text-left hover:bg-gray-50 rounded font-medium text-sm text-gray-700 transition-colors"
                      disabled={exportLoading}
                    >
                      Export as JSON
                    </button>
                  </div>
                )}
              </div>

              {/* Add Product Button */}
              <button
                onClick={() => router.push(activeTab === 'hydralite' ? '/products/hydralite/new' : '/products/new')}
                className="h-10 px-3 bg-white border-2 border-teal-500 text-teal-600 rounded-lg font-semibold hover:bg-teal-50 hover:border-teal-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline text-sm">Add</span>
              </button>

              {/* Manage / Add Subcategories only */}
              <button
                onClick={() => router.push('/manage')}
                className="h-10 px-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
                title="Manage or add subcategories"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden md:inline text-sm">Manage</span>
              </button>
            </div>
          </div>

          {/* Flagged Count */}
          {activeTab === 'prosmart' && (greenFlagCount > 0 || redFlagCount > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-4">
                {greenFlagCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-green-600 fill-green-600" />
                    <span className="text-slate-700 font-medium text-2xl">
                      {greenFlagCount}
                    </span>
                  </div>
                )}
                {redFlagCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-red-600 fill-red-600" />
                    <span className="text-slate-700 font-medium text-2xl">
                      {redFlagCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'hydralite' && (hydraliteGreenFlagCount > 0 || hydraliteRedFlagCount > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-4">
                {hydraliteGreenFlagCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-green-600 fill-green-600" />
                    <span className="text-slate-700 font-medium text-2xl">
                      {hydraliteGreenFlagCount}
                    </span>
                  </div>
                )}
                {hydraliteRedFlagCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-red-600 fill-red-600" />
                    <span className="text-slate-700 font-medium text-2xl">
                      {hydraliteRedFlagCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ProSmart Content */}
        {activeTab === 'prosmart' && (
          <>
            {/* Search - Full width on mobile */}
            <div className="relative w-full mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-all"
              />
            </div>

            {/* Filters and View Toggle */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-4">
              {/* Filters Section */}
              <div className="flex flex-col sm:flex-row flex-1 gap-3">
                <Select
                  value={categoryFilter}
                  onValueChange={handleCategoryChange}
                  options={categoryOptions}
                  placeholder="Category"
                  className="w-full sm:w-80"
                />

                <Select
                  value={subcategoryFilter}
                  onValueChange={setSubcategoryFilter}
                  options={subcategoryOptions}
                  placeholder="Subcategory"
                  disabled={categoryFilter === 'all'}
                  className="w-full sm:w-80"
                />
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-2 flex-shrink-0">
                {/* Sort Button with Dropdown */}
                <div ref={sortDropdownRef} className="relative">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="h-10 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    title="Sort Products"
                  >
                    <ArrowUpDown className="w-5 h-5" />
                  </button>
                  {showSortDropdown && (
                    <div className="absolute z-20 mt-2 right-0 w-56 bg-white border-2 border-slate-300 rounded-xl shadow-xl p-2">
                      <button
                        onClick={() => {
                          setSortType('name-length');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all ${sortType === 'name-length'
                          ? 'bg-teal-500 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        Product Name Length
                      </button>
                      <button
                        onClick={() => {
                          setSortType('alphabetical');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all mt-1 ${sortType === 'alphabetical'
                          ? 'bg-teal-500 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        A-Z
                      </button>
                      <button
                        onClick={() => {
                          setSortType('date-desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all mt-1 ${sortType === 'date-desc'
                          ? 'bg-teal-500 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        Date (Newest)
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Products Grid - Mobile Cards */}
            {viewMode === 'list' && (
              <div className="block md:hidden space-y-3">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex gap-4 animate-pulse">
                        <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2 py-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                          <div className="h-3 bg-gray-200 rounded w-1/3" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="w-9 h-9 bg-gray-200 rounded" />
                          <div className="w-9 h-9 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : sortedProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No products found</p>
                  </div>
                ) : (
                  sortedProducts.map((product, index) => {
                    const flagColor = flaggedProducts.get(product._id);
                    const isGreenFlagged = flagColor === 'green';
                    const isRedFlagged = flagColor === 'red';
                    return (
                      <div
                        key={product._id}
                        className={`rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all ${isGreenFlagged
                          ? 'bg-green-50 border-green-400'
                          : isRedFlagged
                            ? 'bg-red-50 border-red-400'
                            : 'bg-white border-slate-200'
                          }`}
                      >
                        <div className="flex gap-4">
                          {/* Serial Number and Flag Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-slate-600 font-semibold text-lg w-6">{index + 1}</span>
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => setFlag(product._id, 'green')}
                                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isGreenFlagged
                                  ? 'bg-green-500'
                                  : 'bg-white border border-slate-300 hover:bg-green-50 hover:border-green-400'
                                  }`}
                                title="Flag Green"
                              >
                                <Flag className={`w-3.5 h-3.5 ${isGreenFlagged ? 'fill-white text-white' : 'text-slate-400'}`} />
                              </button>
                              <button
                                onClick={() => setFlag(product._id, 'red')}
                                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isRedFlagged
                                  ? 'bg-red-500'
                                  : 'bg-white border border-slate-300 hover:bg-red-50 hover:border-red-400'
                                  }`}
                                title="Flag Red"
                              >
                                <Flag className={`w-3.5 h-3.5 ${isRedFlagged ? 'fill-white text-white' : 'text-red-500'}`} />
                              </button>
                            </div>
                          </div>

                          {/* Product Image */}
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 ring-1 ring-slate-200">
                            {product.image_urls?.[0] ? (
                              <img
                                src={product.image_urls[0]}
                                alt={product.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Package className="w-8 h-8" />
                              </div>
                            )}
                          </div>

                          {/* Product Info - Clickable */}
                          <div
                            onClick={() => router.push(`/products/${product.product_id}`)}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <h3 className="font-semibold text-slate-800 truncate hover:text-teal-600 transition-colors">
                              {product.product_name}
                            </h3>
                            <p className="text-sm text-teal-600 font-medium mt-1">
                              {getCategoryName(product.category_id)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {getSubcategoryName(product.subcategory_id)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => router.push(`/products/${product.product_id}`)}
                              className="p-2.5 bg-white border-2 border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCopyLink(product.product_id)}
                              className="p-2.5 bg-white border-2 border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center"
                              title="Copy Link"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.product_id, product.product_name)}
                              disabled={deletingProductId === product._id}
                              className="p-2.5 bg-white border-2 border-rose-500 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                              title="Delete"
                            >
                              {deletingProductId === product._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Desktop Table */}
            {viewMode === 'list' && (
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">

                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                          Product
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                          Category
                        </th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-4 bg-gray-200 rounded w-8" />
                                <div className="flex flex-col gap-1">
                                  <div className="w-6 h-6 bg-gray-200 rounded" />
                                  <div className="w-6 h-6 bg-gray-200 rounded" />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0" />
                                <div className="h-4 bg-gray-200 rounded w-1/3" />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/6" />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-9 h-9 bg-gray-200 rounded" />
                                <div className="w-9 h-9 bg-gray-200 rounded" />
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        sortedProducts.map((product, index) => {
                          const flagColor = flaggedProducts.get(product._id);
                          const isGreenFlagged = flagColor === 'green';
                          const isRedFlagged = flagColor === 'red';
                          return (
                            <tr key={product._id} className={`transition-all ${isGreenFlagged
                              ? 'bg-green-50 hover:bg-green-100'
                              : isRedFlagged
                                ? 'bg-red-50 hover:bg-red-100'
                                : 'hover:bg-slate-50'
                              }`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-600 font-semibold text-lg w-6">{index + 1}</span>
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => setFlag(product._id, 'green')}
                                      className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isGreenFlagged
                                        ? 'bg-green-500'
                                        : 'bg-white border border-slate-300 hover:bg-green-50 hover:border-green-400'
                                        }`}
                                      title="Flag Green"
                                    >
                                      <Flag className={`w-3.5 h-3.5 ${isGreenFlagged ? 'fill-white text-white' : 'text-slate-400'}`} />
                                    </button>
                                    <button
                                      onClick={() => setFlag(product._id, 'red')}
                                      className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isRedFlagged
                                        ? 'bg-red-500'
                                        : 'bg-white border border-slate-300 hover:bg-red-50 hover:border-red-400'
                                        }`}
                                      title="Flag Red"
                                    >
                                      <Flag className={`w-3.5 h-3.5 ${isRedFlagged ? 'fill-white text-white' : 'text-red-500'}`} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div
                                  onClick={() => router.push(`/products/${product.product_id}`)}
                                  className="flex items-center gap-4 cursor-pointer group"
                                >
                                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 ring-1 ring-slate-200">
                                    {product.image_urls?.[0] ? (
                                      <img
                                        src={product.image_urls[0]}
                                        alt={product.product_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <Package className="w-6 h-6" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-semibold text-slate-800 group-hover:text-teal-600 transition-colors">{product.product_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-slate-800 font-medium">{getCategoryName(product.category_id)}</p>
                                  <p className="text-slate-500 text-sm">{getSubcategoryName(product.subcategory_id)}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => router.push(`/products/${product.product_id}`)}
                                    className="p-2.5 bg-white border-2 border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleCopyLink(product.product_id)}
                                    className="p-2.5 bg-white border-2 border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center"
                                    title="Copy Link"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(product.product_id, product.product_name)}
                                    disabled={deletingProductId === product._id}
                                    className="p-2.5 bg-white border-2 border-rose-500 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                    title="Delete"
                                  >
                                    {deletingProductId === product._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {products.length === 0 && (
                  <div className="text-center py-16">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No products found</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Hydralite Content */}
        {activeTab === 'hydralite' && (
          <>
            {/* Hydralite Sub-Navigation */}
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4 border-b-2 border-slate-200">
                {/* Navigation Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setHydraliteSubTab('products')}
                    className={`px-6 py-3 font-semibold transition-all ${hydraliteSubTab === 'products'
                      ? 'text-teal-600 border-b-2 border-teal-600 -mb-0.5'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    Products
                  </button>
                  <button
                    onClick={() => setHydraliteSubTab('landing')}
                    className={`px-6 py-3 font-semibold transition-all ${hydraliteSubTab === 'landing'
                      ? 'text-teal-600 border-b-2 border-teal-600 -mb-0.5'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    Landing Page Customization
                  </button>
                </div>

                {/* Search Bar - Only show on Products tab */}
                {hydraliteSubTab === 'products' && (
                  <div className="relative w-80 mb-0.5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      placeholder="Search products..."
                      value={hydraliteSearch}
                      onChange={(e) => setHydraliteSearch(e.target.value)}
                      className="w-full h-9 pl-10 pr-4 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Products Tab Content */}
            {hydraliteSubTab === 'products' && (
              <>
                {/* Filters and View Toggle */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-end mb-4">
                  {/* View Toggle Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Sort Button with Dropdown */}
                    <div className="relative hydralite-sort-dropdown">
                      <button
                        onClick={() => setShowHydraliteSortDropdown(!showHydraliteSortDropdown)}
                        className="h-10 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        title="Sort Products"
                      >
                        <ArrowUpDown className="w-5 h-5" />
                      </button>
                      {showHydraliteSortDropdown && (
                        <div className="absolute z-20 mt-2 right-0 w-56 bg-white border-2 border-slate-300 rounded-xl shadow-xl p-2">
                          <button
                            onClick={() => {
                              setHydraliteSortType('name-length');
                              setShowHydraliteSortDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all ${hydraliteSortType === 'name-length'
                              ? 'bg-teal-500 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                              }`}
                          >
                            Product Name Length
                          </button>
                          <button
                            onClick={() => {
                              setHydraliteSortType('alphabetical');
                              setShowHydraliteSortDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all mt-1 ${hydraliteSortType === 'alphabetical'
                              ? 'bg-teal-500 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                              }`}
                          >
                            A-Z
                          </button>
                          <button
                            onClick={() => {
                              setHydraliteSortType('date-desc');
                              setShowHydraliteSortDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all mt-1 ${hydraliteSortType === 'date-desc'
                              ? 'bg-teal-500 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                              }`}
                          >
                            Date (Newest)
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Products Grid - Mobile Cards */}
                {hydraliteViewMode === 'list' && (
                  <div className="block md:hidden space-y-3">
                    {hydraliteIsLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                          <div className="flex gap-4 animate-pulse">
                            <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0" />
                            <div className="flex-1 min-w-0 space-y-2 py-1">
                              <div className="h-4 bg-gray-200 rounded w-3/4" />
                              <div className="h-3 bg-gray-200 rounded w-1/2" />
                              <div className="h-3 bg-gray-200 rounded w-1/3" />
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="w-9 h-9 bg-gray-200 rounded" />
                              <div className="w-9 h-9 bg-gray-200 rounded" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : sortedHydraliteProducts.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No products found</p>
                      </div>
                    ) : (
                      sortedHydraliteProducts.map((product, index) => {
                        const flagColor = hydraliteFlaggedProducts.get(product._id);
                        const isGreenFlagged = flagColor === 'green';
                        const isRedFlagged = flagColor === 'red';
                        return (
                          <div
                            key={product._id}
                            className={`rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all ${isGreenFlagged
                              ? 'bg-green-50 border-green-400'
                              : isRedFlagged
                                ? 'bg-red-50 border-red-400'
                                : 'bg-white border-slate-200'
                              }`}
                          >
                            <div className="flex gap-4">
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-slate-600 font-semibold text-lg w-6">{index + 1}</span>
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => setHydraliteFlag(product._id, 'green')}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isGreenFlagged
                                      ? 'bg-green-500'
                                      : 'bg-white border border-slate-300 hover:bg-green-50 hover:border-green-400'
                                      }`}
                                    title="Flag Green"
                                  >
                                    <Flag className={`w-3.5 h-3.5 ${isGreenFlagged ? 'fill-white text-white' : 'text-slate-400'}`} />
                                  </button>
                                  <button
                                    onClick={() => setHydraliteFlag(product._id, 'red')}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isRedFlagged
                                      ? 'bg-red-500'
                                      : 'bg-white border border-slate-300 hover:bg-red-50 hover:border-red-400'
                                      }`}
                                    title="Flag Red"
                                  >
                                    <Flag className={`w-3.5 h-3.5 ${isRedFlagged ? 'fill-white text-white' : 'text-red-500'}`} />
                                  </button>
                                </div>
                              </div>

                              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 ring-1 ring-slate-200">
                                <img
                                  src={getHydraliteImageUrl(product)}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/hydralite_logo.png';
                                  }}
                                />
                              </div>

                              <div
                                className="flex-1 min-w-0"
                              >
                                <h3 className="font-semibold text-slate-800 truncate hover:text-teal-600 transition-colors">
                                  {product.name}
                                </h3>
                                {product.category && (
                                  <p className="text-sm text-teal-600 font-medium mt-1">
                                    {product.category}
                                  </p>
                                )}
                                {product.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2">
                                    {product.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => router.push(`/products/hydralite/${product._id}`)}
                                  className="p-2.5 bg-white border-2 border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleHydraliteDelete(product._id, product.name)}
                                  disabled={hydraliteDeletingProductId === product._id}
                                  className="p-2.5 bg-white border-2 border-rose-500 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                  title="Delete"
                                >
                                  {hydraliteDeletingProductId === product._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Desktop Table */}
                {hydraliteViewMode === 'list' && (
                  <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">

                            </th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                              Product
                            </th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                              Category
                            </th>
                            <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {hydraliteIsLoading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-4 bg-gray-200 rounded w-8" />
                                    <div className="flex flex-col gap-1">
                                      <div className="w-6 h-6 bg-gray-200 rounded" />
                                      <div className="w-6 h-6 bg-gray-200 rounded" />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0" />
                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-9 h-9 bg-gray-200 rounded" />
                                    <div className="w-9 h-9 bg-gray-200 rounded" />
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            sortedHydraliteProducts.map((product, index) => {
                              const flagColor = hydraliteFlaggedProducts.get(product._id);
                              const isGreenFlagged = flagColor === 'green';
                              const isRedFlagged = flagColor === 'red';
                              return (
                                <tr key={product._id} className={`transition-all ${isGreenFlagged
                                  ? 'bg-green-50 hover:bg-green-100'
                                  : isRedFlagged
                                    ? 'bg-red-50 hover:bg-red-100'
                                    : 'hover:bg-slate-50'
                                  }`}>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-slate-600 font-semibold text-lg w-6">{index + 1}</span>
                                      <div className="flex flex-col gap-1">
                                        <button
                                          onClick={() => setHydraliteFlag(product._id, 'green')}
                                          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isGreenFlagged
                                            ? 'bg-green-500'
                                            : 'bg-white border border-slate-300 hover:bg-green-50 hover:border-green-400'
                                            }`}
                                          title="Flag Green"
                                        >
                                          <Flag className={`w-3.5 h-3.5 ${isGreenFlagged ? 'fill-white text-white' : 'text-slate-400'}`} />
                                        </button>
                                        <button
                                          onClick={() => setHydraliteFlag(product._id, 'red')}
                                          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isRedFlagged
                                            ? 'bg-red-500'
                                            : 'bg-white border border-slate-300 hover:bg-red-50 hover:border-red-400'
                                            }`}
                                          title="Flag Red"
                                        >
                                          <Flag className={`w-3.5 h-3.5 ${isRedFlagged ? 'fill-white text-white' : 'text-red-500'}`} />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div
                                      className="flex items-center gap-4 group"
                                    >
                                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 ring-1 ring-slate-200">
                                        <img
                                          src={getHydraliteImageUrl(product)}
                                          alt={product.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/hydralite_logo.png';
                                          }}
                                        />
                                      </div>
                                      <span className="font-semibold text-slate-800 group-hover:text-teal-600 transition-colors">{product.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div>
                                      {product.category && (
                                        <p className="text-slate-800 font-medium">{product.category}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => router.push(`/products/hydralite/${product._id}`)}
                                        className="p-2.5 bg-white border-2 border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center"
                                        title="Edit"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleHydraliteDelete(product._id, product.name)}
                                        disabled={hydraliteDeletingProductId === product._id}
                                        className="p-2.5 bg-white border-2 border-rose-500 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        title="Delete"
                                      >
                                        {hydraliteDeletingProductId === product._id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {hydraliteProducts.length === 0 && !hydraliteIsLoading && (
                      <div className="text-center py-16">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No products found</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Landing Page Customization Tab Content */}
            {hydraliteSubTab === 'landing' && (
              <div className="space-y-4">
                {/* Hero Section Product 1 */}
                <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setLandingPageDropdowns(prev => ({ ...prev, heroProduct1: !prev.heroProduct1 }))}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-slate-800">Hero Section Product 1</h3>
                    <svg
                      className={`w-5 h-5 text-slate-600 transition-transform ${landingPageDropdowns.heroProduct1 ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {landingPageDropdowns.heroProduct1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                      {landingPageLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Product for Hero Section 1</label>
                            <select
                              value={heroProducts[0] || ''}
                              onChange={(e) => setHeroProducts([e.target.value, heroProducts[1] || ''])}
                              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
                            >
                              <option value="">-- Select Product --</option>
                              {sortedHydraliteProducts.map((product) => (
                                <option key={product._id} value={product._id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={saveHeroProducts}
                            disabled={savingHero}
                            className="px-6 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {savingHero ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Hero Section'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Hero Section Product 2 */}
                <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setLandingPageDropdowns(prev => ({ ...prev, heroProduct2: !prev.heroProduct2 }))}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-slate-800">Hero Section Product 2</h3>
                    <svg
                      className={`w-5 h-5 text-slate-600 transition-transform ${landingPageDropdowns.heroProduct2 ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {landingPageDropdowns.heroProduct2 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                      {landingPageLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Product for Hero Section 2</label>
                            <select
                              value={heroProducts[1] || ''}
                              onChange={(e) => setHeroProducts([heroProducts[0] || '', e.target.value])}
                              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
                            >
                              <option value="">-- Select Product --</option>
                              {sortedHydraliteProducts.map((product) => (
                                <option key={product._id} value={product._id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={saveHeroProducts}
                            disabled={savingHero}
                            className="px-6 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {savingHero ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Hero Section'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Products Priority Order */}
                <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setLandingPageDropdowns(prev => ({ ...prev, priorityOrder: !prev.priorityOrder }))}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-slate-800">Products Priority Order</h3>
                    <svg
                      className={`w-5 h-5 text-slate-600 transition-transform ${landingPageDropdowns.priorityOrder ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {landingPageDropdowns.priorityOrder && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                      {landingPageLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Drag to Reorder Products</label>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {priorityProducts.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No products in priority order. Add products below.</p>
                              ) : (
                                priorityProducts.map((productId, index) => {
                                  const product = sortedHydraliteProducts.find(p => p._id === productId);
                                  if (!product) return null;
                                  return (
                                    <div key={productId} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-300">
                                      <span className="text-slate-600 font-semibold">{index + 1}</span>
                                      <span className="flex-1 text-slate-800">{product.name}</span>
                                      <button
                                        onClick={() => setPriorityProducts(priorityProducts.filter(id => id !== productId))}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                        title="Remove"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Add Product to Priority</label>
                            <select
                              onChange={(e) => {
                                if (e.target.value && !priorityProducts.includes(e.target.value)) {
                                  setPriorityProducts([...priorityProducts, e.target.value]);
                                  e.target.value = '';
                                }
                              }}
                              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
                            >
                              <option value="">-- Select Product to Add --</option>
                              {sortedHydraliteProducts
                                .filter(p => !priorityProducts.includes(p._id))
                                .map((product) => (
                                  <option key={product._id} value={product._id}>
                                    {product.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <button
                            onClick={savePriorityOrder}
                            disabled={savingPriority}
                            className="px-6 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {savingPriority ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Priority Order'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoryChange={handleCategoryManagementChange}
      />

      {/* Subcategory Management Modal (no longer used here; kept for future use) */}
      <SubcategoryManagementModal
        isOpen={false}
        onClose={() => { }}
        onSubcategoryChange={handleSubcategoryManagementChange}
      />
    </AdminLayout>
  );
}
