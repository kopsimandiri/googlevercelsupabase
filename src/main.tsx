import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { validateEnvironment } from './lib/supabase';
import './supabaseTest';

const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

try {
  validateEnvironment();

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  console.error('Environment validation error:', error);

  root.render(
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 text-center shadow-lg border border-stone-200 space-y-3">
        <h2 className="text-lg font-bold text-stone-900">
          Konfigurasi Server Belum Lengkap
        </h2>

        <p className="text-xs text-stone-600 leading-relaxed">
          Konfigurasi server belum lengkap, hubungi administrator.
        </p>
      </div>
    </div>
  );
}