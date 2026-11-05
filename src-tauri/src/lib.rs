#[cfg(desktop)]
use std::{sync::Mutex, time::Duration};

use tauri::AppHandle;
#[cfg(desktop)]
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

#[cfg(desktop)]
use std::{fs, path::PathBuf};
#[cfg(desktop)]
use serde::{Deserialize, Serialize};
#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
};
#[cfg(desktop)]
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

#[cfg(desktop)]
#[derive(Clone, Default, Serialize, Deserialize)]
struct DesktopPreferences {
    autostart: Option<bool>,
    start_minimized: bool,
}

#[cfg(desktop)]
#[derive(Clone, Serialize, Deserialize)]
struct NavigationTarget {
    tab: String,
    session: Option<String>,
}

#[cfg(desktop)]
#[derive(Default)]
struct NavigationState(Mutex<Option<NavigationTarget>>);

#[cfg(desktop)]
#[derive(Serialize)]
struct DesktopInfo {
    current_version: String,
    available_version: Option<String>,
    notes: Option<String>,
    portable: bool,
    configured: bool,
}

#[cfg(desktop)]
fn portable_directory() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let directory = exe.parent()?;
    directory.join(".portable").is_file().then(|| directory.to_path_buf())
}

#[cfg(desktop)]
fn is_portable() -> bool {
    portable_directory().is_some()
}

#[cfg(desktop)]
fn prepare_portable_profile() {
    if let Some(directory) = portable_directory() {
        let data = directory.join("data");
        if fs::create_dir_all(&data).is_ok() {
            std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", data.join("WebView2"));
        }
    }
}

#[cfg(desktop)]
fn preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(directory) = portable_directory() {
        return Ok(directory.join("data").join("desktop-preferences.json"));
    }
    let folder = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(folder.join("desktop-preferences.json"))
}

