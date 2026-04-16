import type { RawUser, AnalysisResult } from "./types";

export const RAW_USERS_KEY = "creatorgraph_raw_users";
export const ANALYSIS_KEY = "creatorgraph_analysis";
export const PHASE_KEY = "creatorgraph_phase";

export async function saveRawUsers(users: RawUser[]): Promise<void> {
  await chrome.storage.local.set({ [RAW_USERS_KEY]: users });
}

export async function loadRawUsers(): Promise<RawUser[]> {
  const data = await chrome.storage.local.get(RAW_USERS_KEY);
  return (data[RAW_USERS_KEY] as RawUser[]) || [];
}

export async function saveAnalysis(result: AnalysisResult): Promise<void> {
  await chrome.storage.local.set({ [ANALYSIS_KEY]: result });
}

export async function loadAnalysis(): Promise<AnalysisResult | null> {
  const data = await chrome.storage.local.get(ANALYSIS_KEY);
  return (data[ANALYSIS_KEY] as AnalysisResult) || null;
}

export async function savePhase(phase: { phase: string; message: string }): Promise<void> {
  await chrome.storage.local.set({ [PHASE_KEY]: phase });
}

export async function loadPhase(): Promise<{ phase: string; message: string } | null> {
  const data = await chrome.storage.local.get(PHASE_KEY);
  return (data[PHASE_KEY] as { phase: string; message: string }) || null;
}
