import {H3Map, H3Object} from "./externalTypes/externalTypes";

import {Rect} from "./Rect";
export interface InsertedObjectConfiguration extends Rect {
    object: H3Object;
}

const objectKeys: (keyof H3Object)[]= ['x', 'y', 'z', 'height', 'width', 'id', 'animation', 'displayOrder', 'duration',
    'texture', 'passable', 'mirrorX', 'mirrorY']

function H3ObjectComparator(a: H3Object, b: H3Object) {
    if (a.passable && b.passable) {
        let tilesOfABlockedByB = 0;
        let tilesOfBBlockedByA = 0;
        const intersectionRect = {
            x: Math.max(a.x, b.x),
            y: Math.max(a.y, b.y),
            endX: Math.min(a.x + a.width, b.x + b.width),
            endY: Math.min(a.y + a.height, b.y + b.height),
        };
        const diffXA = intersectionRect.x - a.x;
        const diffXB = intersectionRect.x - b.x;
        const diffYA = intersectionRect.y - a.y;
        const diffYB = intersectionRect.y - b.y;
        for (let i = 0; i < intersectionRect.endX - intersectionRect.x; i++) {
            for (let j = 0; j < intersectionRect.endY - intersectionRect.y; j++) {
                const passableA = a.passable[i + diffXA + (j + diffYA) * a.width];
                const passableABelow = a.passable[i + diffXA + (j + diffYA + 1) * a.width];
                const passableB = b.passable[i + diffXB + (j + diffYB) * b.width];
                const passableBBelow = b.passable[i + diffXB + (j + diffYB + 1) * b.width];
                if (passableA === '0' && passableBBelow === '0') {
                    tilesOfABlockedByB++;
                }
                if (passableABelow === '0' && passableB === '0') {
                    tilesOfBBlockedByA++;
                }
            }
        }
        if (tilesOfABlockedByB !== tilesOfBBlockedByA) {
            return tilesOfBBlockedByA - tilesOfABlockedByB;
        }
    }
    return a.displayOrder - b.displayOrder;
}
export class ObjectManager {
    private map: H3Map;
    private objectsAtter: any;
    private _insertedObjects = new Map<number, InsertedObjectConfiguration>();
    private _hiddenObjects = new Set<number>();

    constructor(map: H3Map) {
        this.map = map;
        this.objectsAtter = this.map.objects.atter(objectKeys);
    }

    getObjectsAtPosition(x: number, y: number, z: number) {
        const objects: H3Object[] = [];
        this._insertedObjects.forEach((value) => {
            if (value.z === z && x >= value.x && x <= value.endX && y >= value.y && y <= value.endY) {
                objects.push(value.object);
            }
        });
        this.map.bySpot.findAtCoords(x + 1, y + 1, z, 0, (id: number) => {
            const obj = this.objectsAtter(id, 0, 0, 0);
            if (!this._hiddenObjects.has(obj.id)) {
                objects.push(obj)
            }
        });
        return objects.sort(H3ObjectComparator);
    }

    insertObjectAt(obj: H3Object, x: number, y: number, z: number, endX: number, endY: number) {
        this._insertedObjects.set(obj.id, {
            x, y, z, endX, endY, object: obj
        })
    }

    removeInsertedObject(objectId: number) {
        this._insertedObjects.delete(objectId);
    }

    hideRealObject(objectId: number) {
        this._hiddenObjects.add(objectId);
    }

    restoreRealObject(objectId: number) {
        this._hiddenObjects.delete(objectId);
    }
}
