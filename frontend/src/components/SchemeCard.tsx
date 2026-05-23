import { useNavigate } from "react-router-dom";
import type { Scheme } from "../types";
import { BENEFIT_TYPE_LABELS, CATEGORY_COLORS } from "../lib/constants";

interface SchemeCardProps {
  scheme: Scheme;
}

export default function SchemeCard({ scheme }: SchemeCardProps) {
  const navigate = useNavigate();
  const categoryClass = CATEGORY_COLORS[scheme.category] ?? "bg-gray-100 text-gray-800";

  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 flex-1">
        <div className="flex flex-wrap items-start gap-2 mb-2">
          <h3 className="font-bold text-lg text-gray-900 flex-1">{scheme.name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryClass}`}>
            {scheme.category}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-2">{scheme.fullName}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-lg font-bold text-india-green">
            ₹{scheme.benefitAmount.toLocaleString("en-IN")}
          </span>
          <span className="text-xs font-medium px-2 py-1 rounded bg-saffron/15 text-orange-800">
            {BENEFIT_TYPE_LABELS[scheme.benefitType] ?? scheme.benefitType}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{scheme.description}</p>
        <p className="text-xs text-gray-500 mb-2">Required documents:</p>
        <ul className="text-sm text-gray-700 list-disc list-inside space-y-0.5">
          {scheme.requiredDocuments.map((doc) => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
      </div>
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => navigate(`/apply?schemeId=${scheme.id}`)}
          className="w-full py-2.5 rounded-lg bg-india-green hover:bg-green-700 text-white font-medium text-sm transition-colors"
        >
          Apply Now →
        </button>
      </div>
    </article>
  );
}
