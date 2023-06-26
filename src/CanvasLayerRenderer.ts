import {CanvasRangeHelper} from "./CanvasRangeHelper";
import {H3ToCanvasTileParameters, H3ToCanvasTileStateMapper} from "./H3ToCanvasTileStateMapper";
import {ObjectManager} from "./ObjectManager";
import {H3Map, H3Object, H3Pl} from "./externalTypes/externalTypes";
import {TileRenderer} from "./renderer/TileRenderer";
import {ImageLoader} from "./ImageLoader";
import {CanvasState} from "./CanvasState";

export class CanvasLayerRenderer {
    private dirtyStateArray: boolean[];
    private height: number;
    private updateScheduled = false;
    private state = new CanvasState(this.map);
    private context = this.canvas.getContext('2d')!;
    private tileRenderer = new TileRenderer(this.context,this.map, this.imageLoader)

    constructor(public canvas: HTMLCanvasElement,
                private rangeHelper: CanvasRangeHelper,
                private mapper: H3ToCanvasTileStateMapper,
                private objectManager: ObjectManager,
                private imageLoader: ImageLoader,
                private pl: H3Pl,
                private map: H3Map,
                public z: number) {
        this.mapper = mapper;
        this.map = map;
        this.z = z;
        this.rangeHelper = rangeHelper;
        this.height = map.get('height');
        this.dirtyStateArray = Array(map.get('width') * this.height);
    }

    fillMap(): void {
        this.rangeHelper.forMap((x, y) => {
           this.updateTile(x, y);
        });
    }

    renderMap(): void {
        this.rangeHelper.forMap((x, y) => {
            this.tileRenderer.render(x, y, this.state.get(x, y));
        });
    }

    getH3State(x: number, y: number): H3ToCanvasTileParameters {
        const isTileVisible = this.isTileVisible(x, y);
        return {
            objects: this.objectManager.getObjectsAtPosition(x, y, this.z),
            visible: isTileVisible
        }
    }

    isTileVisible(x: number, y: number): boolean {
        return this.map.shroud.atCoords(x + 1, y + 1, this.z, this.pl.get('player')) >= 0;
    }

    setDirty(x: number, y: number): void {
        this.dirtyStateArray[this.getIndex(x, y)] = true;
        this.scheduleUpdate();
    }

    setUpdated(x: number, y: number) {
        this.dirtyStateArray[this.getIndex(x, y)] = false;
    }

    setRangeDirty(x: number, y: number, endX: number, endY: number): void {
        this.rangeHelper.forRange(x, y, endX, endY, (tileX, tileY) => this.setDirty(tileX, tileY));
    }

    setObjectDirty(object: H3Object): void {
        this.setRangeDirty(object.x, object.y, object.x + object.width, object.y + object.height)
    }

    isDirty(x: number, y: number): boolean {
        return this.dirtyStateArray[this.getIndex(x, y)];
    }

    updateTile(x: number, y: number): void {
        const state = this.mapper.toCanvas(x, y, this.z, this.getH3State(x, y));
        this.state.set(x, y, state);
        this.setUpdated(x, y);
    }

    updateAndRenderTile(x: number, y: number): void {
        this.updateTile(x, y);
        this.tileRenderer.render(x, y, this.state.get(x, y));
    }

    animateTile(x: number, y: number) {
        const state = this.state.get(x, y);
        if ((!state || !state.animation) && !this.isDirty(x, y)) {
            return;
        }
        this.updateTile(x, y);
        this.tileRenderer.render(x, y, this.state.get(x, y));
    }

    forceUpdateRange(x: number, y: number, endX: number, endY: number): void {
        this.rangeHelper.forRange(x, y, endX, endY, (tileX, tileY) => this.updateAndRenderTile(tileX, tileY))
    }

    private scheduleUpdate(): void {
        if (!this.updateScheduled) {
            this.updateScheduled = true;
            queueMicrotask(() => this.updateDirtyTiles());
        }
    }

    private getIndex(x: number, y: number): number {
        return y + x * this.height;
    }

    private updateDirtyTiles() {
        this.updateScheduled = false;
        this.rangeHelper.forMap((x, y) => {
           const dirty = this.isDirty(x, y);
           if (dirty) {
               this.updateAndRenderTile(x, y);
           }
        });
    }
}