#[cfg(desktop)]
fn read_preferences(app: &AppHandle) -> DesktopPreferences {
    preferences_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

#[cfg(desktop)]
fn save_preferences(app: &AppHandle, preferences: &DesktopPreferences) -> Result<(), String> {
    let path = preferences_path(app)?;
    let parent = path.parent().ok_or("No preferences directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temp = path.with_extension("tmp");
    let serialized = serde_json::to_vec_pretty(preferences).map_err(|e| e.to_string())?;
    fs::write(&temp, serialized).map_err(|e| e.to_string())?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    fs::rename(temp, path).map_err(|e| e.to_string())
}

#[cfg(desktop)]
fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(desktop)]
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

#[cfg(desktop)]
#[tauri::command]
fn desktop_take_navigation(state: tauri::State<'_, NavigationState>) -> Option<NavigationTarget> {
    state.0.lock().ok().and_then(|mut pending| pending.take())
}

#[cfg(desktop)]
fn update_is_configured() -> bool {
    option_env!("EMBROIDERY_UPDATE_PUBLIC_KEY")
        .map(|key| !key.trim().is_empty())
        .unwrap_or(false)
}

#[cfg(desktop)]
fn current_info(app: &AppHandle) -> DesktopInfo {
    DesktopInfo {
        current_version: app.package_info().version.to_string(),
        available_version: None,
        notes: None,
        portable: is_portable(),
        configured: update_is_configured(),
    }
}

#[cfg(desktop)]
#[tauri::command]
fn desktop_info(app: AppHandle) -> DesktopInfo {
    current_info(&app)
}

#[cfg(desktop)]
#[tauri::command]
fn desktop_get_autostart(app: AppHandle) -> Result<bool, String> {
    if is_portable() { return Ok(false); }
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[cfg(desktop)]
#[tauri::command]
fn desktop_set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    if is_portable() { return Err("Portable builds do not register Windows startup.".into()); }
    if enabled { app.autolaunch().enable().map_err(|e| e.to_string())?; }
    else { app.autolaunch().disable().map_err(|e| e.to_string())?; }
    let mut preferences = read_preferences(&app);
    preferences.autostart = Some(enabled);
    save_preferences(&app, &preferences)
}

#[cfg(desktop)]
#[tauri::command]
fn desktop_get_start_minimized(app: AppHandle) -> bool {
    read_preferences(&app).start_minimized
}

#[cfg(desktop)]
#[tauri::command]
fn desktop_set_start_minimized(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut preferences = read_preferences(&app);
    preferences.start_minimized = enabled;
    save_preferences(&app, &preferences)
}

#[tauri::command]
fn desktop_notify_message(app: AppHandle, title: String, body: String) -> Result<(), String> {
    let clean_title: String = title.chars().take(120).collect();
    let clean_body: String = body.chars().take(900).collect();
    if clean_title.trim().is_empty() || clean_body.trim().is_empty() {
        return Err("Notification title and body are required.".into());
    }
    app.notification()
        .builder()
        .title(clean_title)
        .body(clean_body)
        .show()
        .map_err(|e| e.to_string())
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
    #[cfg(desktop)]
    if is_portable() {
        return Err("Windows toast notifications require the installed edition.".into());
    }
    app.notification().builder().title(title).body(body).show().map_err(|e| e.to_string())
}

#[cfg(desktop)]
#[tauri::command]
fn desktop_notify_update(app: AppHandle, version: String) -> Result<(), String> {
    if is_portable() { return Ok(()); }
    app.notification()
        .builder()
        .title("Embroidery Statement — Update Available")
        .body(format!("Version {version} is available. The update will be installed securely."))
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn desktop_test_notification(app: AppHandle, language: String) -> Result<(), String> {
    #[cfg(desktop)]
    if is_portable() {
        return Err("Portable edition may not have a Windows notification identity.".into());
    }
    let (title, body) = if language == "bn" {
        ("Embroidery Statement — Notification Test", "এটি একটি পরীক্ষামূলক নোটিফিকেশন।")
    } else {
        ("Embroidery Statement — Notification Test", "This is a test notification.")
    };
    app.notification().builder().title(title).body(body).show().map_err(|e| e.to_string())
}

#[cfg(desktop)]
#[tauri::command]
async fn desktop_check_update(app: AppHandle) -> Result<DesktopInfo, String> {
    let mut info = current_info(&app);
    if info.portable || !info.configured { return Ok(info); }
    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(available) = updater.check().await.map_err(|e| e.to_string())? {
        info.available_version = Some(available.version);
        info.notes = available.body;
    }
    Ok(info)
}

#[cfg(desktop)]
#[tauri::command]
async fn desktop_install_update(app: AppHandle) -> Result<(), String> {
    if is_portable() { return Err("Portable edition updates are manual to preserve the data folder.".into()); }
    if !update_is_configured() { return Err("Updater signing public key has not been configured.".into()); }
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?.ok_or("No newer signed update is available")?;
    let handle = app.clone();
    let mut downloaded: u64 = 0;
    update.download_and_install(
        move |chunk_length, total_length| {
            downloaded += chunk_length as u64;
            let _ = handle.emit("desktop:update-progress", serde_json::json!({
                "downloaded": downloaded, "total": total_length
            }));
        },
        || {},
    ).await.map_err(|e| e.to_string())?;
    app.restart();
}

#[cfg(desktop)]
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let owner_build = app.package_info().name.to_lowercase().contains("owner");
    let app_label = if owner_build { "Open Owner Control Center" } else { "Open Embroidery Statement" };
    let open = MenuItem::with_id(app, "open", app_label, true, None::<&str>)?;
    let attendance = MenuItem::with_id(app, "attendance", "Open Attendance", !owner_build, None::<&str>)?;
    let updates = MenuItem::with_id(app, "updates", "Check for Updates", true, None::<&str>)?;
    let reminders = MenuItem::with_id(app, "reminders", "Attendance Reminder Settings", !owner_build, None::<&str>)?;
    let exit = MenuItem::with_id(app, "exit", "Exit Application", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &attendance, &updates, &reminders, &exit])?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "attendance" => navigate_to(app, "workers", Some("morning")),
            "updates" => {
                #[cfg(not(any()))]
                {}
                let _ = app.emit("desktop:check-updates", ());
                show_main(app);
            }
            "reminders" => { show_main(app); let _ = app.emit("desktop:navigate", NavigationTarget { tab:"settings".into(), session:None }); }
            "exit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event { show_main(&tray.app_handle()); }
        });
    if let Some(icon) = app.default_window_icon() { tray = tray.icon(icon.clone()); }
    tray.build(app)?;
    Ok(())
}

