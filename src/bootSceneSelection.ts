export interface SceneSelectionLocation {
  readonly pathname: string;
  readonly search: string;
}

export function shouldUseGameplayV2Shell(
  locationLike: SceneSelectionLocation,
  _baseUrl = "/",
): boolean {
  const search = new URLSearchParams(locationLike.search);
  const explicitScene = search.get("scene");
  if (explicitScene === "v2") {
    return true;
  }
  if (explicitScene === "v1") {
    return false;
  }
  return true;
}
