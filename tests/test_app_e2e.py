"""End-to-end smoke tests driving app.py via Streamlit AppTest (headless)."""
import os
import sys

from PIL import Image
from streamlit.testing.v1 import AppTest

APP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app.py")


def test_runs_without_image():
    at = AppTest.from_file(APP).run()
    assert not at.exception
    # Placeholder shown, no export buttons yet.
    assert len(at.get("download_button")) == 0


def test_runs_with_image_and_export_buttons():
    at = AppTest.from_file(APP)
    at.session_state["image"] = Image.new("RGB", (400, 300), "gray")
    at.session_state["texts"] = []
    at.run(timeout=30)
    assert not at.exception
    labels = [d.label for d in at.get("download_button")]
    assert any("Export PNG" in l for l in labels)
    assert any("Export WebP" in l for l in labels)


def test_add_text_then_render():
    at = AppTest.from_file(APP)
    at.session_state["image"] = Image.new("RGB", (400, 300), "gray")
    at.session_state["texts"] = [{
        "text": "HELLO", "x": 20.0, "y": 10.0, "font_size": 5.0,
        "color": "#FFFFFF", "stroke_color": "#000000", "font_family": "Impact",
    }]
    at.run(timeout=30)
    assert not at.exception
