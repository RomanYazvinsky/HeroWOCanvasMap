export interface Point {
    x: number;
    y: number;
    z: number;
}

export type ImageLoadedCb = (points: Point[]) => void;

const owners = ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'tan', 'teal']

// todo preload hero animation
const allHeroAnimations = owners.reduce((acc: string[], owner) => {
    // for (let homeTown = 0; homeTown < 18; homeTown++) {
    for (let homeTown = 0; homeTown < 1; homeTown++) {
        const homeTownString = homeTown.toString().padStart(2, '0');
        for (let textureType = 0; textureType < 10; textureType++) {
            for (let animationFrame = 0; animationFrame < 8; animationFrame++) {
                acc.push(`../DEF-PNG/AH${homeTownString}_/${owner}Owner-${textureType}-${animationFrame}.png`)
            }
        }
    }
    return acc;
}, [])

export class ImageLoader {
    _imageCache = new Map();
    _newImageUrls = new Map<string, Point[]>();
    _onImagesLoadedCb?: ImageLoadedCb | null = null;
    _loadScheduled = false;
    _asyncLoadingEnabled = false;

    async _loadImage(url: string) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = url;
            let onError: () => void;
            let onLoad = () => {
                resolve(image);
                image.removeEventListener('load', onLoad)
                image.removeEventListener('error', onError)
            };

            onError = () => {
                reject()
                image.removeEventListener('load', onLoad)
                image.removeEventListener('error', onError)
            }
            image.addEventListener('load', onLoad)
            image.addEventListener('error', onError)
        })
    }

    async loadAllImages() {
        const urls = Array.from(this._newImageUrls.keys());
        const loadRequests = urls
            .map(url => this._loadImage(url)
                .then((image) => {
                    this._imageCache.set(url, image);
                }).catch(() => {
                    console.error(`Failed to load ${url}`)
                })
            )
        let promise = await Promise.all(loadRequests);
        if (this._asyncLoadingEnabled) {
            this._notifyImagesLoaded(Array.from(this._newImageUrls.values()).flat());
        }
        this._newImageUrls.clear();
        this._asyncLoadingEnabled = true;
        this._loadScheduled = false;
        return promise;
    }

    hasUnloadedImages() {
        return this._newImageUrls.size > 0;
    }

    addUrlForLoad(url: string, point?: Point) {
        if (this.isImageLoaded(url)) {
            return;
        }
        const points = this._newImageUrls.get(url) ?? []
        if (point) {
            points.push(point);
        }
        this._newImageUrls.set(url, points);
        if (!this._loadScheduled && this._asyncLoadingEnabled) {
            this._loadScheduled = true;
            queueMicrotask(() => this.loadAllImages());
        }
    }

    isImageLoaded(url: string) {
        return this._imageCache.has(url);
    }

    _notifyImagesLoaded(points: Point[]) {
        this._onImagesLoadedCb?.(points);
    }

    onImagesLoaded(cb: ImageLoadedCb) {
        this._onImagesLoadedCb = cb;
    }

    addAnimationUrlsForPreload(currentUrl: string, objectTextureFolder: string, ownerName: string, textureType: string, animationFramesCount: number) {
        if (this._imageCache.has(currentUrl) || this._newImageUrls.has(currentUrl)) {
            return;
        }
        for (let i = 0; i < animationFramesCount; i++) {
            const url = `../DEF-PNG/${objectTextureFolder}/${ownerName || ''}${textureType}-${i}.png`;
            this._newImageUrls.set(url, []);
        }
    }

    getImage(url: string) {
        return this._imageCache.get(url);
    }
}
