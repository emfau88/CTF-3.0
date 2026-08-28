import type { ReleaseProfile } from "./releaseProfile";
import {
  CORE_ARENA_PRODUCT_EVENT,
  ProductEventRecorder,
  type ProductEvent,
} from "./productEvents";
import type {
  PlatformLifecyclePort,
  PlatformLifecycleState,
  PlatformServices,
  SavePort,
} from "./platformServices";

interface StandaloneWindowPort extends EventTarget {
  readonly document: Document;
  readonly crypto?: Pick<Crypto, "randomUUID">;
  readonly CustomEvent: typeof CustomEvent;
  addEventListener(type: "focus" | "blur", listener: EventListener): void;
  removeEventListener(type: "focus" | "blur", listener: EventListener): void;
}

export interface StandalonePlatformOptions {
  readonly profile: ReleaseProfile;
  readonly storage: SavePort;
  readonly windowPort: StandaloneWindowPort;
  readonly sessionId?: string;
  readonly now?: () => string;
}

export function createStandalonePlatformServices(
  options: StandalonePlatformOptions,
): PlatformServices {
  const analytics = new ProductEventRecorder({
    releaseProfileId: options.profile.id,
    sessionId: options.sessionId ?? createSessionId(options.windowPort),
    now: options.now,
    onEvent: (event) => dispatchLocalProductEvent(options.windowPort, event),
  });
  return {
    analytics,
    save: options.storage,
    sdk: {
      async initialize(): Promise<void> {},
      gameplayStart(): void {},
      gameplayStop(): void {},
    },
    lifecycle: createBrowserLifecyclePort(options.windowPort),
    ads: {
      available: false,
      async requestBreak(): Promise<"unavailable"> { return "unavailable"; },
    },
    account: {
      available: false,
      currentUserId(): null { return null; },
    },
  };
}

function createBrowserLifecyclePort(
  windowPort: StandaloneWindowPort,
): PlatformLifecyclePort {
  const listeners = new Set<(state: PlatformLifecycleState) => void>();
  let focused = windowPort.document.hasFocus?.() ?? true;
  let visible = !windowPort.document.hidden;
  const read = (): PlatformLifecycleState => ({
    focused,
    visible,
    shouldPause: !focused || !visible,
  });
  const notify = (): void => {
    const state = read();
    for (const listener of listeners) listener(state);
  };
  const handleFocus = (): void => { focused = true; notify(); };
  const handleBlur = (): void => { focused = false; notify(); };
  const handleVisibility = (): void => {
    visible = !windowPort.document.hidden;
    notify();
  };
  windowPort.addEventListener("focus", handleFocus);
  windowPort.addEventListener("blur", handleBlur);
  windowPort.document.addEventListener("visibilitychange", handleVisibility);
  return {
    read,
    subscribe(listener): () => void {
      listeners.add(listener);
      listener(read());
      return () => listeners.delete(listener);
    },
    dispose(): void {
      listeners.clear();
      windowPort.removeEventListener("focus", handleFocus);
      windowPort.removeEventListener("blur", handleBlur);
      windowPort.document.removeEventListener("visibilitychange", handleVisibility);
    },
  };
}

function createSessionId(windowPort: StandaloneWindowPort): string {
  return windowPort.crypto?.randomUUID?.() ??
    `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function dispatchLocalProductEvent(
  target: StandaloneWindowPort,
  productEvent: ProductEvent,
): void {
  target.dispatchEvent(new target.CustomEvent(CORE_ARENA_PRODUCT_EVENT, {
    detail: productEvent,
  }));
}
