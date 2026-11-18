// Shared by server and browser code (no server-only imports here).
export type SpiceLevel = "mild" | "medium" | "hot" | "extra_hot";

export const SPICE_LABELS: Record<SpiceLevel, string> = {
  mild: "Mild",
  medium: "Medium",
  hot: "Hot",
  extra_hot: "Extra hot",
};
