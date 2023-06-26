import {H3Map} from "../externalTypes/externalTypes";

export class FogRenderer {
    constructor(private map: H3Map, private canvasRenderingContext2D: CanvasRenderingContext2D) {
    }


    renderWithFogEffect(x: number, y: number, renderFn: () => void) {
        // this.canvasRenderingContext2D.filter = 'grayscale(1)';
        renderFn();
        // this.canvasRenderingContext2D.filter = '';
        const tileSize = this.map.constants.tileSize;
        this.canvasRenderingContext2D.fillStyle = 'rgba(0, 0, 0, 0.5)'
        this.canvasRenderingContext2D.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        this.canvasRenderingContext2D.fillStyle = 'none';
    }
}
