export class AppState {
    globalAnimationTick = 0;
    tileSize;
    objectOptions = new Map();

    constructor(map: any) {
        this.tileSize = map.constants.tileSize;
    }
}
