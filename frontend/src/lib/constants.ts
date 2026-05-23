export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const CATEGORY_COLORS: Record<string, string> = {
  Agriculture: "bg-green-100 text-green-800",
  Health: "bg-red-100 text-red-800",
  Housing: "bg-blue-100 text-blue-800",
  Employment: "bg-purple-100 text-purple-800",
  Energy: "bg-orange-100 text-orange-800",
  Education: "bg-indigo-100 text-indigo-800",
  Savings: "bg-pink-100 text-pink-800",
  Pension: "bg-teal-100 text-teal-800",
  Business: "bg-amber-100 text-amber-800",
  Insurance: "bg-cyan-100 text-cyan-800",
  "Women & Child": "bg-rose-100 text-rose-800",
};

export const BENEFIT_TYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  subsidy: "Subsidy",
  insurance: "Insurance",
  loan: "Loan",
  service: "Service",
};

export const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  document_verified: "Documents Verified",
  approved: "Approved",
  disbursed: "Disbursed",
};

export const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-gray-200 text-gray-800",
  under_review: "bg-blue-100 text-blue-800",
  document_verified: "bg-amber-100 text-amber-900",
  approved: "bg-green-100 text-green-800",
  disbursed: "bg-emerald-100 text-emerald-900",
};

export const KANBAN_COLUMNS = [
  "submitted",
  "under_review",
  "document_verified",
  "approved",
  "disbursed",
] as const;
