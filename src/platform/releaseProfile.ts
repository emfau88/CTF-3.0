import type { UiLanguage } from "../uiLocale";

export type ReleaseTarget = "standalone" | "portal";
export type ReleaseStartFlow = "main-menu" | "qualifier";
export type ReleaseDevice = "desktop" | "mobile";

export interface ReleaseFeatureFlags {
  readonly qualifier: boolean;
  readonly quickStart: boolean;
  readonly customMatch: boolean;
  readonly league: boolean;
  readonly recruitment: boolean;
  readonly mobileExperimental: boolean;
}

export interface ReleaseProfile {
  readonly id: string;
  readonly target: ReleaseTarget;
  readonly portalId: string | null;
  readonly supportedDevices: readonly ReleaseDevice[];
  readonly startFlow: ReleaseStartFlow;
  readonly qualifierEnabled: boolean;
  readonly supportedLanguages: readonly UiLanguage[];
  readonly defaultLanguage: UiLanguage;
  readonly features: ReleaseFeatureFlags;
}

export const STANDALONE_RELEASE_PROFILE: ReleaseProfile = {
  id: "core-arena-standalone-v1",
  target: "standalone",
  portalId: null,
  supportedDevices: ["desktop"],
  startFlow: "qualifier",
  qualifierEnabled: true,
  supportedLanguages: ["de", "en"],
  defaultLanguage: "en",
  features: {
    qualifier: true,
    quickStart: true,
    customMatch: true,
    league: true,
    recruitment: true,
    mobileExperimental: true,
  },
};

export function validateReleaseProfile(profile: ReleaseProfile): readonly string[] {
  const issues: string[] = [];
  if (!profile.id.trim()) issues.push("Release profile id must not be empty.");
  if (profile.target === "portal" && !profile.portalId) {
    issues.push("Portal release profiles require a portal id.");
  }
  if (profile.target === "standalone" && profile.portalId !== null) {
    issues.push("Standalone release profiles must not declare a portal id.");
  }
  if (profile.supportedDevices.length === 0) {
    issues.push("At least one supported device is required.");
  }
  if (!profile.supportedLanguages.includes(profile.defaultLanguage)) {
    issues.push("The default language must be supported.");
  }
  if (profile.qualifierEnabled !== profile.features.qualifier) {
    issues.push("Qualifier availability must match the qualifier feature flag.");
  }
  if (profile.startFlow === "qualifier" && !profile.qualifierEnabled) {
    issues.push("A qualifier start flow requires the qualifier feature.");
  }
  return issues;
}
