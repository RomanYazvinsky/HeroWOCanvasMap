import {H3CanvasTileImageProperties} from "./renderer/H3CanvasTileImageProperties";

export interface TileParameters {
    animation: boolean;
    partialShroud: boolean;
    shroud: H3CanvasTileImageProperties | null;
    fog: boolean;
    objectLayers: H3CanvasTileImageProperties[];
}
