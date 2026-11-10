export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-8 bg-zinc-50 dark:bg-black">
      <main className="max-w-4xl w-full bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-3xl font-bold mb-4">Shipping Combinator</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          Manage and consolidate Shopify orders for efficient shipping.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h2 className="font-semibold mb-2">Orders</h2>
            <p className="text-sm text-zinc-500 mb-4">View and sync incoming orders from Shopify.</p>
            <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              View Orders →
            </button>
          </div>

          <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h2 className="font-semibold mb-2">Consolidations</h2>
            <p className="text-sm text-zinc-500 mb-4">Review and approve order consolidations.</p>
            <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Review Pending →
            </button>
          </div>

          <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h2 className="font-semibold mb-2">Shipments</h2>
            <p className="text-sm text-zinc-500 mb-4">Track shipments and AWB sync status.</p>
            <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Track Shipments →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
