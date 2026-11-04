use std::{fs, path::PathBuf, sync::Mutex, time::Duration};
#[cfg(windows)]
use std::process::Command;

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::UpdaterExt;

#[derive(Clone, Default, Serialize, Deserialize)]
struct DesktopPreferences {
    autostart: Option<bool>,
    start_minimized: bool,
}

#[derive(Clone, Serialize, Deserialize)]
struct NavigationTarget {
    tab: String,
    session: Option<String>,
}

#[derive(Default)]
struct NavigationState(Mutex<Option<NavigationTarget>>);

#[derive(Serialize)]
struct DesktopInfo {
    current_version: String,
    available_version: Option<String>,
    notes: Option<String>,
    portable: bool,
    configured: bool,
}

fn portable_directory() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let directory = exe.parent()?;
    directory
        .join(".portable")
        .is_file()
        .then(|| directory.to_path_buf())
}

fn is_portable() -> bool {
    portable_directory().is_some()
}

/// The portable edition stores its WebView2 profile next to its executable.
/// This is set before any WebView2 window can be initialized.
fn prepare_portable_profile() {
    if let Some(directory) = portable_directory() {
        let data = directory.join("data");
        if fs::create_dir_all(&data).is_ok() {
            std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", data.join("WebView2"));
        }
    }
}

fn preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(directory) = portable_directory() {
        return Ok(directory.join("data").join("desktop-preferences.json"));
    }
    let folder = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(folder.join("desktop-preferences.json"))
}

fn read_preferences(app: &AppHandle) -> DesktopPreferences {
    preferences_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn save_preferences(app: &AppHandle, preferences: &DesktopPreferences) -> Result<(), String> {
    let path = preferences_path(app)?;
    let parent = path.parent().ok_or("No preferences directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temp = path.with_extension("tmp");
    let serialized = serde_json::to_vec_pretty(preferences).map_err(|e| e.to_string())?;
    fs::write(&temp, serialized).map_err(|e| e.to_string())?;
    // Prefer rename after writing so a sudden shutdown does not leave a partial JSON file.
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    fs::rename(temp, path).map_err(|e| e.to_string())
}



fn write_autostart_diagnostic(message: &str) {
    let path = std::env::temp_dir().join("EmbroideryStatement-autostart-diagnostic.txt");
    let _ = fs::write(path, message);
}

#[cfg(windows)]
fn set_windows_autostart_registry(enabled: bool) -> Result<(), String> {
    const RUN_KEY: &str = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";
    let mut command = Command::new("reg.exe");
    if enabled {
        let executable = std::env::current_exe().map_err(|e| e.to_string())?;
        let launch_command = format!("\"{}\" --autostart", executable.display());
        command.arg("ADD").arg(RUN_KEY).arg("/V").arg("Embroidery Statement")
            .arg("/T").arg("REG_SZ").arg("/D").arg(launch_command).arg("/F");
    } else {
        command.arg("DELETE").arg(RUN_KEY).arg("/V").arg("Embroidery Statement").arg("/F");
    }
    let output = command.output().map_err(|e| format!("Windows startup registry command failed: {e}"))?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if !enabled && message.to_lowercase().contains("unable to find") { return Ok(()); }
        return Err(if message.is_empty() { "Windows startup registry update failed.".into() } else { message });
    }
    Ok(())
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn navigate_to(app: &AppHandle, tab: &str, session: Option<&str>) {
    let target = NavigationTarget {
        tab: tab.to_string(),
        session: session.map(str::to_string),
    };
    if let Some(state) = app.try_state::<NavigationState>() {
        if let Ok(mut pending) = state.0.lock() {
            *pending = Some(target.clone());
        }
    }
    show_main(app);
    let _ = app.emit("desktop:navigate", target);
}

#[tauri::command]
fn desktop_take_navigation(state: tauri::State<'_, NavigationState>) -> Option<NavigationTarget> {
    state.0.lock().ok().and_then(|mut pending| pending.take())
}

fn update_is_configured() -> bool {
    option_env!("EMBROIDERY_UPDATE_PUBLIC_KEY")
        .map(|key| !key.trim().is_empty())
        .unwrap_or(false)
}

fn current_info(app: &AppHandle) -> DesktopInfo {
    DesktopInfo {
        current_version: app.package_info().version.to_string(),
        available_version: None,
        notes: None,
        portable: is_portable(),
        configured: update_is_configured(),
    }
}

#[tauri::command]
fn desktop_info(app: AppHandle) -> DesktopInfo {
    current_info(&app)
}

#[tauri::command]
fn desktop_get_autostart(app: AppHandle) -> Result<bool, String> {
    if is_portable() {
        return Ok(false);
    }
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn desktop_set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    if is_portable() {
        return Err("Portable builds do not register Windows startup.".into());
    }
    #[cfg(windows)]
    set_windows_autostart_registry(enabled)?;
    #[cfg(not(windows))]
    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())?;
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())?;
    }
    let mut preferences = read_preferences(&app);
    preferences.autostart = Some(enabled);
    save_preferences(&app, &preferences)
}

