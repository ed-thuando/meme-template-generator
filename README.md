# Meme Generator

Desktop app (Tauri + React) để thiết kế meme template: đặt **partition** → **slot** (vị trí ảnh đội/cầu thủ) trên ảnh nền, export ảnh gốc + metadata vào `sheet.csv`.

## Yêu cầu hệ thống

### macOS

| Tool | Phiên bản | Cài đặt |
|------|-----------|---------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org/) hoặc `brew install node` |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Xcode CLT | — | `xcode-select --install` |

### Windows

| Tool | Phiên bản | Cài đặt |
|------|-----------|---------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org/) |
| Rust | stable | [rustup.rs](https://rustup.rs/) |
| Visual Studio Build Tools | 2022 | [Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) — chọn **Desktop development with C++** |
| WebView2 | — | Thường có sẵn trên Windows 11; Win10: [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) |

## Clone & cài dependency

```bash
git clone <repo-url> meme-template-generator
cd meme-template-generator
npm ci
```

## Chạy dev (khuyến nghị)

Script tự cài npm deps, giải phóng port **1420/1421**, tạo thư mục output, rồi mở app:

```bash
chmod +x run_tauri.sh   # lần đầu
./run_tauri.sh
```

Tương đương thủ công:

```bash
npm ci
npm run tauri dev
```

App chạy tại `http://localhost:1420` (webview Tauri).

### Export khi dev

Mỗi lần bấm **Export**:

- Ảnh nền gốc → `~/Downloads/meme-output/images/`
- Metadata partition/slot → append `~/Downloads/meme-output/sheet.csv`

## Build installer

### macOS → `.dmg`

```bash
chmod +x build_release.sh   # lần đầu
./build_release.sh
```

File cài đặt nằm trong thư mục **`release/`** (ví dụ `Meme Generator_1.0.0_universal.dmg`).

Universal binary (Intel + Apple Silicon), cần thêm target Rust:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
rustup target add universal-apple-darwin
```

Mở DMG → kéo **Meme Generator** vào Applications.

> macOS có thể chặn app chưa ký: **System Settings → Privacy & Security → Open Anyway**.

### Windows → `.exe`

Chạy trên máy Windows (PowerShell):

```powershell
.\build_release.ps1
```

Installer NSIS nằm trong **`release\`** (ví dụ `Meme Generator_1.0.0_x64-setup.exe`).

> Không build được `.exe` trên macOS trực tiếp — cần máy Windows hoặc GitHub Actions (xem bên dưới).

### CI — build cả Mac + Windows

Push tag `v*` hoặc chạy thủ công workflow **Build Release**:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Tải artifact `.dmg` / `.exe` từ tab **Actions** trên GitHub.

## Cấu trúc `sheet.csv`

```csv
image_path,image_width,image_height,partition,partition_order,slot_name,slot_order,shape,x,y,width,height,angle
```

Mỗi **slot** = một dòng. Cùng ảnh nền có thể có nhiều partition, mỗi partition nhiều slot.

## Workflow thiết kế template

1. **Open Image** — chọn ảnh nền meme
2. **+ Add Partition** — tạo phần ghép (vd: trận 1, trận 2)
3. Chọn partition → **+ Add Slot** — đặt vùng ảnh đội (kéo/thả trên canvas)
4. **+ Add Text** — thêm chữ (tuỳ chọn)
5. **Export** — lưu ảnh gốc + append CSV

## Scripts

| Script | Mục đích |
|--------|----------|
| `./run_tauri.sh` | Dev: deps + kill port + `tauri dev` |
| `./build_release.sh` | Release macOS `.dmg` → `release/` |
| `.\build_release.ps1` | Release Windows `.exe` → `release/` |

## Test

```bash
npm test              # unit (Vitest)
npm run test:e2e      # E2E (Playwright, cần dev server)
```

## Legacy Streamlit UI

Prototype cũ (Python):

```bash
pip install streamlit streamlit-drawable-canvas pillow
streamlit run app.py
```

App chính hiện tại là Tauri desktop ở trên.
