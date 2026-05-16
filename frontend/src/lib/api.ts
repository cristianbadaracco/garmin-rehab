import type {
  Activity,
  AIInsight,
  DailyMetrics,
  Injury,
  PainLog,
  RecoveryProgress,
  Session,
} from "../types/index";

const API_BASE = "/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("garmin_rehab_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("garmin_rehab_token");
      window.location.href = "/login";
    }
    throw new ApiError(res.status, await res.text());
  }

  return res.json();
}

export const api = {
  // Garmin
  garmin: {
    sync: () => request<{ status: string }>("/garmin/sync", { method: "POST" }),
    backfill: (days: number) =>
      request<{ job_id: string; total: number; status: string }>(
        "/garmin/backfill",
        { method: "POST", body: JSON.stringify({ days }) },
      ),
    backfillStatus: (jobId: string) =>
      request<{ job_id: string; done: number; total: number; pct: number; status: string; error: string | null }>(
        `/garmin/backfill/${jobId}`,
      ),
    getMetrics: (startDate: string, endDate: string) =>
      request<DailyMetrics[]>(`/garmin/metrics?start_date=${startDate}&end_date=${endDate}`),
    getActivities: (startDate: string, endDate: string, limit = 10, offset = 0) =>
      request<Activity[]>(
        `/garmin/activities?start_date=${startDate}&end_date=${endDate}&limit=${limit}&offset=${offset}`,
      ),
  },

  // Medical
  medical: {
    createInjury: (data: unknown) =>
      request<Injury>("/medical/injuries", { method: "POST", body: JSON.stringify(data) }),
    getInjuries: (activeOnly = true) =>
      request<Injury[]>(`/medical/injuries?active_only=${activeOnly}`),
    updatePhase: (injuryId: string, data: unknown) =>
      request<Injury>(`/medical/injuries/${injuryId}/phase`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    createPainLog: (data: unknown) =>
      request<PainLog>("/medical/pain-logs", { method: "POST", body: JSON.stringify(data) }),
    getPainLogs: (startDate: string, endDate: string, injuryId?: string) => {
      let url = `/medical/pain-logs?start_date=${startDate}&end_date=${endDate}`;
      if (injuryId) url += `&injury_id=${injuryId}`;
      return request<PainLog[]>(url);
    },
  },

  // Sessions
  sessions: {
    create: (data: unknown) =>
      request<Session>("/sessions/", { method: "POST", body: JSON.stringify(data) }),
    list: (startDate: string, endDate: string) =>
      request<Session[]>(`/sessions/?start_date=${startDate}&end_date=${endDate}`),
  },

  // Analysis
  analysis: {
    getInsights: (startDate: string, endDate: string) =>
      request<AIInsight[]>(`/analysis/insights?start_date=${startDate}&end_date=${endDate}`),
    generateDaily: () =>
      request<{ status: string }>("/analysis/generate-daily", { method: "POST" }),
    getRecoveryProgress: () => request<RecoveryProgress>("/analysis/recovery-progress"),
  },
};
