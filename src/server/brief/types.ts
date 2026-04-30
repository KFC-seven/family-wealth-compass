import type { AiBriefInput } from "../ai/types";

export interface BriefContext extends AiBriefInput {}

export interface GenerateBriefOptions {
  date?: string;
  force?: boolean;
}
