import {H3Cx, H3Map, H3Object, H3Pl, H3Rules, H3Sc} from "./externalTypes/externalTypes";
import {CanvasLayerRenderer} from "./CanvasLayerRenderer";
import {H3ToCanvasTileStateMapper} from "./H3ToCanvasTileStateMapper";
import {AppState} from "./AppState";
import {ImageLoader, Point} from "./ImageLoader";
import {ObjectManager} from "./ObjectManager";
import {CanvasRangeHelper} from "./CanvasRangeHelper";
import {animate, AnimationManager} from "./AnimationManager";


export class CanvasMapRenderer {
    appState = new AppState(this.map);
    imageLoader = new ImageLoader();
    mapper = new H3ToCanvasTileStateMapper(this.map,
        this.cx,
        this.pl,
        this.sc,
        this.rules,
        this.appState,
        this.imageLoader,
        this._
    );
    objectManager = new ObjectManager(this.map);
    regionHelper = new CanvasRangeHelper(this.map, this.cx, this.sc, this.pl);
    animationManager = new AnimationManager();
    layers: CanvasLayerRenderer[] = [];
    activeLayerZ: number = 0;
    rendered: boolean = false;
    animationRunning: boolean = false;

    constructor(private parentElement: HTMLElement,
                private rules: H3Rules,
                private map: H3Map,
                private sc: H3Sc,
                private cx: H3Cx,
                private pl: H3Pl,
                private _: any) {
        for (let z = 0; z < map.get('levels'); z++) {
            this.layers.push(this.createLayer(z));
        }
        this.setActiveLayer(this.sc.get('z'))
        this.startAnimation();
    }

    private createLayer(z: number) {
        const canvas = document.createElement('canvas');
        const margin = this.map.get('margin');
        const width = this.map.get('width');
        const tileSize = this.map.constants.tileSize;
        const height = this.map.get('height');
        canvas.setAttribute('width', width * tileSize + 'px');
        canvas.setAttribute('height', height * tileSize + 'px');
        canvas.style.setProperty('position', 'absolute');
        canvas.style.setProperty('left', -(margin[0] - 1) * tileSize + 'px');
        canvas.style.setProperty('top', -(margin[1] - 1) * tileSize + 'px');
        this.parentElement.append(canvas);
        return new CanvasLayerRenderer(canvas, this.regionHelper,
            this.mapper,
            this.objectManager,
            this.imageLoader,
            this.pl,
            this.map,
            z);
    }

    setActiveLayer(z: number) {
        this.activeLayerZ = z;
        const activeLayer = this.getActiveLayer();
        activeLayer.canvas.style.setProperty('z-index', null);
        this.layers.filter(layer => layer.z !== z).forEach((layer) => {
            layer.canvas.style.setProperty('z-index', '-1')
        })
    }

    getActiveLayer() {
        return this.layers[this.activeLayerZ];
    }

    drawObject(obj: H3Object) {
        if (!this.rendered) {
            return;
        }
        const {x, y, z, width, height} = obj;
        const layer = this.layers[z];
        layer.setRangeDirty(x - 1, y - 1, x + width - 1, y + height - 1);
    }

    drawTiles(x: number, y: number, endX: number, endY: number) {
        const layer = this.getActiveLayer();
        layer.setRangeDirty(x, y, endX, endY);
    }

    async drawMap() {
        this.layers.forEach(layer => layer.fillMap());
        await this.imageLoader.loadAllImages()
        this.layers.forEach(layer => layer.renderMap());
        this.setupAsyncImageLoadingListener();
        this.rendered = true;
    }

    animateObjectMoving(from: H3Object, to: H3Object, z: number) {
        if (!from || !to) {
            return Promise.resolve();
        }
        this.animationRunning = true;
        const layer = this.layers[z];
        const id = from.id;
        const xFrom = from.x;
        const xTo = to.x;
        const yFrom = from.y;
        const yTo = to.y;
        const width = from.width;
        const height = from.height;
        this.objectManager.removeInsertedObject(id);
        this.objectManager.insertObjectAt(
            Object.assign(Object.assign({}, to),
                { x: xFrom, y: yFrom }),
            Math.min(xFrom, xTo) - 1,
            Math.min(yFrom, yTo) - 1,
            z,
            Math.max(xFrom, xTo) + width - 1,
            Math.max(yFrom, yTo) + height - 1
        );
        const offsetX = (xTo - xFrom);
        const offsetY = (yTo - yFrom);
        return animate(8, 30, (frame) => {
            const options = {
                frameIndex: frame,
                offsetX,
                offsetY,
            };
            this.appState.objectOptions.set(id, options);
            layer.forceUpdateRange(xFrom - 2, yFrom - 2, xFrom + width + 2, yFrom + height + 2);
        });
    }

    prepareObjectForAnimation(object: H3Object): void {
        this.objectManager.hideRealObject(object.id);
    }

    finishObjectAnimation(id: number) {
        this.objectManager.removeInsertedObject(id);
        this.appState.objectOptions.delete(id);
        this.objectManager.restoreRealObject(id);
        this.animationRunning = false;
    }

    startAnimation() {
        this.animationManager.setInterval(180);
        this.animationManager.onTick((i) => this.runAnimation(i))
    }

    stopAnimation(): void {
        this.animationManager.stop()
    }

    private runAnimation(i: number) {
        if (!this.rendered) {
            return;
        }
        this.appState.globalAnimationTick = i;
        const activeLayer = this.getActiveLayer();
        this.regionHelper.forViewport((x, y) => {
            activeLayer.animateTile(x, y);
        })
    }

    private setupAsyncImageLoadingListener() {
        this.imageLoader.onImagesLoaded(regions => this._onImagesLoaded(regions));
    }

    _onImagesLoaded(points: Point[]) {
        if (!this.rendered) {
            return;
        }
        points.forEach(region => {
            const z = region.z;
            const layer = this.layers[z];
            layer.setDirty(region.x, region.y);
        });
    }

    destroy() {
        this.animationManager.destroy();
        this.layers.forEach(layer => layer.canvas.remove());
    }
}
