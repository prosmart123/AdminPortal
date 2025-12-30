'use client';
import { Menu, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminHeaderProps {
  title: string;
  onMenuClick: () => void;
}

export const AdminHeader = ({ title, onMenuClick }: AdminHeaderProps) => {
  const router = useRouter();

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>

        {/* Mobile Logo */}
        <div className="md:hidden flex items-center gap-2">
          <img
            src="/logo.jpeg"
            alt="Prosmart Concepts"
            width={52}
            height={52}
            loading="lazy"
            className="w-13 h-13 object-contain"
          />
          <span className="font-bold text-slate-800">Prosmart Concepts</span>
        </div>

        {/* Desktop Title */}
        <h1 className="hidden md:block text-xl font-bold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile Add Product Button */}
        <button
          className="md:hidden p-2 bg-white border-2 border-teal-500 text-teal-600 rounded-xl hover:bg-teal-50 hover:border-teal-600 transition-all"
          onClick={() => router.push('/products/new')}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