#[cfg(desktop)]
fn enable_autostart_on_first_installed_run(app: &AppHandle) {
    if is_portable() { return; }
    let mut preferences = read_preferences(app);
    if preferences.autostart.is_none() {
        match app.autolaunch().enable() {
            Ok(()) => { preferences.autostart = Some(true); let _ = save_preferences(app, &preferences); }
            Err(error) => eprintln!("Unable to register application for Windows sign-in: {error}"),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(desktop)]
    prepare_portable_profile();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| { show_main(app); }))
            .plugin(tauri_plugin_autostart::Builder::new()
                .app_name(if option_env!("EMBROIDERY_OWNER_BUILD").is_some() { "Embroidery Statement Owner Control Center" } else { "Embroidery Statement" })
                .args(["--autostart"]).build());
        if update_is_configured() {
            builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
        }
        builder = builder.manage(NavigationState::default()).invoke_handler(tauri::generate_handler![
            desktop_take_navigation, desktop_info, desktop_get_autostart, desktop_set_autostart,
            desktop_get_start_minimized, desktop_set_start_minimized, desktop_notify_message,
            desktop_notify_attendance, desktop_notify_update, desktop_test_notification,
            desktop_check_update, desktop_install_update
        ]);
    }

    #[cfg(mobile)]
    {
        builder = builder.invoke_handler(tauri::generate_handler![
            desktop_notify_message, desktop_notify_attendance, desktop_test_notification
        ]);
    }

    builder = builder.setup(move |app| {
        #[cfg(desktop)]
        {
            setup_tray(app)?;
            let handle = app.handle().clone();
            enable_autostart_on_first_installed_run(&handle);

            let click_app = handle.clone();
            app.notification().on_action(move |action| {
                if action.action_id() != "tap" && action.action_id() != "open-attendance" { return; }
                let notification = action.notification();
                let title = notification.and_then(|n| n.title()).unwrap_or_default();
                let body = notification.and_then(|n| n.body()).unwrap_or_default();
                if title.contains("Update") { navigate_to(&click_app, "settings", None); }
                else if title.contains("Attendance") || title.contains("হাজিরা") {
                    let session = if body.contains("night") || body.contains("রাতের") { "night" } else { "morning" };
                    navigate_to(&click_app, "workers", Some(session));
                }
            })?;

            let args = std::env::args().collect::<Vec<_>>();
            let test_notification = args.iter().any(|arg| arg == "--test-notification");
            let exit_after_test_notification = args.iter().any(|arg| arg == "--exit-after-test-notification");
            if test_notification {
                if is_portable() { return Err("Notification smoke test requires an installed build.".into()); }
                app.notification().builder()
                    .title("Embroidery Statement — Native Notification Test")
                    .body("Native notification dispatch test.")
                    .show()?;
                if exit_after_test_notification {
                    let test_handle = handle.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(Duration::from_secs(2));
                        test_handle.exit(0);
                    });
                }
            }

            if args.iter().any(|arg| arg == "--autostart") && read_preferences(&handle).start_minimized {
                if let Some(window) = app.get_webview_window("main") { let _ = window.hide(); }
            }
        }

        #[cfg(desktop)]
        {
            let background = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut ticker = tokio::time::interval(Duration::from_secs(20));
                ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
                loop { ticker.tick().await; let _ = background.emit("desktop:scheduler-tick", ()); }
            });
        }
        Ok(())
    });

    #[cfg(desktop)]
    {
        builder = builder.on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        });
    }

    builder.run(tauri::generate_context!()).expect("failed to start Embroidery Statement application");
}
