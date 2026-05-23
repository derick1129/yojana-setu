import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileForm from "../components/ProfileForm";
import { checkEligibility } from "../lib/api";
import { saveEligibility, saveProfile } from "../lib/storage";
import type { UserProfile } from "../types";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (profile: UserProfile) => {
    setLoading(true);
    setError(null);
    try {
      saveProfile(profile);
      const result = await checkEligibility(profile);
      saveEligibility(result);
      navigate("/schemes");
    } catch {
      setError("Could not check eligibility. Is the backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <section className="mb-8 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Discover Government Schemes
        </h2>
        <p className="text-gray-600 mt-2 max-w-xl">
          Yojana Setu bridges citizens to welfare schemes — check eligibility, upload documents
          with AI validation, and track applications in one place.
        </p>
      </section>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <ProfileForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
