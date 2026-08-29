import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: 'pills' | 'underline' | 'segmented';
  className?: string;
  id?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  className = '',
  id,
}: TabsProps<T>) {
  if (variant === 'segmented') {
    return (
      <div
        id={id}
        role="tablist"
        className={`flex items-center gap-1 p-1 bg-stone-200/80 rounded-2xl overflow-x-auto no-scrollbar border border-stone-300/60 ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                isActive
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-300/80 text-stone-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div
        id={id}
        role="tablist"
        className={`flex items-center gap-6 border-b border-stone-200 overflow-x-auto no-scrollbar ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 pb-3.5 pt-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                isActive
                  ? 'border-emerald-800 text-emerald-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: pills
  return (
    <div
      id={id}
      role="tablist"
      className={`flex items-center gap-2 overflow-x-auto no-scrollbar p-1 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-700 ${
              isActive
                ? 'bg-emerald-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
            } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-amber-400 text-emerald-950' : 'bg-stone-200 text-stone-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
