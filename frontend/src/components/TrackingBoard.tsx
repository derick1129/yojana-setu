import { useState } from "react";
import type { Application, ApplicationStatus } from "../types";
import {
  CATEGORY_COLORS,
  KANBAN_COLUMNS,
  STATUS_BADGE,
  STATUS_LABELS,
} from "../lib/constants";
import { advanceStatus } from "../lib/api";

interface TrackingBoardProps {
  applications: Application[];
  onRefresh: () => void;
}

export default function TrackingBoard({ applications, onRefresh }: TrackingBoardProps) {
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const byStatus = (status: ApplicationStatus) =>
    applications.filter((a) => a.status === status);

  const handleAdvance = async (id: string) => {
    setAdvancingId(id);
    try {
      await advanceStatus(id);
      onRefresh();
    } finally {
      setAdvancingId(null);
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-[900px]">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col} className="flex-1 min-w-[160px]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 px-1">
              {STATUS_LABELS[col]}
            </h3>
            <div className="space-y-2 min-h-[120px] bg-gray-100/80 rounded-lg p-2">
              {byStatus(col).map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  expanded={expandingId === app.id}
                  onToggle={() => setExpandingId(expandingId === app.id ? null : app.id)}
                  onAdvance={() => handleAdvance(app.id)}
                  advancing={advancingId === app.id}
                />
              ))}
              {byStatus(col).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No applications</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationCard({
  app,
  expanded,
  onToggle,
  onAdvance,
  advancing,
}: {
  app: Application;
  expanded: boolean;
  onToggle: () => void;
  onAdvance: () => void;
  advancing: boolean;
}) {
  const categoryClass = CATEGORY_COLORS[app.schemeCategory] ?? "bg-gray-100 text-gray-800";
  const date = new Date(app.submittedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm text-sm">
      <button type="button" className="w-full text-left p-3" onClick={onToggle}>
        <p className="font-semibold text-gray-900 leading-tight">{app.schemeName}</p>
        <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${categoryClass}`}>
          {app.schemeCategory}
        </span>
        <p className="text-xs text-gray-500 mt-2">{date}</p>
        <span
          className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[app.status]}`}
        >
          {STATUS_LABELS[app.status]}
        </span>
      </button>
      <div className="px-3 pb-3">
        {app.status !== "disbursed" && (
          <button
            type="button"
            disabled={advancing}
            onClick={(e) => {
              e.stopPropagation();
              onAdvance();
            }}
            className="w-full text-xs py-1.5 rounded bg-saffron/90 hover:bg-saffron text-white font-medium disabled:opacity-50"
          >
            {advancing ? "…" : "Advance Status →"}
          </button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-3 py-3 text-xs space-y-3">
          <div>
            <p className="font-medium text-gray-700 mb-1">Status timeline</p>
            <ol className="space-y-1 border-l-2 border-gray-200 pl-3">
              {app.statusHistory.map((h, i) => (
                <li key={i}>
                  <span className="font-medium">{STATUS_LABELS[h.status as ApplicationStatus]}</span>
                  <span className="text-gray-500 block">
                    {new Date(h.changedAt).toLocaleString("en-IN")} — {h.note}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {app.documents.length > 0 && (
            <div>
              <p className="font-medium text-gray-700 mb-1">Documents uploaded</p>
              <ul className="list-disc list-inside text-gray-600">
                {app.documents.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
