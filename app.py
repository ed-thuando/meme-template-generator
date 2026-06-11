import streamlit as st
from PIL import Image, ImageDraw, ImageFont, ImageColor
import io
import os


def parse_color(c, default=(255, 200, 0, 128)):
    """Parse a CSS/hex color into an RGBA tuple.

    Fabric.js emits ``rgba(r,g,b,a)`` with a float 0-1 alpha, which PIL's
    ImageColor cannot parse, so handle that form explicitly.
    """
    if not c:
        return default
    c = c.strip()
    if c.startswith("rgba(") or c.startswith("rgb("):
        try:
            nums = c[c.index("(") + 1:c.index(")")].split(",")
            r, g, b = (int(float(nums[0])), int(float(nums[1])), int(float(nums[2])))
            a = int(float(nums[3]) * 255) if len(nums) > 3 else 255
            return (r, g, b, max(0, min(255, a)))
        except (ValueError, IndexError):
            return default
    try:
        rgb = ImageColor.getrgb(c)
        return rgb if len(rgb) == 4 else rgb + (255,)
    except ValueError:
        return default

# Compat shim: streamlit-drawable-canvas calls streamlit.elements.image.image_to_url,
# which moved to streamlit.elements.lib.image_utils and changed its 2nd arg from an
# int width to a LayoutConfig in newer Streamlit. Re-expose it with the old signature.
import streamlit.elements.image as _st_image
if not hasattr(_st_image, "image_to_url"):
    from streamlit.elements.lib.image_utils import image_to_url as _image_to_url

    def _compat_image_to_url(image, width, clamp, channels, output_format, image_id):
        layout_config = _st_image.create_layout_config(width=width)
        return _image_to_url(image, layout_config, clamp, channels, output_format, image_id)

    _st_image.image_to_url = _compat_image_to_url

from streamlit_drawable_canvas import st_canvas


