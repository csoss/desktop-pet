import "./style.css";
import { isTauriRuntime, nativeInvoke } from "./native";
import {
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  PetAnimator,
  type Frame
} from "./pet";

interface WindowPosition {
  x: number;
  y: number;
}

interface MoveResult extends WindowPosition {
  hitLeft: boolean;
  hitRight: boolean;
}

interface Preferences {
  alwaysOnTop: boolean;
  scale: number;
  wander: boolean;
  position?: WindowPosition;
}

const sprite = document.querySelector<HTMLDivElement>("#pet-sprite");
const menu = document.querySelector<HTMLElement>("#pet-menu");
const stage = document.querySelector<HTMLDivElement>("#pet-stage");
const bubble = document.querySelector<HTMLDivElement>("#status-bubble");

const isMobileWeb =
  !isTauriRuntime && window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;

if (isMobileWeb) document.body.classList.add("mobile-web");

if (!sprite || !menu || !stage || !bubble) {
  throw new Error("Timi UI did not initialize");
}

const defaultPreferences: Preferences = {
  alwaysOnTop: true,
  scale: 1,
  wander: false
};

const loadPreferences = (): Preferences => {
  try {
    return {
      ...defaultPreferences,
      ...JSON.parse(localStorage.getItem("timi-preferences") ?? "{}")
    } as Preferences;
  } catch {
    return defaultPreferences;
  }
};

let preferences = loadPreferences();
let dragging = false;
let holdTimer: number | undefined;
let clickTimer: number | undefined;
let wanderDirection: 1 | -1 = 1;
let menuOpen = false;
let nextLookAt = performance.now() + 5000;

const savePreferences = (): void => {
  localStorage.setItem("timi-preferences", JSON.stringify(preferences));
};

const renderFrame = ({ row, column }: Frame): void => {
  sprite.style.backgroundPosition = `${-column * CELL_WIDTH}px ${-row * CELL_HEIGHT}px`;
};

const animator = new PetAnimator(renderFrame);

const showBubble = (message: string): void => {
  bubble.textContent = message;
  bubble.classList.add("visible");
  window.setTimeout(() => bubble.classList.remove("visible"), 1500);
};

const setScale = (scale: number): void => {
  preferences.scale = scale;
  stage.style.setProperty("--pet-scale", String(scale));
  savePreferences();
  showBubble(`${Math.round(scale * 100)}%`);
};

const updateMenuLabels = (): void => {
  const wanderButton = menu.querySelector<HTMLButtonElement>("[data-action='wander']");
  const topButton = menu.querySelector<HTMLButtonElement>("[data-action='always-on-top']");
  if (wanderButton) wanderButton.textContent = `Wander: ${preferences.wander ? "On" : "Off"}`;
  if (topButton) topButton.textContent = `Always on top: ${preferences.alwaysOnTop ? "On" : "Off"}`;
};

const closeMenu = (): void => {
  if (isMobileWeb) return;
  menu.classList.add("hidden");
  menuOpen = false;
};

const openMenu = (x: number, y: number): void => {
  updateMenuLabels();
  if (isMobileWeb) {
    menu.classList.remove("hidden");
    menuOpen = true;
    return;
  }
  menu.style.left = `${Math.min(x, window.innerWidth - 190)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 250)}px`;
  menu.classList.remove("hidden");
  menuOpen = true;
};

const saveWindowPosition = async (): Promise<void> => {
  try {
    preferences.position = await nativeInvoke<WindowPosition>("window_position");
    savePreferences();
  } catch (error) {
    console.warn("Could not save Timi position", error);
  }
};

const playOneShot = (name: "wave" | "jump" | "failed" | "review"): void => {
  if (preferences.wander) return;
  animator.play(name);
};

const singleClick = (): void => {
  window.clearTimeout(clickTimer);
  clickTimer = window.setTimeout(() => playOneShot("wave"), 230);
};

sprite.addEventListener("dblclick", (event) => {
  event.preventDefault();
  window.clearTimeout(clickTimer);
  playOneShot("jump");
});