#[tauri::command]
fn desktop_get_start_minimized(app: AppHandle) -> bool {
    read_preferences(&app).start_minimized
}

#[tauri::command]
fn desktop_set_start_minimized(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut preferences = read_preferences(&app);
    preferences.start_minimized = enabled;
    save_preferences(&app, &preferences)
}

#[tauri::command]
fn desktop_notify_attendance(
    app: AppHandle,
    title: String,
    body: String,
    session: String,
) -> Result<(), String> {
    if session != "morning" && session != "night" {
        return Err("Invalid attendance session".into());
    }
    if is_portable() {
        return Err("Windows toast notifications require the installed edition.".into());
    }
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn desktop_notify_update(app: AppHandle, version: String) -> Result<(), String> {
    if is_portable() {
        return Ok(());
    }
    app.notification()
        .builder()
        .title("Embroidery Statement — Update Available")
        .body(format!(
            "Version {version} is available. Open Settings to update securely."
        ))
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn desktop_test_notification(app: AppHandle, language: String) -> Result<(), String> {
    if is_portable() {
        return Err("Portable edition may not have a Windows notification identity.".into());
    }
    let (title, body) = if language == "bn" {
        (
            "Embroidery Statement — হাজিরা",
            "এটি একটি পরীক্ষামূলক নোটিফিকেশন।",
        )
    } else {
        (
            "Embroidery Statement — Attendance",
            "This is a test attendance notification.",
        )
    };
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn desktop_check_update(app: AppHandle) -> Result<DesktopInfo, String> {
    let mut info = current_info(&app);
    if info.portable || !info.configured {
        return Ok(info);
    }
    let updater = app.updater().map_err(|e| e.to_string())?;
    let available = updater.check().await.map_err(|e| e.to_string())?;
    if let Some(update) = available {
        info.available_version = Some(update.version);
        info.notes = update.body;
    }
    Ok(info)
}

#[tauri::command]
async fn desktop_install_update(app: AppHandle) -> Result<(), String> {
    if is_portable() {
        return Err("Portable edition updates are manual to preserve the data folder.".into());
    }
    if !update_is_configured() {
        return Err("Updater signing public key has not been configured.".into());
    }
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;
    let update = update.ok_or("No newer signed update is available")?;
    let handle = app.clone();
    let mut downloaded: u64 = 0;
    update
        .download_and_install(
            move |chunk_length, total_length| {
                downloaded += chunk_length as u64;
                let _ = handle.emit(
                    "desktop:update-progress",
                    serde_json::json!({
                        "downloaded": downloaded,
                        "total": total_length,
                    }),
                );
            },
            || {},
        )
        .await
        .map_err(|e| e.to_string())?;
    // Windows installers may terminate the old process as part of installation.
    app.restart();
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Embroidery Statement", true, None::<&str>)?;
    let attendance = MenuItem::with_id(app, "attendance", "Open Attendance", true, None::<&str>)?;
    let updates = MenuItem::with_id(app, "updates", "Check for Updates", true, None::<&str>)?;
    let reminders = MenuItem::with_id(
        app,
        "reminders",
        "Attendance Reminder Settings",
        true,
        None::<&str>,
    )?;
    let exit = MenuItem::with_id(app, "exit", "Exit Application", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &attendance, &updates, &reminders, &exit])?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "attendance" => navigate_to(app, "workers", Some("morning")),
            "updates" => {
                navigate_to(app, "settings", None);
                let _ = app.emit("desktop:check-updates", ());
            }
            "reminders" => navigate_to(app, "settings", None),
            "exit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                show_main(&tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

fn enable_autostart_on_first_installed_run(app: &AppHandle) {
    if is_portable() {
        write_autostart_diagnostic("Skipped: portable marker exists beside the installed executable.");
        return;
    }
    let mut preferences = read_preferences(app);
    if let Some(value) = preferences.autostart {
        write_autostart_diagnostic(&format!("Skipped: stored autostart preference is {value:?}."));
        return;
    }
    #[cfg(windows)]
    let result = set_windows_autostart_registry(true);
    #[cfg(not(windows))]
    let result = app.autolaunch().enable().map_err(|e| e.to_string());
    match result {
        Ok(()) => {
            preferences.autostart = Some(true);
            let save_result = save_preferences(app, &preferences);
            write_autostart_diagnostic(&format!("Registry enable succeeded; preference save: {save_result:?}."));
        }
        Err(error) => {
            write_autostart_diagnostic(&format!("Registry enable failed: {error}"));
            eprintln!("Unable to register Embroidery Statement for sign-in: {error}");
        }
    }
}

pub fn run() {
    prepare_portable_profile();

    // Used only by the Windows installer CI smoke test. The installed app sends
    // a real OS notification, then exits so the runner can verify dispatch.
    let args = std::env::args().collect::<Vec<_>>();
    let test_notification = args.iter().any(|arg| arg == "--test-notification");
    let exit_after_test_notification = args.iter().any(|arg| arg == "--exit-after-test-notification");

    let mut builder = tauri::Builder::default()
        // Must be registered first so duplicate Windows launches focus the existing process.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("Embroidery Statement")
                .args(["--autostart"])
                .build(),
        );

    if update_is_configured() {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .manage(NavigationState::default())
        .invoke_handler(tauri::generate_handler![
            desktop_take_navigation,
            desktop_info,
            desktop_get_autostart,
            desktop_set_autostart,
            desktop_get_start_minimized,
            desktop_set_start_minimized,
            desktop_notify_attendance,
            desktop_notify_update,
            desktop_test_notification,
            desktop_check_update,
            desktop_install_update,
        ])
        .setup(move |app| {
            setup_tray(app)?;
            let handle = app.handle().clone();
            enable_autostart_on_first_installed_run(&handle);

            // Tauri Notification 2.6+ delivers live Windows-toast clicks.
            // Windows Action Center clicks after the toast disappears are not
            // guaranteed by the plugin; the tray remains the recovery route.
            let click_app = handle.clone();
            app.notification().on_action(move |action| {
                if action.action_id() != "tap" && action.action_id() != "open-attendance" {
                    return;
                }
                let notification = action.notification();
                let title = notification.and_then(|n| n.title()).unwrap_or_default();
                let body = notification.and_then(|n| n.body()).unwrap_or_default();
                if title.contains("Update") {
                    navigate_to(&click_app, "settings", None);
                } else if title.contains("Attendance") || title.contains("হাজিরা") {
                    let session = if body.contains("night") || body.contains("রাতের") {
                        "night"
                    } else {
                        "morning"
                    };
                    navigate_to(&click_app, "workers", Some(session));
                }
            })?;

            if test_notification {
                if is_portable() {
                    return Err("Windows notification smoke test requires an installed build.".into());
                }
                app.notification()
                    .builder()
                    .title("Embroidery Statement — Windows Toast Test")
                    .body("Windows desktop notification dispatch test.")
                    .show()?;

                if exit_after_test_notification {
                    let test_handle = handle.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(Duration::from_secs(2));
                        test_handle.exit(0);
                    });
                }
            }

            if std::env::args().any(|arg| arg == "--autostart")
                && read_preferences(&handle).start_minimized
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            // Native Rust clock survives window hide/minimize. WebView verifies the
            // Supabase rows after each tick and uses RLS-scoped credentials.
            let background = handle.clone();
            tauri::async_runtime::spawn(async move {
                let mut ticker = tokio::time::interval(Duration::from_secs(20));
                ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
                loop {
                    ticker.tick().await;
                    let _ = background.emit("desktop:scheduler-tick", ());
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("failed to start Embroidery Statement desktop application");
}
