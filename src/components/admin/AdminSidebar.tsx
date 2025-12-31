'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Package, LogOut, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useState } from 'react';

const productItems = [
  { title: 'Add Product', icon: Plus, path: '/products/new' },
  { title: 'Product List', icon: Package, path: '/products' },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar = ({ isOpen, onClose }: AdminSidebarProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const activeTab = searchParams.get('tab') || 'prosmart';

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      
      if (data.success) {
        const products = data.data;
        const ws = XLSX.utils.json_to_sheet(products);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const fname = `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fname);
        toast.success('Products exported successfully!');
      } else {
        toast.error('Failed to fetch products for export');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed!');
    }
    setIsExporting(false);
  };

  const handleLogout = () => {
    logout();
    onClose();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-50',
          'w-full md:w-64 h-screen flex flex-col',
          'bg-white border-r border-slate-200 shadow-xl md:shadow-none',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="Prosmart Concepts Logo"
              width={80}
              height={80}
              loading="lazy"
              className="w-20 h-20 object-contain"
            />
            <div>
              <span className="font-bold text-slate-800 text-lg block">Prosmart Concepts</span>
              <span className="text-xs text-slate-500">Admin Panel</span>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto bg-white">
          {/* Brand Selection Buttons */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
              Brand
            </p>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/products?tab=prosmart"
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    pathname === '/products' && activeTab === 'prosmart'
                      ? 'bg-white border-2 border-teal-500 text-teal-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 border-2 border-transparent hover:border-slate-200'
                  )}
                >
                  <span className="font-medium">ProSmart</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/products?tab=hydralite"
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    pathname === '/products' && activeTab === 'hydralite'
                      ? 'bg-white border-2 border-teal-500 text-teal-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 border-2 border-transparent hover:border-slate-200'
                  )}
                >
                  <span className="font-medium">Hydralite</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Products Section */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
              Products
            </p>
            <ul className="space-y-1">
              {productItems.map((item) => {
                const isActive = pathname === item.path || 
                  (item.path === '/products' && pathname === '/products');
                
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                        isActive
                          ? 'bg-white border-2 border-teal-500 text-teal-600 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 border-2 border-transparent hover:border-slate-200'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
              {/* Export button */}
              <li>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-600 hover:bg-slate-50 border-2 border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Download className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    {isExporting ? 'Exporting...' : 'Export as Excel'}
                  </span>
                </button>
              </li>
            </ul>
          </div>

          {/* Logout placed below product list */}
          <div className="mt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border-2 border-rose-500 text-rose-600 hover:bg-rose-50 hover:border-rose-600 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Log out</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};
