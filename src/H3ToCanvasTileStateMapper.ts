import {ImageLoader} from "./ImageLoader";
import {H3CanvasTileImageProperties} from "./renderer/H3CanvasTileImageProperties";
import {H3Cx, H3Map, H3Object, H3Pl, H3Rules, H3Sc} from "./externalTypes/externalTypes";
import {AppState} from "./AppState";
import {TileShroudState} from "./TileShroudState";
import {TileParameters} from "./TileParameters";

export interface H3ToCanvasTileParameters {
    visible: boolean;
    objects: H3Object[];
}

export class H3ToCanvasTileStateMapper {
    constructor(private map: H3Map,
                private cx: H3Cx,
                private pl: H3Pl,
                private sc: H3Sc,
                private rules: H3Rules,
                private appState: AppState,
                private imageLoader: ImageLoader,
                private _: any
    ) {

    }

    getVisibility(x: number, y: number, z: number): number {
        return this.map.shroud.atCoords(x + 1, y + 1, z, this.pl.get('player'));
    }

    getTileShroudState(x: number, y: number, z: number): TileShroudState {
        const visibility = this.getVisibility(x, y, z);
        if (!this.sc.get('mapShroud')) {
            return {
                visible: true
            }
        }
        const classic = this.cx.get('classic');
        if (visibility >= 0) {
            return {
                visible: true,
                fog: !classic && !this.map.constants.shroud.visible.includes(visibility)
            }
        }
        const edge = this.map.constants.shroud.edge;
        const key = this.map.constants.shroud.edgeKey;
        let frameSeed = edge[
        +(this.getVisibility(x, y - 1, z) >= 0) << key.t |
        +(this.getVisibility(x, y + 1, z) >= 0) << key.b |
        +(this.getVisibility(x - 1, y, z) >= 0) << key.l |
        +(this.getVisibility(x - 1, y - 1, z) >= 0) << key.tl |
        +(this.getVisibility(x - 1, y + 1, z) >= 0) << key.bl |
        +(this.getVisibility(x + 1, y, z) >= 0) << key.r |
        +(this.getVisibility(x + 1, y - 1, z) >= 0) << key.tr |
        +(this.getVisibility(x + 1, y + 1, z) >= 0) << key.br |
        x & 1 << key.oddX |
        y & 1 << key.oddY
            ];
        if (!frameSeed && frameSeed !== 0) {
            if (classic) {
                const repeat = this.map.constants.shroud.repeat
                frameSeed = x ? repeat[y % 4][(x - 1) % 3] : y % 4;
                return {
                    visible: false,
                    mirrorX: false,
                    frameSeed,
                    type: 'c'
                }
            }
            const n = x + y * this.map.get('width');
            const repeatRandom = this.map.get('random') * 0x80000000 | 0;
            const rules = this.cx.modules.nested('HeroWO.H3.Rules')
            const repeatFrames = rules.animations.atCoords(rules.animationsID.TSHRC_0, 0, 0, 'frameCount', 0)
            frameSeed = this._.randomBySeed(repeatRandom ^ (n << 4 | z))[1] * repeatFrames | 0;
            return {
                visible: false,
                mirrorX: false,
                frameSeed,
                type: 'c',
            }
        }
        let mirrorX = false;
        if (frameSeed < 0) {
            mirrorX = true;
            frameSeed = ~frameSeed;
        }
        return {
            visible: false,
            partial: true,
            mirrorX,
            type: 'e',
            frameSeed,
            fog: !classic
        };
    }

    getShroudImage(x: number, y: number, z: number, {
        mirrorX,
        frameSeed,
        type
    }: TileShroudState): H3CanvasTileImageProperties | null {
        if (!type) {
            return null;
        }
        const imageUrl = `../DEF-PNG/Tshr${type}/0-${frameSeed}.png`;
        if (!this.imageLoader.isImageLoaded(imageUrl)) {
            this.imageLoader.addUrlForLoad(imageUrl, {x, y, z});
        }
        return {
            imageUrl,
            height: 1,
            width: 1,
            offsetX: 0,
            offsetY: 0,
            mirrorX: mirrorX ?? false,
            mirrorY: false,
            imageX: 0,
            imageY: 0
        }
    }

