import { useCallback, useEffect, useState } from "react";
import TrackingBoard from "../components/TrackingBoard";
import { getApplications } from "../lib/api";
import type { Application } from "../types";

export default function Track() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApplications();
      setApplications(
        data.map((a) => ({
          ...a,
          submittedAt:
            typeof a.submittedAt === "string"
              ? a.submittedAt
              : new Date(a.submittedAt as unknown as string).toISOString(),
          statusHistory: (a.statusHistory || []) as Application["statusHistory"],
          documents: (a.documents || []) as string[],
        }))
      );
    } catch {
      setError("Could not load applications. Ensure backend and Neon DB are configured.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Application Tracking</h2>
          <p className="text-sm text-gray-600 mt-1">
            Kanban board — advance status for demo (Submitted → Disbursed)
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-center py-12">Loading applications…</p>
      ) : (
        <TrackingBoard applications={applications} onRefresh={load} />
      )}
    </div>
  );
}
