export type AnimationAction = (tick: number) => void | Promise<void> | boolean | Promise<boolean>;

export function animate(steps: number, stepInterval: number, callback: AnimationAction): Promise<void> {
    const MIN_INTERVAL = 1000 / 90;
    const shouldSkipSteps = stepInterval < MIN_INTERVAL;
    return new Promise(async (resolve) => {
        if (steps <= 0) {
            resolve()
            return;
        }
        let i = 0;
        let result = await callback(i);
        i++;
        if (steps === 1 || result === false) {
            resolve()
            return;
        }
        if (shouldSkipSteps) {
            const animateInRaf = () => requestAnimationFrame(async () => {
                result = await callback(i);
                i += 3;
                if (i < steps && result !== false) {
                    animateInRaf()
                } else {
                    resolve()
                }
            });
            animateInRaf();
            return;
        }
        const interval = setInterval(async () => {
            result = await callback(i);
            i++;
            if (i >= steps || result === false) {
                clearInterval(interval);
                resolve()
                return;
            }
        }, stepInterval)
    })
}

export class AnimationManager {
    _interval?: number;
    _globalTickIndex = 0;
    _actions: AnimationAction[] = [];

    constructor() {
    }

    setInterval(tick: number) {
        if (this._interval) {
            clearInterval(this._interval);
        }
        this._interval = setInterval(() => {
            this._globalTickIndex++;
            if (this._globalTickIndex > 100_000_000) {
                this._globalTickIndex = 1;
            }
            this._actions.forEach(action => action(this._globalTickIndex));
        }, tick);
    }

    onTick(action: AnimationAction) {
        this._actions.push(action);
    }

    getTick() {
        return this._globalTickIndex;
    }

    destroy() {
        this.stop();
    }

    stop(): void {
        if (this._interval) {
            clearInterval(this._interval);
        }
    }
}
