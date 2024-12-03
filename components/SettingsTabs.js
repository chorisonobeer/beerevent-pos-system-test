// /components/SettingsTabs.js

import Link from 'next/link';

export default function SettingsTabs({ currentPath }) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-10">
      <div className="max-w-sm mx-auto flex">
        <Link
          href="/settings/event"
          className={`flex-1 py-4 text-center text-sm font-medium ${
            currentPath === '/settings/event' 
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          イベント設定
        </Link>
        <Link
          href="/settings/products"
          className={`flex-1 py-4 text-center text-sm font-medium ${
            currentPath === '/settings/products'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          商品設定
        </Link>
      </div>
    </div>
  );
}