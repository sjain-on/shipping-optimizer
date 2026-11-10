import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { page?: string; entityType?: string; entityId?: string; consolidationId?: string };
}) {
  const page = parseInt(searchParams.page || '1');
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (searchParams.entityType) where.entityType = searchParams.entityType;
  if (searchParams.entityId) where.entityId = searchParams.entityId;
  if (searchParams.consolidationId) where.consolidationId = searchParams.consolidationId;

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Audit Logs</h1>
      <table className="min-w-full bg-white border border-zinc-200">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Timestamp</th>
            <th className="py-2 px-4 border-b">Entity</th>
            <th className="py-2 px-4 border-b">Action</th>
            <th className="py-2 px-4 border-b">Diff</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log: { id: string; createdAt: Date; entityType: string; entityId: string; action: string; diff: string | null }) => (
            <tr key={log.id}>
              <td className="py-2 px-4 border-b">{log.createdAt.toLocaleString()}</td>
              <td className="py-2 px-4 border-b">{log.entityType} ({log.entityId})</td>
              <td className="py-2 px-4 border-b">{log.action}</td>
              <td className="py-2 px-4 border-b text-xs font-mono">
                <details>
                  <summary>View Diff</summary>
                  {log.diff}
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex gap-2">
        {page > 1 && (
          <a
            href={`/audit-logs?page=${page - 1}`}
            className="px-4 py-2 border rounded"
          >
            Previous
          </a>
        )}
        <span className="px-4 py-2">
          Page {page} of {totalPages}
        </span>
        {page < totalPages && (
          <a
            href={`/audit-logs?page=${page + 1}`}
            className="px-4 py-2 border rounded"
          >
            Next
          </a>
        )}
      </div>
    </div>
  );
}
