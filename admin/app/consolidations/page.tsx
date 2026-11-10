'use client';

import { useState, useEffect } from 'react';

interface OrderLink {
  id: string;
  shopifyOrderId: string;
  shopifyOrderName: string;
  customerId: string;
  addressHash: string;
  createdAt: string;
}

interface Consolidation {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'SHIPMENT_CREATED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  orderLinks: OrderLink[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ConsolidationsPage() {
  const [consolidations, setConsolidations] = useState<Consolidation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConsolidation, setSelectedConsolidation] = useState<Consolidation | null>(null);

  const fetchConsolidations = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/consolidations?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch consolidations');
      }

      const data = await response.json();
      setConsolidations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConsolidations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (consolidationId: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/consolidations/${consolidationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve consolidation');
      }

      fetchConsolidations(pagination.page);
      alert('Consolidation approved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async (consolidationId: string) => {
    if (!confirm('Are you sure you want to reject this consolidation?')) return;

    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/consolidations/${consolidationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject consolidation');
      }

      fetchConsolidations(pagination.page);
      alert('Consolidation rejected successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleViewDetails = (consolidation: Consolidation) => {
    setSelectedConsolidation(consolidation);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'SHIPMENT_CREATED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchConsolidations(1);
  }, []);

  return (
    <div className="flex flex-col flex-1 p-8 bg-zinc-50 dark:bg-black">
      <h1 className="text-2xl font-bold mb-6">Consolidations</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading consolidations...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200">
                  {consolidations.map((consolidation) => (
                    <tr key={consolidation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-mono">
                        {consolidation.id.slice(0, 12)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(consolidation.status)}`}>
                          {consolidation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {consolidation.orderLinks.length} orders
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(consolidation.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(consolidation)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </button>
                          {consolidation.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(consolidation.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(consolidation.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {consolidations.length === 0 && (
              <div className="p-8 text-center text-zinc-500">
                No consolidations found
              </div>
            )}
          </>
        )}
      </div>

      {/* Consolidation Detail Modal */}
      {selectedConsolidation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <h2 className="text-xl font-bold">Consolidation Details</h2>
              <button
                onClick={() => setSelectedConsolidation(null)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-4">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedConsolidation.status)}`}>
                    {selectedConsolidation.status}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    ID: {selectedConsolidation.id}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Created: {new Date(selectedConsolidation.createdAt).toLocaleString()}
                </p>
              </div>

              <h3 className="text-lg font-semibold mb-3">Orders in this Consolidation ({selectedConsolidation.orderLinks.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                  <thead className="bg-zinc-50 dark:bg-zinc-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Shopify Order ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Order Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Address Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {selectedConsolidation.orderLinks.map((link) => (
                      <tr key={link.id}>
                        <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono">{link.shopifyOrderId}</td>
                        <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100">{link.shopifyOrderName}</td>
                        <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100">{link.customerId}</td>
                        <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">{link.addressHash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}