import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DocumentUpload, { type UploadUIStatus } from "../components/DocumentUpload";
import { createApplication } from "../lib/api";
import { getEligibility, getProfile } from "../lib/storage";

export default function Apply() {
  const [searchParams] = useSearchParams();
  const schemeId = searchParams.get("schemeId");
  const navigate = useNavigate();
  const profile = getProfile();
  const eligibility = getEligibility();

  const scheme = useMemo(
    () => eligibility?.matchedSchemes.find((s) => s.id === schemeId),
    [eligibility, schemeId]
  );

  const [docStatuses, setDocStatuses] = useState<Record<string, UploadUIStatus>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!schemeId || !scheme) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Scheme not found. Check eligibility first.</p>
        <Link to="/schemes" className="text-saffron font-medium underline">
          ← Back to schemes
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Profile required.</p>
        <Link to="/" className="text-saffron font-medium underline">
          ← Fill profile
        </Link>
      </div>
    );
  }

  const allPassed = scheme.requiredDocuments.every((d) => docStatuses[d] === "pass");

  const handleStatusChange = (docType: string, status: UploadUIStatus) => {
    setDocStatuses((prev) => ({ ...prev, [docType]: status }));
  };

  const handleSubmit = async () => {
    if (!allPassed) {
      setShowMissing(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createApplication({
        schemeId: scheme.id,
        schemeName: scheme.name,
        schemeCategory: scheme.category,
        userName: profile.name,
        userProfile: profile,
        documents: scheme.requiredDocuments.filter((d) => docStatuses[d] === "pass"),
      });
      navigate("/track");
    } catch {
      setError("Failed to submit application. Check backend and database connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link to="/schemes" className="text-sm text-gray-600 hover:text-saffron mb-4 inline-block">
        ← Back to schemes
      </Link>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{scheme.name}</h2>
        <p className="text-gray-600 text-sm mt-1">{scheme.fullName}</p>
        <p className="text-sm text-gray-500 mt-2">
          Upload each required document. AI will OCR and validate against your profile.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {scheme.requiredDocuments.map((doc) => (
          <DocumentUpload
            key={doc}
            documentType={doc}
            schemeId={scheme.id}
            userProfile={profile}
            onStatusChange={handleStatusChange}
            highlightMissing={showMissing && docStatuses[doc] !== "pass"}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className={`w-full sm:w-auto px-8 py-3 rounded-lg font-semibold transition-colors ${
          allPassed
            ? "bg-india-green hover:bg-green-700 text-white"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
      >
        {submitting ? "Submitting…" : "Submit Application"}
      </button>
      {!allPassed && (
        <p className="text-sm text-gray-500 mt-2">
          All documents must pass validation before submitting.
        </p>
      )}
    </div>
  );
}
