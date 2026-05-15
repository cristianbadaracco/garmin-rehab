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
    getMetrics: (startDate: string, endDate: string) =>
      request<unknown[]>(`/garmin/metrics?start_date=${startDate}&end_date=${endDate}`),
    getActivities: (startDate: string, endDate: string) =>
      request<unknown[]>(`/garmin/activities?start_date=${startDate}&end_date=${endDate}`),
  },

  // Medical
  medical: {
    createInjury: (data: unknown) =>
      request<unknown>("/medical/injuries", { method: "POST", body: JSON.stringify(data) }),
    getInjuries: (activeOnly = true) =>
      request<unknown[]>(`/medical/injuries?active_only=${activeOnly}`),
    updatePhase: (injuryId: string, data: unknown) =>
      request<unknown>(`/medical/injuries/${injuryId}/phase`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    createPainLog: (data: unknown) =>
      request<unknown>("/medical/pain-logs", { method: "POST", body: JSON.stringify(data) }),
    getPainLogs: (startDate: string, endDate: string, injuryId?: string) => {
      let url = `/medical/pain-logs?start_date=${startDate}&end_date=${endDate}`;
      if (injuryId) url += `&injury_id=${injuryId}`;
      return request<unknown[]>(url);
    },
  },

  // Sessions
  sessions: {
    create: (data: unknown) =>
      request<unknown>("/sessions/", { method: "POST", body: JSON.stringify(data) }),
    list: (startDate: string, endDate: string) =>
      request<unknown[]>(`/sessions/?start_date=${startDate}&end_date=${endDate}`),
  },

  // Analysis
  analysis: {
    getInsights: (startDate: string, endDate: string) =>
      request<unknown[]>(`/analysis/insights?start_date=${startDate}&end_date=${endDate}`),
    generateDaily: () =>
      request<{ status: string }>("/analysis/generate-daily", { method: "POST" }),
    getRecoveryProgress: () => request<unknown>("/analysis/recovery-progress"),
  },
};
