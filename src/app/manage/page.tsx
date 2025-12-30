'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SubcategoryManagementModal } from '@/components/admin/SubcategoryManagementModal';

export default function ManagePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <AdminLayout title="Manage">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <input
              placeholder="Search product name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-all"
            />
          </div>
          <button
            onClick={() => router.push('/products')}
            className="h-10 px-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all"
            title="Back to Products"
          >
            Back
          </button>
        </div>
        <SubcategoryManagementModal
          isOpen={true}
          onClose={() => router.push('/products')}
          standalone
          highlightQuery={query}
          onSubcategoryChange={() => { /* no-op */ }}
        />
      </div>
    </AdminLayout>
  );
}
