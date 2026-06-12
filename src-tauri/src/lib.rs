mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_image_as_base64,
            commands::save_json,
            commands::save_file,
            commands::get_image_dimensions,
            commands::export_template_sheet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}