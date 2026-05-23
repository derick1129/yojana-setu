import { useCallback, useRef, useState } from "react";
import type { DocumentUploadResult, UserProfile } from "../types";
import { uploadDocument } from "../lib/api";

export type UploadUIStatus =
  | "pending"
  | "uploading"
  | "validating"
  | "pass"
  | "fail"
  | "ocr_failed";

interface DocumentUploadProps {
  documentType: string;
  schemeId: string;
  userProfile: UserProfile;
  uploadId?: string;
  onStatusChange: (documentType: string, status: UploadUIStatus, uploadId?: string) => void;
  highlightMissing?: boolean;
}

const borderStyles: Record<UploadUIStatus, string> = {
  pending: "border-dashed border-gray-300 bg-gray-50",
  uploading: "border-blue-400 bg-blue-50 animate-pulse",
  validating: "border-yellow-400 bg-yellow-50",
  pass: "border-green-500 border-solid bg-green-50",
  fail: "border-red-500 border-solid bg-red-50",
  ocr_failed: "border-orange-400 border-solid bg-orange-50",
};

export default function DocumentUpload({
  documentType,
  schemeId,
  userProfile,
  onStatusChange,
  highlightMissing,
}: DocumentUploadProps) {
  const [status, setStatus] = useState<UploadUIStatus>("pending");
  const [result, setResult] = useState<DocumentUploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateStatus = (s: UploadUIStatus, uploadId?: string) => {
    setStatus(s);
    onStatusChange(documentType, s, uploadId);
  };

  const processFile = async (file: File) => {
    setResult(null);
    updateStatus("uploading");
    try {
      updateStatus("validating");
      const data = await uploadDocument(file, schemeId, documentType, userProfile);
      setResult(data);
      if (data.status === "ocr_failed") {
        updateStatus("ocr_failed", data.uploadId);
      } else if (data.status === "pass") {
        updateStatus("pass", data.uploadId);
      } else {
        updateStatus("fail", data.uploadId);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { status?: string; message?: string } } };
      if (ax.response?.data?.status === "ocr_failed") {
        updateStatus("ocr_failed");
      } else {
        updateStatus("fail");
        setResult({
          uploadId: "",
          documentType,
          schemeId,
          status: "fail",
          confidenceScore: 0,
          extractedFields: {},
          errors: [
            {
              field: "upload",
              message:
                (err as { response?: { data?: { error?: string; message?: string } } }).response
                  ?.data?.error ||
                (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
                "Upload failed. Please try again.",
              severity: "error",
            },
          ],
          warnings: [],
          ocrTextPreview: null,
        });
      }
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [schemeId, documentType, userProfile]
  );

  const hiddenExtractKeys = new Set([
    "analysisFailed",
    "documentTypeMatches",
    "readable",
  ]);
  const extractedEntries = result
    ? Object.entries(result.extractedFields).filter(
        ([k, v]) => !hiddenExtractKeys.has(k) && v != null && v !== "" && typeof v !== "boolean"
      )
    : [];

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-colors ${
        highlightMissing && status === "pending" ? "border-red-500 ring-2 ring-red-200" : borderStyles[status]
      } ${dragOver ? "ring-2 ring-saffron" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <h3 className="font-semibold text-gray-900 mb-2">{documentType}</h3>

      {status === "pending" && (
        <div
          className="text-center py-8 cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <p className="text-gray-600 text-sm mb-1">Upload document</p>
          <p className="text-xs text-gray-400">Click or drag JPEG, PNG, PDF (max 10 MB)</p>
        </div>
      )}

      {status === "uploading" && (
        <div className="text-center py-8 text-blue-700">
          <Spinner /> Uploading…
        </div>
      )}

      {status === "validating" && (
        <div className="text-center py-8 text-yellow-800">
          <Spinner /> Analyzing document with AI vision…
        </div>
      )}

      {status === "pass" && result && (
        <div>
          <div className="flex items-center gap-2 text-green-700 font-medium mb-3">
            <span className="text-xl">✓</span> Verified
          </div>
          {extractedEntries.length > 0 && (
            <dl className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {extractedEntries.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</dt>
                  <dd className="font-medium">{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
          <ConfidenceBar score={result.confidenceScore} />
          {result.warnings.length > 0 && (
            <ul className="mt-2 text-xs text-amber-800 space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i}>⚠ {w.message}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-3 text-xs text-gray-600 underline"
            onClick={() => {
              setResult(null);
              updateStatus("pending");
            }}
          >
            Re-upload
          </button>
        </div>
      )}

      {status === "fail" && result && (
        <div>
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <span className="text-xl">✕</span> Validation failed
          </div>
          <ul className="text-sm text-red-800 space-y-2 mb-3">
            {result.errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
          <button
            type="button"
            className="text-sm text-saffron font-medium underline"
            onClick={() => {
              setResult(null);
              updateStatus("pending");
            }}
          >
            Try again
          </button>
        </div>
      )}

      {status === "ocr_failed" && (
        <div className="text-center py-6 text-orange-800">
          <span className="text-3xl block mb-2">📷</span>
          <p className="font-medium">Photo too blurry — try again in good light</p>
          <button
            type="button"
            className="mt-3 text-sm underline"
            onClick={() => updateStatus("pending")}
          >
            Re-upload
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin align-middle mr-2" />
  );
}

function ConfidenceBar({ score }: { score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Confidence</span>
        <span>{score}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-india-green transition-all"
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}
