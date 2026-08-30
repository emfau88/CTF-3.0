export const CORE_ARENA_PRODUCT_EVENT = "core-arena-product-event";
export const CORE_ARENA_LIFECYCLE_EVENT = "core-arena-lifecycle-change";
export const MATCH_ENTRY_POINT_PARAM = "entryPoint";

export type MatchEntryPoint = "quick-start" | "custom-match" | "league" | "qualifier";
export type TutorialAction = "move" | "aim" | "arc-lash" | "pickup" | "jump";

export interface ProductEventPayloads {
  app_opened: { readonly entryPoint: "menu" | MatchEntryPoint };
  qualifier_started: { readonly mapId: string; readonly mode: "tdm" };
  qualifier_completed: { readonly outcome: "win" | "loss" | "draw" };
  qualifier_abandoned: { readonly reason: "menu" | "restart" | "reload" | "closed" };
  tutorial_action_completed: { readonly action: TutorialAction };
  team_created: { readonly selectedWingmanId: string };
  league_hq_opened: { readonly hasCareer: boolean };
  league_started: { readonly seasonId: string };
  match_started: { readonly entryPoint: MatchEntryPoint; readonly mode: string; readonly mapId: string };
  match_completed: { readonly entryPoint: MatchEntryPoint; readonly outcome: "win" | "loss" | "draw" };
  match_abandoned: { readonly entryPoint: MatchEntryPoint; readonly reason: "menu" | "restart" | "reload" | "closed" };
  recruitment_opened: { readonly seasonId: string };
  wingman_selected: { readonly characterId: string; readonly source: "team-setup" | "recruitment" };
  career_abandoned: { readonly stage: "qualifier" | "team-setup" | "league" };
}

export type ProductEventName = keyof ProductEventPayloads;

export type ProductEvent = {
  [Name in ProductEventName]: {
    readonly version: 1;
    readonly name: Name;
    readonly payload: ProductEventPayloads[Name];
    readonly occurredAt: string;
    readonly sessionId: string;
    readonly releaseProfileId: string;
  }
}[ProductEventName];

export interface AnalyticsPort {
  track<Name extends ProductEventName>(
    name: Name,
    payload: ProductEventPayloads[Name],
  ): ProductEvent;
  read(): readonly ProductEvent[];
  clear(): void;
}

export interface ProductEventRecorderOptions {
  readonly releaseProfileId: string;
  readonly sessionId: string;
  readonly now?: () => string;
  readonly onEvent?: (event: ProductEvent) => void;
  readonly capacity?: number;
}

export class ProductEventRecorder implements AnalyticsPort {
  private readonly events: ProductEvent[] = [];
  private readonly now: () => string;
  private readonly capacity: number;

  constructor(private readonly options: ProductEventRecorderOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.capacity = Math.max(1, options.capacity ?? 200);
  }

  track<Name extends ProductEventName>(
    name: Name,
    payload: ProductEventPayloads[Name],
  ): ProductEvent {
    const event = {
      version: 1,
      name,
      payload,
      occurredAt: this.now(),
      sessionId: this.options.sessionId,
      releaseProfileId: this.options.releaseProfileId,
    } as ProductEvent;
    this.events.push(event);
    if (this.events.length > this.capacity) this.events.shift();
    this.options.onEvent?.(event);
    return event;
  }

  read(): readonly ProductEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}

export function withMatchEntryPoint(
  search: string,
  entryPoint: MatchEntryPoint,
): string {
  const params = new URLSearchParams(search);
  params.set(MATCH_ENTRY_POINT_PARAM, entryPoint);
  return params.toString();
}

export function readMatchEntryPoint(
  search: URLSearchParams,
): MatchEntryPoint {
  if (search.get("qualifier") === "1") return "qualifier";
  if (search.get("league") === "1") return "league";
  const value = search.get(MATCH_ENTRY_POINT_PARAM);
  return value === "quick-start" || value === "custom-match"
    ? value
    : "custom-match";
}