sprite.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  dragging = false;
  if (isMobileWeb) return;
  holdTimer = window.setTimeout(async () => {
    dragging = true;
    animator.play("working");
    try {
      await nativeInvoke("start_dragging");
      await saveWindowPosition();
    } finally {
      animator.play("idle");
    }
  }, 180);
});

sprite.addEventListener("pointerup", (event) => {
  window.clearTimeout(holdTimer);
  if (event.button === 0 && !dragging) singleClick();
  dragging = false;
});

sprite.addEventListener("pointercancel", () => {
  window.clearTimeout(holdTimer);
  dragging = false;
});

sprite.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  openMenu(event.clientX, event.clientY);
});

document.addEventListener("pointerdown", (event) => {
  if (!isMobileWeb && menuOpen && !menu.contains(event.target as Node)) closeMenu();
});

menu.addEventListener("click", async (event) => {
  const target = event.target as HTMLButtonElement;
  const action = target.dataset.action;
  const scale = target.dataset.scale;

  if (scale) {
    setScale(Number(scale));
    closeMenu();
    return;
  }

  switch (action) {
    case "wave":
      playOneShot("wave");
      break;
    case "jump":
      playOneShot("jump");
      break;
    case "wander":
      preferences.wander = !preferences.wander;
      animator.play(preferences.wander ? "walkRight" : "idle");
      savePreferences();
      break;
    case "always-on-top":
      preferences.alwaysOnTop = !preferences.alwaysOnTop;
      await nativeInvoke("set_always_on_top", { enabled: preferences.alwaysOnTop });
      savePreferences();
      break;
    case "click-through":
      await nativeInvoke("set_click_through", { enabled: true });
      showBubble("Use tray menu to restore clicks");
      break;
    case "quit":
      await nativeInvoke("quit_app");
      return;
  }

  closeMenu();
});

sprite.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    playOneShot("wave");
  }
});

const wanderTick = async (): Promise<void> => {
  if (!preferences.wander || dragging || (!isMobileWeb && menuOpen)) return;
  const animation = wanderDirection === 1 ? "walkRight" : "walkLeft";
  if (animator.current !== animation) animator.play(animation);

  try {
    const result = await nativeInvoke<MoveResult>("nudge_window", {
      dx: 8 * wanderDirection,
      dy: 0
    });
    if (result.hitRight) wanderDirection = -1;
    if (result.hitLeft) wanderDirection = 1;
    preferences.position = { x: result.x, y: result.y };
    if (isMobileWeb) stage.style.setProperty("--pet-x", `${result.x}px`);
  } catch (error) {
    console.warn("Timi could not wander", error);
    preferences.wander = false;
    animator.play("idle");
  }
};

const animate = (now: number): void => {
  animator.tick(now);

  if (!preferences.wander && animator.current === "idle" && now >= nextLookAt) {
    const direction = Math.floor(Math.random() * 16);
    animator.look(direction);
    nextLookAt = now + 5000 + Math.random() * 5000;
  }

  requestAnimationFrame(animate);
};

const initialize = async (): Promise<void> => {
  sprite.style.backgroundImage = `url('${import.meta.env.BASE_URL}timi/spritesheet.webp')`;
  sprite.style.backgroundSize = `${ATLAS_WIDTH}px ${ATLAS_HEIGHT}px`;
  setScale(preferences.scale);
  updateMenuLabels();

  if (isMobileWeb) {
    menu.classList.remove("hidden");
    menuOpen = true;
  }

  await nativeInvoke("set_always_on_top", { enabled: preferences.alwaysOnTop });
  if (preferences.position) {
    await nativeInvoke("restore_position", {
      x: preferences.position.x,
      y: preferences.position.y
    });
    if (isMobileWeb) {
      preferences.position = await nativeInvoke<WindowPosition>("window_position");
      stage.style.setProperty("--pet-x", `${preferences.position.x}px`);
    }
  }
  await nativeInvoke("show_window");

  window.setInterval(() => void wanderTick(), 115);
  requestAnimationFrame(animate);

  if (!isTauriRuntime && import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.info("Offline mode is unavailable", error);
    });
  }
};

void initialize().catch((error) => {
  console.error("Timi failed to initialize", error);
  showBubble("Could not start");
});
