import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter-tight';
import '@fontsource/bebas-neue';
import './base.css';

// Separate bundles: visitors never download the admin, and the admin skips the site's animation code.
const SiteApp = lazy(() => import('./site/SiteApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="*" element={<SiteApp />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
