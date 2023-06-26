import {ImageRenderer} from "./ImageRenderer";
import {TileParameters} from "../TileParameters";
import {FogRenderer} from "./FogRenderer";
import {H3Map} from "../externalTypes/externalTypes";
import {ImageLoader} from "../ImageLoader";

export class TileRenderer {
    private fogRenderer = new FogRenderer(this.map, this.canvasRenderingContext2D);
    private imageRenderer = new ImageRenderer(this.canvasRenderingContext2D,
        this.map,
        this.imageLoader
    )
    constructor(private canvasRenderingContext2D: CanvasRenderingContext2D,
                private map: H3Map,
                private imageLoader: ImageLoader) {
    }

    render(x: number, y: number, parameters: TileParameters): void {
        if (parameters.shroud && !parameters.partialShroud) {
            this.imageRenderer.render(x, y, parameters.shroud);
            return;
        }
        if (parameters.fog) {
            this.fogRenderer.renderWithFogEffect(x, y, () => {
                this.renderObjects(x, y, parameters)
            })
        } else {
            this.renderObjects(x, y, parameters);
        }
    }

    private renderObjects(x: number, y: number, parameters: TileParameters): void {
        for (let i = 0; i < parameters.objectLayers.length; i++) {
            this.imageRenderer.render(x, y, parameters.objectLayers[i]);
        }
        if (parameters.shroud && parameters.partialShroud) {
            this.imageRenderer.render(x, y, parameters.shroud);
        }
    }
}
