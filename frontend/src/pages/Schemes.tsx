import { Link } from "react-router-dom";
import SchemeCard from "../components/SchemeCard";
import { getEligibility } from "../lib/storage";

export default function Schemes() {
  const result = getEligibility();

  if (!result) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No eligibility results yet.</p>
        <Link
          to="/"
          className="inline-block px-6 py-2 rounded-lg bg-saffron text-white font-medium"
        >
          Fill your profile →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-india-green text-white rounded-xl p-4 sm:p-6 mb-6">
        <p className="text-lg font-semibold">
          {result.totalMatched} scheme{result.totalMatched !== 1 ? "s" : ""} matched for{" "}
          {result.profileSummary}
        </p>
      </div>

      <div className="bg-amber-50 border-2 border-saffron rounded-xl p-4 sm:p-6 mb-8">
        <h2 className="font-bold text-gray-900 mb-2">
          Master document checklist — gather these {result.requiredDocuments.length} documents
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Apply to all matched schemes with one set of documents:
        </p>
        <ul className="grid sm:grid-cols-2 gap-1 text-sm">
          {result.requiredDocuments.map((doc) => (
            <li key={doc} className="flex items-start gap-2">
              <span className="text-saffron">•</span>
              {doc}
            </li>
          ))}
        </ul>
      </div>

      {result.matchedSchemes.length === 0 ? (
        <p className="text-gray-600">No schemes matched your profile. Try adjusting income or occupation.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {result.matchedSchemes.map((scheme) => (
            <SchemeCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      )}
    </div>
  );
}
