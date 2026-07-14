use serde::Serialize;
use std::sync::Mutex;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, PhysicalPosition, Position, State, WebviewWindow,
};

#[derive(Default)]
struct PetState {
    click_through: Mutex<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowPosition {
    x: i32,
    y: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MoveResult {
    x: i32,
    y: i32,
    hit_left: bool,
    hit_right: bool,
}

fn display_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[tauri::command]
fn show_window(window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(display_error)
}

#[tauri::command]
fn start_dragging(window: WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(display_error)
}

#[tauri::command]
fn window_position(window: WebviewWindow) -> Result<WindowPosition, String> {
    let position = window.outer_position().map_err(display_error)?;
    Ok(WindowPosition {
        x: position.x,
        y: position.y,
    })
}

#[tauri::command]
fn restore_position(window: WebviewWindow, x: i32, y: i32) -> Result<(), String> {
    window
        .set_position(Position::Physical(PhysicalPosition::new(x, y)))
        .map_err(display_error)
}

#[tauri::command]
fn set_always_on_top(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(display_error)
}

#[tauri::command]
fn set_click_through(
    window: WebviewWindow,
    state: State<'_, PetState>,
    enabled: bool,
) -> Result<(), String> {
    window
        .set_ignore_cursor_events(enabled)
        .map_err(display_error)?;
    *state.click_through.lock().map_err(display_error)? = enabled;
    Ok(())
}

#[tauri::command]
fn nudge_window(window: WebviewWindow, dx: i32, dy: i32) -> Result<MoveResult, String> {
    let current = window.outer_position().map_err(display_error)?;
    let window_size = window.outer_size().map_err(display_error)?;
    let monitor = window
        .current_monitor()
        .map_err(display_error)?
        .ok_or_else(|| "No active monitor found".to_string())?;

    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let min_x = monitor_position.x;
    let min_y = monitor_position.y;
    let max_x = min_x + monitor_size.width as i32 - window_size.width as i32;
    let max_y = min_y + monitor_size.height as i32 - window_size.height as i32;
    let requested_x = current.x + dx;
    let requested_y = current.y + dy;
    let x = requested_x.clamp(min_x, max_x.max(min_x));
    let y = requested_y.clamp(min_y, max_y.max(min_y));

    window
        .set_position(Position::Physical(PhysicalPosition::new(x, y)))
        .map_err(display_error)?;

    Ok(MoveResult {
        x,
        y,
        hit_left: requested_x <= min_x,
        hit_right: requested_x >= max_x,
    })
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

fn place_at_bottom_right(window: &WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = window.current_monitor()? else {
        return Ok(());
    };
    let window_size = window.outer_size()?;
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let x = monitor_position.x + monitor_size.width as i32 - window_size.width as i32 - 24;
    let y = monitor_position.y + monitor_size.height as i32 - window_size.height as i32 - 44;
    window.set_position(Position::Physical(PhysicalPosition::new(x, y)))
}

pub fn run() {
    tauri::Builder::default()
        .manage(PetState::default())
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show Timi", true, None::<&str>)?;
            let click_item = CheckMenuItem::with_id(
                app,
                "click-through",
                "Click through",
                true,
                false,
                None::<&str>,
            )?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Timi", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &click_item, &quit_item])?;
            let click_item_for_menu = click_item.clone();

            let mut tray = TrayIconBuilder::new()
                .tooltip("Timi desktop pet")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.set_ignore_cursor_events(false);
                            let _ = click_item_for_menu.set_checked(false);
                            if let Ok(mut state) = app.state::<PetState>().click_through.lock() {
                                *state = false;
                            }
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "click-through" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(mut state) = app.state::<PetState>().click_through.lock() {
                                *state = !*state;
                                let _ = window.set_ignore_cursor_events(*state);
                                let _ = click_item_for_menu.set_checked(*state);
                            }
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                });

            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                place_at_bottom_right(&window)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_window,
            start_dragging,
            window_position,
            restore_position,
            set_always_on_top,
            set_click_through,
            nudge_window,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running Timi");
}
