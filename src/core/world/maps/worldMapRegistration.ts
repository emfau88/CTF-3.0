import type { WorldPosition } from "../../actors";
import type {
  WorldMapLandmark,
  WorldMapLandmarkDefinition,
  WorldMapMasterTransform,
} from "./worldMapData";

export function createCenteredWorldMapMasterTransform(
  worldWidth: number,
  worldHeight: number,
  masterWidth: number,
  masterHeight: number,
): WorldMapMasterTransform {
  const scale = worldHeight / masterHeight;
  const width = masterWidth * scale;
  return {
    masterWidth,
    masterHeight,
    worldRect: {
      x: (worldWidth - width) / 2,
      y: 0,
      width,
      height: worldHeight,
    },
  };
}

export function projectWorldMapMasterPoint(
  transform: WorldMapMasterTransform,
  masterPosition: WorldPosition,
): WorldPosition {
  return {
    x: Math.round(
      transform.worldRect.x +
        masterPosition.x / transform.masterWidth * transform.worldRect.width,
    ),
    y: Math.round(
      transform.worldRect.y +
        masterPosition.y / transform.masterHeight * transform.worldRect.height,
    ),
  };
}

export function createWorldMapLandmark(
  transform: WorldMapMasterTransform,
  definition: WorldMapLandmarkDefinition,
): WorldMapLandmark {
  return {
    ...definition,
    position: projectWorldMapMasterPoint(transform, definition.masterPosition),
  };
}
