import axios from "axios";
import type {
  UserProfile,
  EligibilityResult,
  DocumentUploadResult,
  Application,
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export const checkEligibility = async (profile: UserProfile): Promise<EligibilityResult> => {
  const { data } = await api.post<EligibilityResult>("/api/eligibility", profile);
  return data;
};

export const uploadDocument = async (
  file: File,
  schemeId: string,
  documentType: string,
  userProfile: UserProfile
): Promise<DocumentUploadResult> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("schemeId", schemeId);
  formData.append("documentType", documentType);
  formData.append("userProfile", JSON.stringify(userProfile));
  const { data } = await api.post<DocumentUploadResult>("/api/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const getApplications = async (): Promise<Application[]> => {
  const { data } = await api.get<Application[]>("/api/applications");
  return data;
};

export const createApplication = async (payload: {
  schemeId: string;
  schemeName: string;
  schemeCategory: string;
  userName: string;
  userProfile: UserProfile;
  documents: string[];
}): Promise<Application> => {
  const { data } = await api.post<Application>("/api/applications", payload);
  return data;
};

export const advanceStatus = async (id: string): Promise<Application> => {
  const { data } = await api.patch<Application>(`/api/applications/${id}/advance`);
  return data;
};
