import {H3CanvasTileImageProperties} from "./H3CanvasTileImageProperties";
import {ImageLoader} from "../ImageLoader";
import {H3Map} from "../externalTypes/externalTypes";

export class ImageRenderer {
    constructor(private canvasRenderingContext2D: CanvasRenderingContext2D,
                private map: H3Map,
                private imageLoader: ImageLoader) {
    }

    render(x: number, y: number,
                {
                    imageX,
                    imageY,
                    imageUrl,
                    offsetX,
                    offsetY,
                    mirrorX,
                    mirrorY,
                }: H3CanvasTileImageProperties) {
        if (!imageUrl) {
            return;
        }
        const image = this.imageLoader.getImage(imageUrl);
        if (!image) {
            return;
        }
        this.canvasRenderingContext2D.save();
        const tileSize = this.map.constants.tileSize;
        if (mirrorX || mirrorY) {
            this.canvasRenderingContext2D.scale(mirrorX ? -1 : 1, mirrorY ? -1 : 1);
            const translateX = mirrorX ? -(2 * x + 1) * tileSize : 0
            const translateY = mirrorY ? -(2 * y + 1) * tileSize : 0
            this.canvasRenderingContext2D.translate(translateX, translateY)
        }
        const imageOffsetX = (mirrorX ? imageX + offsetX : imageX - offsetX)
        const imageOffsetY = (mirrorY ? imageY + offsetY : imageY - offsetY)
        this.canvasRenderingContext2D.drawImage(
            image,
            imageOffsetX * tileSize,
            imageOffsetY * tileSize,
            tileSize,
            tileSize,
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize
        )
        this.canvasRenderingContext2D.restore();
    }
}
