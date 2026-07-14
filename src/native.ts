import { invoke } from "@tauri-apps/api/core";

interface MockPosition {
  x: number;
  y: number;
}

let mockPosition: MockPosition = { x: 40, y: 40 };

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
        x: Number(args?.x ?? mockPosition.x),
        y: Number(args?.y ?? mockPosition.y)
      };
      return undefined as T;
    case "nudge_window": {
      mockPosition.x += Number(args?.dx ?? 0);
      mockPosition.y += Number(args?.dy ?? 0);
      return {
        ...mockPosition,
        hitLeft: false,
        hitRight: false
      } as T;
    }
    default:
      return undefined as T;
  }
};
