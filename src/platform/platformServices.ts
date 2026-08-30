import type { AnalyticsPort } from "./productEvents";
import type { ReleaseProfile } from "./releaseProfile";

export interface SavePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PlatformSdkPort {
  initialize(): Promise<void>;
  gameplayStart(): void;
  gameplayStop(): void;
}

export interface PlatformLifecycleState {
  readonly focused: boolean;
  readonly visible: boolean;
  readonly shouldPause: boolean;
}

export interface PlatformLifecyclePort {
  read(): PlatformLifecycleState;
  subscribe(listener: (state: PlatformLifecycleState) => void): () => void;
  dispose(): void;
}

export interface AdsPort {
  readonly available: boolean;
  requestBreak(): Promise<"unavailable" | "shown">;
}

export interface AccountPort {
  readonly available: boolean;
  currentUserId(): string | null;
}

export interface PlatformServices {
  readonly profile: ReleaseProfile;
  readonly analytics: AnalyticsPort;
  readonly save: SavePort;
  readonly sdk: PlatformSdkPort;
  readonly lifecycle: PlatformLifecyclePort;
  readonly ads: AdsPort;
  readonly account: AccountPort;
}
