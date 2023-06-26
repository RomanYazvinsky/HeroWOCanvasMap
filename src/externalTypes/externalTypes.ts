export interface MapProperties {
    width: number;
    height: number;
    random: number;
    levels: number;
    margin: [number,number,number,number];
}

export type H3Map = Record<string, unknown> & {
    get(): MapProperties;
    get<T extends keyof MapProperties>(key: T): MapProperties[T];
    get<T extends keyof MapProperties>(key?: T): MapProperties[T] | MapProperties;
    constants: {
        tileSize: number;
        shroud: {
            edge: number[];
            edgeKey: Record<string, number>;
            repeat: number[][];
            visible: number[];
        }
    }

    objects: {
        atter(keys: (keyof H3Object)[]): any;
    };
    bySpot: {
        findAtCoords(x: number, y: number, z: number, unknown: unknown, func: (id: number, objX: number, objY: number, objZ: number) => void): void
    };

    shroud: {
        atCoords(x: number, y: number, z: number, player: number): number;
    }
};
export type H3Cx = any;
export type H3Sc = any;
export type H3Pl = any;
export type H3Rules = any;
export interface H3Object extends Record<string, unknown> {
    id: number;
    texture: string,
    mirrorX: boolean,
    mirrorY: boolean,
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    animation: string,
    duration?: number;
    passable: string;
    displayOrder: number;
}
