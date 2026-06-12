use tauri::command;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(serde::Deserialize)]
pub struct SheetRowInput {
    pub partition: String,
    pub partition_order: u32,
    pub slot_name: String,
    pub slot_order: u32,
    pub shape: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub angle: f64,
}

const SHEET_HEADER: &str =
    "image_path,image_width,image_height,partition,partition_order,slot_name,slot_order,shape,x,y,width,height,angle";

fn csv_escape(s: &str) -> String {
    s.replace('"', "\"\"")
}

fn write_origin_image(
    images_dir: &Path,
    origin_path: &str,
    origin_base64: Option<&str>,
) -> Result<PathBuf, String> {
    fs::create_dir_all(images_dir).map_err(|e| format!("Failed to create output dir: {}", e))?;

    if let Some(b64) = origin_base64 {
        let payload = b64.rsplit(',').next().unwrap_or(b64);
        let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, payload)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;
        let filename = format!("origin-{}.png", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0));
        let dest = images_dir.join(filename);
        fs::write(&dest, &bytes).map_err(|e| format!("Failed to write image: {}", e))?;
        return Ok(dest);
    }

    let src = PathBuf::from(origin_path);
    if !src.exists() {
        return Err(format!("Origin image not found: {}", origin_path));
    }
    let filename = src
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("origin.png");
    let dest = images_dir.join(filename);
    fs::copy(&src, &dest).map_err(|e| format!("Failed to copy origin image: {}", e))?;
    Ok(dest)
}

/// Copy the origin image into `<output_dir>/images/` and append slot rows to
/// `<output_dir>/sheet.csv` (header written once).
fn export_template_sheet_impl(
    output_dir: &Path,
    origin_path: &str,
    origin_base64: Option<&str>,
    image_width: u32,
    image_height: u32,
    rows: &[SheetRowInput],
) -> Result<String, String> {
    let images_dir = output_dir.join("images");
    let saved = write_origin_image(&images_dir, origin_path, origin_base64)?;
    let image_path_str = csv_escape(&saved.to_string_lossy());

    let csv_path = output_dir.join("sheet.csv");
    let mut content = String::new();
    if !csv_path.exists() {
        content.push_str(SHEET_HEADER);
        content.push('\n');
    }
    for row in rows {
        content.push_str(&format!(
            "\"{}\",{}, {},\"{}\",{},\"{}\",{},\"{}\",{:.4},{:.4},{:.4},{:.4},{:.4}\n",
            image_path_str,
            image_width,
            image_height,
            csv_escape(&row.partition),
            row.partition_order,
            csv_escape(&row.slot_name),
            row.slot_order,
            csv_escape(&row.shape),
            row.x,
            row.y,
            row.width,
            row.height,
            row.angle,
        ));
    }
    if !content.is_empty() {
        let mut f = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&csv_path)
            .map_err(|e| format!("Failed to open sheet.csv: {}", e))?;
        f.write_all(content.as_bytes())
            .map_err(|e| format!("Failed to append sheet.csv: {}", e))?;
    }

    Ok(saved.to_string_lossy().to_string())
}

#[command]
pub fn export_template_sheet(
    output_dir: String,
    origin_path: String,
    origin_base64: Option<String>,
    image_width: u32,
    image_height: u32,
    rows: Vec<SheetRowInput>,
) -> Result<String, String> {
    export_template_sheet_impl(
        &PathBuf::from(output_dir),
        &origin_path,
        origin_base64.as_deref(),
        image_width,
        image_height,
        &rows,
    )
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

    const PNG_B64: &str =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    fn row(name: &str, partition: &str) -> SheetRowInput {
        SheetRowInput {
            partition: partition.into(),
            partition_order: 1,
            slot_name: name.into(),
            slot_order: 1,
            shape: "rectangle".into(),
            x: 10.0,
            y: 20.0,
            width: 12.0,
            height: 12.0,
            angle: 45.0,
        }
    }

    #[test]
    fn copies_origin_and_appends_sheet_with_header_once() {
        let dir = std::env::temp_dir().join(format!("meme-sheet-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let src = dir.join("src.png");
        fs::create_dir_all(&dir).unwrap();
        let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, PNG_B64).unwrap();
        fs::write(&src, &bytes).unwrap();

        let saved = export_template_sheet_impl(
            &dir,
            &src.to_string_lossy(),
            None,
            1200,
            800,
            &[row("Team A", "Match 1"), row("Team B", "Match 1")],
        )
        .unwrap();
        assert!(PathBuf::from(&saved).exists());

        export_template_sheet_impl(
            &dir,
            &src.to_string_lossy(),
            None,
            1200,
            800,
            &[row("Team C", "Match 2")],
        )
        .unwrap();

        let csv = fs::read_to_string(dir.join("sheet.csv")).unwrap();
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines[0], SHEET_HEADER);
        assert_eq!(lines.len(), 4);
        assert!(lines[1].contains("\"Team A\""));
        assert!(lines[1].contains("\"Match 1\""));
        assert!(lines[1].contains("1200"));
        assert!(lines[3].contains("\"Team C\""));

        let _ = fs::remove_dir_all(&dir);
    }
}
