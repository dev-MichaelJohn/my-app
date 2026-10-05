import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnalyticsAPI } from "@/features/analytics/api/analytics.api";
import { toQuery } from "@/lib/query.lib";
import { io, type Socket } from "socket.io-client";
import type { DashboardOverviewStats, LiveEvaluationPulseEvent } from "@my-app/shared";

export const analyticsApi = new AnalyticsAPI();

export const DASHBOARD_KEYS = {
  overview: ["dashboard", "overview"] as const,
};

export const useDashboardOverview = () => {
  return useQuery<DashboardOverviewStats>({
    queryKey: DASHBOARD_KEYS.overview,
    queryFn: () => toQuery(analyticsApi.getDashboardOverview()),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
};

const mergePulses = (...pulseGroups: LiveEvaluationPulseEvent[][]): LiveEvaluationPulseEvent[] => {
  const deduped = new Map<string, LiveEvaluationPulseEvent>();

  for (const group of pulseGroups) {
    for (const pulse of group) {
      if (!deduped.has(pulse.id)) {
        deduped.set(pulse.id, pulse);
      }
    }
  }

  return [...deduped.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
};

export function useLiveEvaluationPulse(initialPulses: LiveEvaluationPulseEvent[] = []) {
  const [livePulses, setLivePulses] = useState<LiveEvaluationPulseEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const initialPulsesRef = useRef(initialPulses);
  useEffect(() => {
    initialPulsesRef.current = initialPulses;
  }, [initialPulses]);

  const pulses = useMemo(
    () => mergePulses(initialPulses, livePulses).slice(0, 25),
    [initialPulses, livePulses],
  );

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
    let socketBaseUrl = "http://localhost:5000";
    try {
      socketBaseUrl = new URL(apiUrl).origin;
    } catch {
      // Fallback
    }

    const socket: Socket = io(socketBaseUrl, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("evaluation:pulse", (event: LiveEvaluationPulseEvent) => {
      setLivePulses((prev) => {
        const existingIds = new Set([...initialPulsesRef.current, ...prev].map((p) => p.id));
        if (existingIds.has(event.id)) return prev;
        return [event, ...prev].slice(0, 25);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return pulses;
}
