/**
 * Client-side data hooks for pages that use "use client".
 * These hooks fetch data from the data source on mount.
 */

import { useState, useEffect } from "react";
import { USE_API_DATA } from "@/lib/api/api-client";
import { api } from "@/lib/api/api-client";
import { mapApiDailyBriefToViewModel, mapApiSettingsToViewModel } from "@/server/finance/mappers";
import type { DailyBrief as BriefViewModel } from "@/types/brief";
import type { AppearanceSettings, WeChatPushSettings, ReturnMethodSettings } from "@/types/settings";

// ── Mock imports for fallback ──
import { mockBrief } from "@/data/mock-brief";
import {
  mockAppearanceSettings as mockAppearance,
  mockWeChatPushSettings as mockPush,
  mockReturnMethodSettings as mockReturnMethod,
} from "@/data/mock-settings";

export function useBrief() {
  const [brief, setBrief] = useState<BriefViewModel>(mockBrief as unknown as BriefViewModel);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!USE_API_DATA) return;

    setLoading(true);
    api.dailyBrief()
      .then((data) => {
        const date = (data.date as string)?.substring(0, 10) || new Date().toISOString().substring(0, 10);
        setBrief(mapApiDailyBriefToViewModel(data as unknown as Record<string, unknown>, date));
      })
      .catch(() => {
        // fallback to mock
      })
      .finally(() => setLoading(false));
  }, []);

  return { brief, loading };
}

export function useSettings() {
  const [settings, setSettings] = useState({
    appearance: mockAppearance,
    pushSettings: mockPush,
    returnMethod: mockReturnMethod,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!USE_API_DATA) return;

    setLoading(true);
    api.settings()
      .then((data) => {
        setSettings(mapApiSettingsToViewModel(data as unknown as Record<string, unknown>));
      })
      .catch(() => {
        // fallback to mock
      })
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}
