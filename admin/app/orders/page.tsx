'use client';

import { useState, useEffect } from 'react';
import { OrdersTable } from '../../src/components/OrdersTable';

interface Order {
  id: string;
  externalOrderId: string;
  customerName: string;
  status: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  createdAt: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: any;
  items: any;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/orders?page=${page}&limit=50`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const handleReingest = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/orders/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to queue re-ingest');
      }

      const data = await response.json();
      alert(`Ingestion job queued: ${data.idempotencyKey}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue re-ingest');
    }
  };

  return (
    <div className="flex flex-col flex-1 p-8 bg-zinc-50 dark:bg-black">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <button
          onClick={handleReingest}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Re-ingest Orders
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading orders...</div>
        ) : (
          <>
            <OrdersTable orders={orders} />
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Page {pagination.page} of {pagination.totalPages} — {pagination.total} orders
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchOrders(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchOrders(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}