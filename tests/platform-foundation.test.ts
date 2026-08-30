import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE_ARENA_PRODUCT_EVENT,
  ProductEventRecorder,
  STANDALONE_RELEASE_PROFILE,
  createStandalonePlatformServices,
  validateReleaseProfile,
  type ProductEvent,
} from "../src/platform";

test("standalone release profile keeps the release surface explicit", () => {
  assert.deepEqual(validateReleaseProfile(STANDALONE_RELEASE_PROFILE), []);
  assert.equal(STANDALONE_RELEASE_PROFILE.target, "standalone");
  assert.equal(STANDALONE_RELEASE_PROFILE.startFlow, "qualifier");
  assert.equal(STANDALONE_RELEASE_PROFILE.features.qualifier, true);
  assert.deepEqual(STANDALONE_RELEASE_PROFILE.supportedDevices, ["desktop"]);
  assert.deepEqual(STANDALONE_RELEASE_PROFILE.supportedLanguages, ["de", "en"]);
});

test("product events are typed, bounded and remain local", () => {
  const delivered: ProductEvent[] = [];
  const recorder = new ProductEventRecorder({
    releaseProfileId: "test",
    sessionId: "session-1",
    now: () => "2026-08-28T12:00:00.000Z",
    capacity: 2,
    onEvent: (event) => delivered.push(event),
  });
  recorder.track("app_opened", { entryPoint: "menu" });
  recorder.track("tutorial_action_completed", { action: "move" });
  recorder.track("match_started", {
    entryPoint: "quick-start",
    mode: "tdm",
    mapId: "helix-canopy-v2",
  });
  assert.equal(delivered.length, 3);
  assert.deepEqual(recorder.read().map((event) => event.name), [
    "tutorial_action_completed",
    "match_started",
  ]);
  assert.equal(recorder.read()[0].sessionId, "session-1");
  recorder.clear();
  assert.deepEqual(recorder.read(), []);
});

test("standalone services expose save, lifecycle and inspectable DOM events", async () => {
  const storage = new Map<string, string>();
  const received: ProductEvent[] = [];
  window.addEventListener(CORE_ARENA_PRODUCT_EVENT, (event) => {
    received.push((event as CustomEvent<ProductEvent>).detail);
  }, { once: true });
  const services = createStandalonePlatformServices({
    profile: STANDALONE_RELEASE_PROFILE,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); },
      removeItem: (key) => { storage.delete(key); },
    },
    windowPort: window,
    sessionId: "session-standalone",
  });
  services.save.setItem("career", "ready");
  services.analytics.track("league_hq_opened", { hasCareer: false });
  await services.sdk.initialize();
  assert.equal(services.save.getItem("career"), "ready");
  assert.equal(received[0].name, "league_hq_opened");
  assert.equal(services.ads.available, false);
  assert.equal(await services.ads.requestBreak(), "unavailable");
  assert.equal(services.account.currentUserId(), null);
  services.lifecycle.dispose();
});
