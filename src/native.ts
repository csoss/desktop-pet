import { invoke } from "@tauri-apps/api/core";

interface MockPosition {
  x: number;
  y: number;
}

let mockPosition: MockPosition = { x: 0, y: 0 };

const clampMockX = (x: number): number => {
  const petWidth = 192;
  const pagePadding = 24;
  const maxOffset = Math.max(0, (window.innerWidth - petWidth) / 2 - pagePadding);
  return Math.round(Math.min(maxOffset, Math.max(-maxOffset, x)));
};

export const isTauriRuntime = "__TAURI_INTERNALS__" in window;

export const nativeInvoke = async <T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> => {
  if (isTauriRuntime) return invoke<T>(command, args);

  switch (command) {
    case "window_position":
      return { ...mockPosition } as T;
    case "restore_position":
      mockPosition = {
        x: clampMockX(Number(args?.x ?? mockPosition.x)),
        y: Number(args?.y ?? mockPosition.y)
      };
      return undefined as T;
    case "nudge_window": {
      const requestedX = mockPosition.x + Number(args?.dx ?? 0);
      const nextX = clampMockX(requestedX);
      mockPosition.x = nextX;
      mockPosition.y += Number(args?.dy ?? 0);
      return {
        ...mockPosition,
        hitLeft: nextX > requestedX,
        hitRight: nextX < requestedX
      } as T;
    }
    default:
      return undefined as T;
  }
};
