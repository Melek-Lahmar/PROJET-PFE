import { axiosClient } from "../../../../core/http/axiosClient";
import { endpoints } from "../../../../core/http/endpoints";

export type ChatbotSessionListItem = {
  id: string;
  userId: string;
  language: string;
  startedAt: string;
  lastActivityAt: string;
  messageCount: number;
};

export type ChatbotMessage = {
  id: number;
  sessionId: string;
  role: "user" | "assistant" | "system" | string;
  content: string;
  action?: string | null;
  dataJson?: string | null;
  feedback?: "up" | "down" | null;
  createdAt: string;
};

export type ChatbotInsight = {
  id: number;
  type: string;
  severity: "info" | "warning" | "critical" | string;
  title: string;
  message: string;
  payloadJson?: string | null;
  createdAt: string;
  shownToAdminAt?: string | null;
};

export type ChatbotStats = {
  totalSessions: number;
  totalMessages: number;
  sessions24h: number;
  feedbackUp: number;
  feedbackDown: number;
  byAction: { action: string; count: number }[];
};

export type SandboxResponse = {
  success: boolean;
  action: string;
  message: string;
  data?: unknown;
  intent?: string;
  confidence?: number;
};

export async function listSessions(limit = 50): Promise<ChatbotSessionListItem[]> {
  const { data } = await axiosClient.get(endpoints.adminChatbotSessions, { params: { limit } });
  return Array.isArray(data) ? data : [];
}

export async function getSessionMessages(id: string): Promise<ChatbotMessage[]> {
  const { data } = await axiosClient.get(endpoints.adminChatbotSessionMessages(id));
  return Array.isArray(data) ? data : [];
}

export async function listInsights(limit = 100): Promise<ChatbotInsight[]> {
  const { data } = await axiosClient.get(endpoints.adminChatbotInsights, { params: { limit } });
  return Array.isArray(data) ? data : [];
}

export async function getStats(): Promise<ChatbotStats> {
  const { data } = await axiosClient.get(endpoints.adminChatbotStats);
  return data;
}

export async function sandboxAsk(message: string, language: "fr" | "en" | "ar"): Promise<SandboxResponse> {
  const { data } = await axiosClient.post(endpoints.adminChatbotSandbox, { message, language });
  return data;
}
