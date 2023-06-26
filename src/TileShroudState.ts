export interface TileShroudState {
    visible: boolean;
    partial?: boolean;
    mirrorX?: boolean;
    frameSeed?: number;
    type?: 'c' | 'e';
    fog?: boolean;
}
