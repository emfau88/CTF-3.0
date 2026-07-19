export interface BotUtilityCandidate<TKind extends string = string> {
  readonly key: string;
  readonly kind: TKind;
  readonly score: number;
  readonly reason: string;
  readonly emergency?: boolean;
}

export interface BotDecisionTrace<TKind extends string = string> {
  readonly selectedKey: string;
  readonly selectedKind: TKind;
  readonly selectedScore: number;
  readonly selectedReason: string;
  readonly commitmentRemainingMs: number;
  readonly candidates: readonly BotUtilityCandidate<TKind>[];
}

export class BotUtilityArbiter<TKind extends string = string> {
  private selectedKey = "";
  private commitmentRemainingMs = 0;

  choose(
    candidates: readonly BotUtilityCandidate<TKind>[],
    deltaMs: number,
    commitmentMs: number,
  ): BotDecisionTrace<TKind> {
    if (candidates.length === 0) {
      throw new Error("Bot utility arbitration requires at least one candidate.");
    }
    this.commitmentRemainingMs = Math.max(
      0,
      this.commitmentRemainingMs - Math.max(0, deltaMs),
    );
    const ordered = [...candidates].sort(compareCandidates);
    const best = ordered[0]!;
    const committed = candidates.find((candidate) =>
      candidate.key === this.selectedKey
    );
    const emergency = ordered.find((candidate) => candidate.emergency);
    const selected = emergency ??
      (
        committed &&
          this.commitmentRemainingMs > 0 &&
          committed.score >= best.score - .16
          ? committed
          : best
      );
    if (selected.key !== this.selectedKey) {
      this.selectedKey = selected.key;
      this.commitmentRemainingMs = Math.max(0, commitmentMs);
    }
    return {
      selectedKey: selected.key,
      selectedKind: selected.kind,
      selectedScore: selected.score,
      selectedReason: selected.reason,
      commitmentRemainingMs: this.commitmentRemainingMs,
      candidates: ordered.map((candidate) => ({ ...candidate })),
    };
  }

  reset(): void {
    this.selectedKey = "";
    this.commitmentRemainingMs = 0;
  }
}

function compareCandidates<TKind extends string>(
  left: BotUtilityCandidate<TKind>,
  right: BotUtilityCandidate<TKind>,
): number {
  const leftEmergency = Boolean(left.emergency);
  const rightEmergency = Boolean(right.emergency);
  if (leftEmergency !== rightEmergency) {
    return leftEmergency ? -1 : 1;
  }
  return right.score - left.score || left.key.localeCompare(right.key);
}