    getObjectImage(tileX: number, tileY: number, z: number, object: H3Object): H3CanvasTileImageProperties | null {
        const {texture, id, mirrorX, mirrorY, width, height, x, y, animation, duration} = object;
        if (!texture) {
            return null;
        }
        const globalFrameIndex = this.appState.globalAnimationTick || 1
        const {frameIndex = 0, offsetX, offsetY} = this.appState.objectOptions.get(id) || {};
        const [, objectTextureFolder, , ownerName, textureType, , animationStep] = texture.split(',');
        const hasMovingAnimation = offsetX || offsetY;
        let imageUrl;
        if (animation) {
            const animationType = hasMovingAnimation
                ? this._getMovingDirectionAnimationIndex(offsetX, offsetY) || textureType
                : textureType;
            const animationFramesCount = (duration || 0) / 180;
            const animationFrame = frameIndex || (globalFrameIndex % animationFramesCount) || 0;
            imageUrl = `../DEF-PNG/${objectTextureFolder}/${ownerName}${animationType}-${animationFrame}.png`;
            this.imageLoader.addAnimationUrlsForPreload(imageUrl, objectTextureFolder, ownerName, textureType, animationFramesCount)
        } else {
            imageUrl = `../DEF-PNG/${objectTextureFolder}/${ownerName}${textureType}-${animationStep}.png`;
        }
        if (!this.imageLoader.isImageLoaded(imageUrl)) {
            this.imageLoader.addUrlForLoad(imageUrl, {
                x: tileX,
                y: tileY,
                z
            });
        }
        const tileOffsetX = hasMovingAnimation && frameIndex
            ? offsetX * (frameIndex) / 8
            : 0;
        const tileOffsetY = hasMovingAnimation && frameIndex
            ? offsetY * (frameIndex) / 8
            : 0;
        const imageX = mirrorX
            ? x + width - tileX - 2
            : tileX - x + 1;
        const imageY = mirrorY
            ? y + height - tileY - 2
            : tileY - y + 1;
        return {
            imageUrl,
            imageX,
            imageY,
            offsetX: tileOffsetX,
            offsetY: tileOffsetY,
            width,
            height,
            mirrorX,
            mirrorY
        };
    }

    _getMovingDirectionAnimationIndex(offsetX: number, offsetY: number) {
        if (offsetX === 1 && offsetY === 0) {
            return this.rules.constants.animation.group.moveRight
        }
        if (offsetX === 1 && offsetY === 1) {
            return this.rules.constants.animation.group.moveDownRight
        }
        if (offsetX === 1 && offsetY === -1) {
            return this.rules.constants.animation.group.moveUpRight
        }
        if (offsetX === 0 && offsetY === 1) {
            return this.rules.constants.animation.group.moveDown
        }
        if (offsetX === 0 && offsetY === -1) {
            return this.rules.constants.animation.group.moveUp
        }
        if (offsetX === -1 && offsetY === 0) {
            return this.rules.constants.animation.group.moveRight
        }
        if (offsetX === -1 && offsetY === 1) {
            return this.rules.constants.animation.group.moveDownRight
        }
        if (offsetX === -1 && offsetY === -1) {
            return this.rules.constants.animation.group.moveUpRight
        }
        return null;
    }

    toCanvas(x: number,
             y: number,
             z: number,
             {objects, visible}: H3ToCanvasTileParameters
    ): TileParameters {
        const hasAnimation = objects.some(object => !!object.animation && !!object.duration);
        const shroud = this.getTileShroudState(x, y, z);
        return {
            animation: hasAnimation,
            partialShroud: shroud.partial ?? false,
            shroud: this.getShroudImage(x, y, z, shroud),
            fog: shroud.fog ?? false,
            objectLayers: objects.map(obj => this.getObjectImage(x, y, z, obj))
                    .filter((v): v is H3CanvasTileImageProperties => !!v)
        }
    }
}
