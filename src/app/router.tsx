import { createBrowserRouter, type RouteObject } from 'react-router';
import { ShopLayout } from '@/components/layout/ShopLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthGate } from './AuthGate';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

/** Loads a page's code only when the route is first visited. */
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T): RouteObject['lazy'] =>
  async () => ({ Component: (await load())[name] as React.ComponentType });

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <AuthGate />,
        children: [
          {
            element: <ShopLayout />,
            children: [
              { index: true, lazy: page(() => import('@/features/today/pages/TodayPage'), 'TodayPage') },
              { path: 'pos', lazy: page(() => import('@/features/pos/pages/PosPage'), 'PosPage') },
              { path: 'sales', lazy: page(() => import('@/features/sales/pages/SalesPage'), 'SalesPage') },
              { path: 'sales/:id', lazy: page(() => import('@/features/sales/pages/SaleDetailPage'), 'SaleDetailPage') },
              { path: 'stock', lazy: page(() => import('@/features/stock/pages/StockPage'), 'StockPage') },
              { path: 'receive', lazy: page(() => import('@/features/receive/pages/ReceivePage'), 'ReceivePage') },
              { path: 'closing', lazy: page(() => import('@/features/closing/pages/ClosingPage'), 'ClosingPage') },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
