import React from 'react';

interface Order {
  id: string;
  externalOrderId: string;
  customerName: string;
  status: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  createdAt: string;
}

interface OrdersTableProps {
  orders: Order[];
  onReingest?: (orderId: string) => void;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({ orders, onReingest }) => {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sync</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {orders.map((order) => (
          <tr key={order.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.externalOrderId}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customerName}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.status}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                order.syncStatus === 'SYNCED' ? 'bg-green-100 text-green-800' :
                order.syncStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {order.syncStatus}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
              {onReingest && (
                <button
                  onClick={() => onReingest(order.id)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  Re-ingest
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
