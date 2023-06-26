import {TileParameters} from "./TileParameters";

export class CanvasState {
    private state: TileParameters[];
    private height: number;

    constructor(map: any) {
        this.height = map.get('height');
        this.state = Array(map.get('width') * this.height);
    }

    get(x: number, y: number): TileParameters {
        return this.state[y + x * this.height];
    }

    set(x: number, y: number, value: TileParameters): void {
        this.state[y + x * this.height] = value;
    }
}
