use tauri::command;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(serde::Deserialize)]
pub struct SlotMeta {
    #[serde(default)]
    pub partition: Option<String>,
    pub name: String,
    pub shape: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub angle: f64,
}

fn csv_escape(s: &str) -> String {
    s.replace('"', "\"\"")
}

/// Save the rendered meme PNG into `<output_dir>/images/<filename>` and append
/// one row per slot to `<output_dir>/data.csv` (header written once). Returns
/// the saved image path.
fn export_meme_impl(
    output_dir: &Path,
    filename: &str,
    image_base64: &str,
    slots: &[SlotMeta],
) -> Result<String, String> {
    let images_dir = output_dir.join("images");
    fs::create_dir_all(&images_dir).map_err(|e| format!("Failed to create output dir: {}", e))?;

    // Accept either a raw base64 string or a full `data:...;base64,XXXX` URL.
    let b64 = image_base64.rsplit(',').next().unwrap_or(image_base64);
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, b64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let img_path = images_dir.join(filename);
    fs::write(&img_path, &bytes).map_err(|e| format!("Failed to write image: {}", e))?;

    let csv_path = output_dir.join("data.csv");
    let mut content = String::new();
    if !csv_path.exists() {
        content.push_str("image_path,partition,item_name,type,x,y,width,height,angle\n");
    }
    let img_path_str = csv_escape(&img_path.to_string_lossy());
    for s in slots {
        let partition = csv_escape(s.partition.as_deref().unwrap_or(""));
        content.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",{:.4},{:.4},{:.4},{:.4},{:.4}\n",
            img_path_str,
            partition,
            csv_escape(&s.name),
            csv_escape(&s.shape),
            s.x,
            s.y,
            s.width,
            s.height,
            s.angle,
        ));
    }
    let mut f = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&csv_path)
        .map_err(|e| format!("Failed to open csv: {}", e))?;
    f.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to append csv: {}", e))?;

    Ok(img_path.to_string_lossy().to_string())
}

#[command]
pub fn export_meme(
    output_dir: String,
    filename: String,
    image_base64: String,
    slots: Vec<SlotMeta>,
) -> Result<String, String> {
    export_meme_impl(&PathBuf::from(output_dir), &filename, &image_base64, &slots)
}

#[command]
pub fn read_image_as_base64(path: String) -> Result<String, String> {
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }
    let bytes = fs::read(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    Ok(format!("data:image/{};base64,{}",
        extension_to_mime(&path),
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes),
    ))
}

#[command]
pub fn save_json(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[command]
pub fn save_file(path: String, data: String) -> Result<(), String> {
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    fs::write(&path, bytes)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[command]
pub fn get_image_dimensions(path: String) -> Result<(u32, u32), String> {
    let bytes = fs::read(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    let img = image::load_from_memory(&bytes)
        .map_err(|e| format!("Failed to parse image: {}", e))?;
    Ok((img.width(), img.height()))
}

fn extension_to_mime(path: &str) -> &'static str {
    let lower = path.to_lowercase();
    if lower.ends_with(".png") {
        "png"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "jpeg"
    } else if lower.ends_with(".webp") {
        "webp"
    } else if lower.ends_with(".gif") {
        "gif"
    } else {
        "png"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // 1x1 transparent PNG, base64.
    const PNG_B64: &str =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    fn meta(name: &str) -> SlotMeta {
        SlotMeta {
            name: name.into(),
            shape: "rectangle".into(),
            x: 10.0,
            y: 20.0,
            width: 12.0,
            height: 12.0,
            angle: 45.0,
        }
    }

    #[test]
    fn writes_image_and_appends_csv_with_header_once() {
        let dir = std::env::temp_dir().join(format!("meme-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);

        let saved = export_meme_impl(&dir, "a.png", PNG_B64, &[meta("Cup"), meta("Coach")]).unwrap();
        assert!(PathBuf::from(&saved).exists());
        assert!(saved.ends_with("a.png"));

        // Second export appends, no duplicate header.
        export_meme_impl(&dir, "b.png", &format!("data:image/png;base64,{}", PNG_B64), &[meta("Flag")]).unwrap();

        let csv = fs::read_to_string(dir.join("data.csv")).unwrap();
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines[0], "image_path,partition,item_name,type,x,y,width,height,angle");
        // header + 2 rows (first export) + 1 row (second export) = 4 lines.
        assert_eq!(lines.len(), 4);
        assert_eq!(lines.iter().filter(|l| l.contains("item_name")).count(), 1);
        assert!(lines[1].contains("\"Cup\""));
        assert!(lines[3].contains("\"Flag\""));
        assert!(lines[1].contains("45.0000"));

        let _ = fs::remove_dir_all(&dir);
    }
}