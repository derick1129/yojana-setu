import { useEffect, useState } from "react";
import type { UserProfile } from "../types";
import { INDIAN_STATES } from "../lib/constants";
import { getProfile } from "../lib/storage";

interface ProfileFormProps {
  onSubmit: (profile: UserProfile) => void;
  loading?: boolean;
}

const defaultProfile: UserProfile = {
  name: "",
  age: 30,
  gender: "male",
  state: "Madhya Pradesh",
  occupation: "farmer",
  annualIncome: 80000,
  casteCategory: "SC",
  landOwnership: true,
  isBPL: true,
  familySize: 4,
  hasGirlChild: false,
  isPregnant: false,
};

export default function ProfileForm({ onSubmit, loading }: ProfileFormProps) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = getProfile();
    if (saved) setProfile(saved);
  }, []);

  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!profile.name.trim()) next.name = "Full name is required";
    if (!profile.age || profile.age < 1 || profile.age > 120) next.age = "Enter a valid age";
    if (!profile.state) next.state = "Select your state";
    if (profile.annualIncome < 0) next.annualIncome = "Income cannot be negative";
    if (profile.familySize < 1) next.familySize = "Family size must be at least 1";
    if (profile.hasGirlChild && profile.girlChildAge !== undefined) {
      if (profile.girlChildAge < 0 || profile.girlChildAge > 10) {
        next.girlChildAge = "Girl child age must be 0–10 for Sukanya Samriddhi";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(profile);
  };

  const fieldClass = (key: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/50 ${
      errors[key] ? "border-red-500" : "border-gray-300"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-r from-saffron/10 to-india-green/10 rounded-xl p-4 border border-orange-100">
        <h2 className="text-lg font-semibold text-gray-900">Your Profile (आपकी प्रोफ़ाइल)</h2>
        <p className="text-sm text-gray-600 mt-1">
          Tell us about yourself to discover eligible government schemes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Full Name (पूरा नाम)</label>
          <input
            className={fieldClass("name")}
            value={profile.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Ram Kumar Singh"
          />
          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Age (आयु)</label>
          <input
            type="number"
            className={fieldClass("age")}
            value={profile.age}
            onChange={(e) => set("age", Number(e.target.value))}
          />
          {errors.age && <p className="text-red-600 text-xs mt-1">{errors.age}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Gender (लिंग)</label>
          <div className="flex gap-4">
            {(["male", "female", "other"] as const).map((g) => (
              <label key={g} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  checked={profile.gender === g}
                  onChange={() => set("gender", g)}
                  className="text-saffron focus:ring-saffron"
                />
                {g}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">State / UT (राज्य)</label>
          <select
            className={fieldClass("state")}
            value={profile.state}
            onChange={(e) => set("state", e.target.value)}
          >
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Occupation (व्यवसाय)</label>
          <select
            className={fieldClass("occupation")}
            value={profile.occupation}
            onChange={(e) => set("occupation", e.target.value as UserProfile["occupation"])}
          >
            <option value="farmer">Farmer</option>
            <option value="salaried">Salaried</option>
            <option value="business">Business</option>
            <option value="student">Student</option>
            <option value="unemployed">Unemployed</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Annual Income (वार्षिक आय) ₹</label>
          <input
            type="number"
            className={fieldClass("annualIncome")}
            value={profile.annualIncome}
            onChange={(e) => set("annualIncome", Number(e.target.value))}
          />
          {errors.annualIncome && (
            <p className="text-red-600 text-xs mt-1">{errors.annualIncome}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-2">Caste Category (जाति श्रेणी)</label>
          <div className="flex flex-wrap gap-4">
            {(["general", "OBC", "SC", "ST"] as const).map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="caste"
                  checked={profile.casteCategory === c}
                  onChange={() => set("casteCategory", c)}
                  className="text-saffron focus:ring-saffron"
                />
                {c === "general" ? "General" : c}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Family Size (परिवार का आकार)</label>
          <input
            type="number"
            className={fieldClass("familySize")}
            value={profile.familySize}
            onChange={(e) => set("familySize", Number(e.target.value))}
            min={1}
          />
        </div>

        <Toggle
          label="Land Ownership (ज़मीन)"
          checked={profile.landOwnership}
          onChange={(v) => set("landOwnership", v)}
        />
        <Toggle
          label="BPL Card Holder (बीपीएल)"
          checked={profile.isBPL}
          onChange={(v) => set("isBPL", v)}
        />
        <Toggle
          label="Has Girl Child (बेटी)"
          checked={profile.hasGirlChild}
          onChange={(v) => {
            set("hasGirlChild", v);
            if (!v) set("girlChildAge", undefined);
          }}
        />
        {profile.hasGirlChild && (
          <div>
            <label className="block text-sm font-medium mb-1">Girl Child Age</label>
            <input
              type="number"
              className={fieldClass("girlChildAge")}
              value={profile.girlChildAge ?? ""}
              onChange={(e) =>
                set("girlChildAge", e.target.value ? Number(e.target.value) : undefined)
              }
              min={0}
              max={10}
            />
            {errors.girlChildAge && (
              <p className="text-red-600 text-xs mt-1">{errors.girlChildAge}</p>
            )}
          </div>
        )}
        {profile.gender === "female" && (
          <Toggle
            label="Pregnant (गर्भवती)"
            checked={!!profile.isPregnant}
            onChange={(v) => set("isPregnant", v)}
          />
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-8 py-3 rounded-lg bg-saffron hover:bg-orange-500 text-white font-semibold disabled:opacity-60 transition-colors"
      >
        {loading ? "Checking eligibility…" : "Find Eligible Schemes →"}
      </button>
    </form>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-white cursor-pointer">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-india-green" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}
