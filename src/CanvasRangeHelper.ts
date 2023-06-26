export type TileUpdateFn = (x: number, y: number) => void;

export class CanvasRangeHelper {
    map;
    cx;
    sc;
    pl;
    _mapWidth;
    _tileSize;
    _parallelBlockSize = 8;
    _mergedRegionsMap = new Map<number, Map<number, TileUpdateFn>>();
    _scheduled: boolean = false;

    constructor(map: any, cx: any, sc: any, pl: any) {
        this.map = map;
        this.cx = cx;
        this.sc = sc;
        this.pl = pl;
        this._mapWidth = map.get('width')
        this._tileSize = map.constants.tileSize;
    }

    forRange(x: number, y: number, endX: number, endY: number, fn: TileUpdateFn) {
        for (let i = x; i < endX; i++) {
            for (let j = y; j < endY; j++) {
                fn(i, j)
            }
        }
    }

    forRangeMerged(x: number, y: number, endX: number, endY: number, fn: TileUpdateFn) {
        for (let i = x; i < endX; i++) {
            for (let j = y; j < endY; j++) {
                let yMap;
                if (this._mergedRegionsMap.has(i)) {
                    yMap = this._mergedRegionsMap.get(i);
                } else {
                    yMap = new Map()
                    this._mergedRegionsMap.set(i, yMap);
                }
                yMap!.set(j, fn)
            }
        }
        this._scheduleMergedRegionFnExecution();
    }

    _scheduleMergedRegionFnExecution() {
        if (!this._scheduled) {
            queueMicrotask(() => this._executeMergedRegionsFn())
            this._scheduled = true;
        }
    }

    _executeMergedRegionsFn() {
        this._scheduled = false;
        this._mergedRegionsMap.forEach((yMap, x) => {
            yMap.forEach((fn, y) => {
                fn(x, y);
            })
        })
        this._mergedRegionsMap.clear();
    }

    forRangeNonBlocking(x: number, y: number, endX: number, endY: number, fn: TileUpdateFn) {
        for (let i = x; i < endX; i += this._parallelBlockSize) {
            for (let j = y; j < endY; j += this._parallelBlockSize) {
                setTimeout(() => {
                    for (let i1 = i; i1 < i + this._parallelBlockSize && i1 < endX; i1++) {
                        for (let j1 = j; j1 < j + this._parallelBlockSize && j1 < endY; j1++) {
                            fn(i1, j1)
                        }
                    }
                });
            }
        }
    }

    forMap(fn: TileUpdateFn) {
        this.forRange(0, 0, this._mapWidth, this.map.get('height'), fn)
    }

    forMapNonBlocking(fn: TileUpdateFn) {
        this.forRangeNonBlocking(0, 0, this._mapWidth, this.map.get('height'), fn)
    }

    forViewport(fn: TileUpdateFn, nonBlocking = false) {
        const [viewCenterX, viewCenterY] = this.sc.get('mapPosition')
        const [viewWidth, viewHeight] = this.sc.get('mapViewSize');
        const width = this.map.get('width');
        const height = this.map.get('height');
        const margin = this.map.get('margin');
        const viewX = viewCenterX - 1 - viewWidth / 2;
        const viewY = viewCenterY - 1 - viewHeight / 2;
        const safeViewX = viewX < margin[0] ? margin[0] : viewX;
        const safeViewY = viewY < margin[1] ? margin[1] : viewY;
        const safeViewEndX = viewX + viewWidth > width - margin[2] ? width - margin[2] : viewX + viewWidth;
        const safeViewEndY = viewY + viewHeight > height - margin[3] ? height - margin[3] : viewY + viewHeight;
        if (nonBlocking) {
            this.forRangeNonBlocking(safeViewX, safeViewY, safeViewEndX, safeViewEndY, fn)
        } else {
            this.forRange(safeViewX, safeViewY, safeViewEndX, safeViewEndY, fn)
        }
    }
}
