'use client';

import React from 'react';

type ActiveTab = 'prosmart' | 'hydralite';

interface FloatingTabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

// A minimal, floating tab bar with two logos as clickable tabs.
export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({ activeTab, onTabChange }) => {
  const isActive = (tab: ActiveTab) => activeTab === tab;

  return (
    <div className="flex items-center justify-between gap-4 border border-slate-200 rounded-lg bg-white p-2 md:p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onTabChange('prosmart')}
          className={`p-1.5 rounded-md border ${isActive('prosmart') ? 'border-teal-500' : 'border-transparent'}`}
          aria-label="ProSmart tab"
          title="ProSmart"
        >
          <img src="/prosmart_logo_lg.png" alt="ProSmart" className="h-8 w-auto" />
        </button>
        <button
          onClick={() => onTabChange('hydralite')}
          className={`p-1.5 rounded-md border ${isActive('hydralite') ? 'border-teal-500' : 'border-transparent'}`}
          aria-label="Hydralite tab"
          title="Hydralite"
        >
          <img src="/hydralite_logo.png" alt="Hydralite" className="h-8 w-auto" />
        </button>
      </div>
      <div className="text-sm text-slate-600 italic">
        {activeTab === 'prosmart' ? 'Current content' : 'Empty content'}
      </div>
    </div>
  );
};

type TabItem = {
  id: string;
  label: string;
};

interface TabBarProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
}

// Simple horizontal tab bar used to switch sections in the admin UI.
export const TabBar: React.FC<TabBarProps> = ({ tabs, value, onChange }) => {
  return (
    <div className="flex gap-2 border-b border-slate-200 mb-4">
      {tabs.map((tab) => {
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              pb-2 px-3 rounded-t-md text-sm font-semibold
              ${isActive ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-600 hover:text-slate-800'}
            `}
            aria-pressed={isActive}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};