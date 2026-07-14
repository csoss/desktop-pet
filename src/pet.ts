export const CELL_WIDTH = 192;
export const CELL_HEIGHT = 208;
export const ATLAS_WIDTH = 1536;
export const ATLAS_HEIGHT = 2288;

export type AnimationName =
  | "idle"
  | "walkRight"
  | "walkLeft"
  | "wave"
  | "jump"
  | "failed"
  | "waiting"
  | "working"
  | "review"
  | "look";

export interface Frame {
  row: number;
  column: number;
}

interface AnimationDefinition {
  frames: Frame[];
  frameDuration: number;
  loop: boolean;
}

const rowFrames = (row: number, count: number): Frame[] =>
  Array.from({ length: count }, (_, column) => ({ row, column }));

export const animations: Record<Exclude<AnimationName, "look">, AnimationDefinition> = {
  idle: { frames: rowFrames(0, 6), frameDuration: 460, loop: true },
  walkRight: { frames: rowFrames(1, 8), frameDuration: 105, loop: true },
  walkLeft: { frames: rowFrames(2, 8), frameDuration: 105, loop: true },
  wave: { frames: rowFrames(3, 4), frameDuration: 190, loop: false },
  jump: { frames: rowFrames(4, 5), frameDuration: 135, loop: false },
  failed: { frames: rowFrames(5, 8), frameDuration: 210, loop: false },
  waiting: { frames: rowFrames(6, 6), frameDuration: 300, loop: true },
  working: { frames: rowFrames(7, 6), frameDuration: 175, loop: true },
  review: { frames: rowFrames(8, 6), frameDuration: 220, loop: false }
};

export const lookFrames: Frame[] = Array.from({ length: 16 }, (_, index) => ({
  row: index < 8 ? 9 : 10,
  column: index % 8
}));

export class PetAnimator {
  private animation: AnimationName = "idle";
  private frames: Frame[] = animations.idle.frames;
  private frameDuration = animations.idle.frameDuration;
  private loop = true;
  private frameIndex = 0;
  private lastFrameAt = performance.now();
  private completion: (() => void) | undefined;

  constructor(private readonly render: (frame: Frame) => void) {
    this.render(this.frames[0]);
  }

  get current(): AnimationName {
    return this.animation;
  }

  play(name: Exclude<AnimationName, "look">, completion?: () => void): void {
    const definition = animations[name];
    this.animation = name;
    this.frames = definition.frames;
    this.frameDuration = definition.frameDuration;
    this.loop = definition.loop;
    this.frameIndex = 0;
    this.lastFrameAt = performance.now();
    this.completion = completion;
    this.render(this.frames[0]);
  }

  look(directionIndex: number, completion?: () => void): void {
    const start = Math.max(0, Math.min(15, Math.round(directionIndex)));
    const neutral = 0;
    const step = start <= 8 ? 1 : -1;
    const sequence: Frame[] = [];
    let index = neutral;
    while (index !== start) {
      sequence.push(lookFrames[index]);
      index = (index + step + 16) % 16;
    }
    sequence.push(lookFrames[start]);

    this.animation = "look";
    this.frames = sequence;
    this.frameDuration = 135;
    this.loop = false;
    this.frameIndex = 0;
    this.lastFrameAt = performance.now();
    this.completion = completion;
    this.render(this.frames[0]);
  }

  tick(now: number): void {
    if (now - this.lastFrameAt < this.frameDuration) return;
    this.lastFrameAt = now;
    this.frameIndex += 1;

    if (this.frameIndex >= this.frames.length) {
      if (this.loop) {
        this.frameIndex = 0;
      } else {
        const callback = this.completion;
        this.completion = undefined;
        this.play("idle");
        callback?.();
        return;
      }
    }

    this.render(this.frames[this.frameIndex]);
  }
}