def find_impact_font():
    paths = [
        "/Library/Fonts/Impact.ttf",
        "/System/Library/Fonts/Impact.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Impact.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def render_export(image: Image.Image, canvas_result, texts: list) -> Image.Image:
    img = image.copy().convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = img.size
    font_path = find_impact_font()

    if canvas_result and canvas_result.json_data:
        for obj in canvas_result.json_data.get("objects", []):
            if obj.get("type") == "circle":
                cx = obj.get("left", 0) + obj.get("radius", 0) * obj.get("scaleX", 1)
                cy = obj.get("top", 0) + obj.get("radius", 0) * obj.get("scaleY", 1)
                rx = obj.get("radius", 0) * obj.get("scaleX", 1)
                ry = obj.get("radius", 0) * obj.get("scaleY", 1)
                draw.ellipse(
                    [cx - rx, cy - ry, cx + rx, cy + ry],
                    fill=parse_color(obj.get("fill"), (255, 200, 0, 128)),
                    outline=parse_color(obj.get("stroke"), (255, 204, 0, 255)),
                    width=max(1, int(obj.get("strokeWidth", 1.5))),
                )
                label = ""
                if "label" in obj:
                    label = obj["label"]
                elif obj.get("name", "").startswith("Player"):
                    label = obj["name"]
                if label:
                    try:
                        lf = ImageFont.truetype(font_path, 14) if font_path else ImageFont.load_default()
                    except Exception:
                        lf = ImageFont.load_default()
                    lx = obj.get("left", 0) - len(label) * 3
                    ly = obj.get("top", 0) - 20
                    draw.text((lx, ly), label, fill="white", font=lf, stroke_width=1, stroke_fill="black")
            elif obj.get("type") in ("rect", "rectangle"):
                lx = obj.get("left", 0)
                ly = obj.get("top", 0)
                lw = obj.get("width", 0) * obj.get("scaleX", 1)
                lh = obj.get("height", 0) * obj.get("scaleY", 1)
                draw.rectangle(
                    [lx, ly, lx + lw, ly + lh],
                    fill=parse_color(obj.get("fill"), (0, 150, 255, 128)),
                    outline=parse_color(obj.get("stroke"), (0, 136, 255, 255)),
                    width=max(1, int(obj.get("strokeWidth", 1.5))),
                )

    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    for t in texts:
        tx = int((t["x"] / 100.0) * w)
        ty = int((t["y"] / 100.0) * h)
        fs = max(8, int((t["font_size"] / 100.0) * h))
        try:
            fnt = ImageFont.truetype(font_path, fs) if font_path else ImageFont.load_default()
        except Exception:
            fnt = ImageFont.load_default()
        draw.text(
            (tx, ty), t["text"],
            fill=t.get("color", "#FFFFFF"),
            font=fnt,
            stroke_width=max(1, int(fs / 15)),
            stroke_fill=t.get("stroke_color", "#000000"),
        )

    return img


def main():
    st.set_page_config(page_title="Meme Generator", page_icon="🖼️", layout="wide")

    if "image" not in st.session_state:
        st.session_state.image = None
        st.session_state.texts = []

    with st.sidebar:
        st.header("🖼️ Meme Generator")

        uploaded = st.file_uploader("Upload Image", type=["png", "jpg", "jpeg", "webp", "gif", "bmp"],
                                     key="file_uploader")
        if uploaded:
            img = Image.open(uploaded)
            if img.mode == "RGBA":
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3])
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
            st.session_state.image = img

        if st.session_state.image:
            if st.button("🗑️ Close Image"):
                st.session_state.image = None
                st.session_state.texts = []
                st.rerun()

            st.divider()

            drawing_mode = st.radio(
                "Drawing Mode",
                ["transform", "circle", "rect"],
                format_func=lambda x: {"transform": "🔲 Select/Move", "circle": "⭕ Head", "rect": "▬ Rectangle"}[x],
                horizontal=True,
            )

            shape_color = st.color_picker("Player Color", "#FFC800")
            stroke_color = st.color_picker("Stroke Color", "#000000")
            stroke_width = st.slider("Stroke Width", 1, 8, 2)

            st.divider()
            st.subheader("📝 Text Overlays")

            if st.button("➕ Add Text"):
                st.session_state.texts.append({
                    "text": "MEME TEXT", "x": 20.0, "y": 10.0,
                    "font_size": 5.0, "color": "#FFFFFF",
                    "stroke_color": "#000000",
                    "font_family": "Impact",
                })

            for i, t in enumerate(st.session_state.texts):
                with st.expander(f"📝 {t['text'][:20]}", expanded=False):
                    t["text"] = st.text_input("Text", t["text"], key=f"t_{i}_text")
                    c1, c2 = st.columns(2)
                    t["x"] = c1.number_input("X %", 0.0, 100.0, t["x"], 0.5, key=f"t_{i}_x")
                    t["y"] = c2.number_input("Y %", 0.0, 100.0, t["y"], 0.5, key=f"t_{i}_y")
                    t["font_size"] = c1.number_input("Size %", 1.0, 30.0, t["font_size"], 0.5, key=f"t_{i}_fs")
                    c3, c4 = st.columns(2)
                    t["color"] = c3.color_picker("Fill", t["color"], key=f"t_{i}_c")
                    t["stroke_color"] = c4.color_picker("Stroke", t["stroke_color"], key=f"t_{i}_sc")
                    if st.button(f"🗑️ Delete", key=f"t_{i}_del"):
                        st.session_state.texts.pop(i)
                        st.rerun()

    if st.session_state.image is None:
        st.markdown("""
        <div style="display:flex;align-items:center;justify-content:center;height:70vh;flex-direction:column">
            <div style="font-size:80px">🖼️</div>
            <h2>No template loaded</h2>
            <p style="color:#888">Upload an image from the sidebar to start</p>
        </div>
        """, unsafe_allow_html=True)
        return

    img = st.session_state.image
    max_w = 1200
    if img.width > max_w:
        ratio = max_w / img.width
        display_img = img.resize((max_w, int(img.height * ratio)), Image.LANCZOS)
    else:
        display_img = img.copy()

    canvas_result = st_canvas(
        fill_color=shape_color + "80",
        stroke_width=stroke_width,
        stroke_color=stroke_color,
        background_image=display_img,
        drawing_mode=drawing_mode,
        point_display_radius=0,
        key="meme_canvas",
        width=min(display_img.width, 1200),
        height=display_img.height,
    )

    st.divider()

    if canvas_result and canvas_result.json_data:
        objects = canvas_result.json_data.get("objects", [])
        n_circles = sum(1 for o in objects if o.get("type") == "circle")
        n_rects = sum(1 for o in objects if o.get("type") in ("rect", "rectangle"))
        st.info(f"🧑 {n_circles} head(s) · ▬ {n_rects} rectangle(s) · 📝 {len(st.session_state.texts)} text(s)")

    col1, col2 = st.columns(2)
    with col1:
        rendered = render_export(img, canvas_result, st.session_state.texts)
        buf = io.BytesIO()
        rendered.save(buf, format="PNG")
        st.download_button(
            "📥 Export PNG",
            data=buf.getvalue(),
            file_name="meme.png",
            mime="image/png",
        )
    with col2:
        buf_webp = io.BytesIO()
        rendered.save(buf_webp, format="WEBP", quality=92)
        st.download_button(
            "📥 Export WebP",
            data=buf_webp.getvalue(),
            file_name="meme.webp",
            mime="image/webp",
        )


if __name__ == "__main__":
    main()