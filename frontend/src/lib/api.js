const API_BASE = "/api";
class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
async function request(path, options) {
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
        sync: () => request("/garmin/sync", { method: "POST" }),
        getMetrics: (startDate, endDate) => request(`/garmin/metrics?start_date=${startDate}&end_date=${endDate}`),
        getActivities: (startDate, endDate) => request(`/garmin/activities?start_date=${startDate}&end_date=${endDate}`),
    },
    // Medical
    medical: {
        createInjury: (data) => request("/medical/injuries", { method: "POST", body: JSON.stringify(data) }),
        getInjuries: (activeOnly = true) => request(`/medical/injuries?active_only=${activeOnly}`),
        updatePhase: (injuryId, data) => request(`/medical/injuries/${injuryId}/phase`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),
        createPainLog: (data) => request("/medical/pain-logs", { method: "POST", body: JSON.stringify(data) }),
        getPainLogs: (startDate, endDate, injuryId) => {
            let url = `/medical/pain-logs?start_date=${startDate}&end_date=${endDate}`;
            if (injuryId)
                url += `&injury_id=${injuryId}`;
            return request(url);
        },
    },
    // Sessions
    sessions: {
        create: (data) => request("/sessions/", { method: "POST", body: JSON.stringify(data) }),
        list: (startDate, endDate) => request(`/sessions/?start_date=${startDate}&end_date=${endDate}`),
    },
    // Analysis
    analysis: {
        getInsights: (startDate, endDate) => request(`/analysis/insights?start_date=${startDate}&end_date=${endDate}`),
        generateDaily: () => request("/analysis/generate-daily", { method: "POST" }),
        getRecoveryProgress: () => request("/analysis/recovery-progress"),
    },
};
