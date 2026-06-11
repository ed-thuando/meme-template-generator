"""Unit tests for color parsing and meme rendering logic."""
import os
import sys

import pytest
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import parse_color, render_export


class FakeCanvas:
    def __init__(self, objects):
        self.json_data = {"objects": objects}


# ---- parse_color ----------------------------------------------------------

def test_parse_color_rgba_float_alpha():
    # Fabric.js form that crashed PIL before the fix.
    assert parse_color("rgba(255,200,0,0.5)") == (255, 200, 0, 127)


def test_parse_color_rgb():
    assert parse_color("rgb(10,20,30)") == (10, 20, 30, 255)


def test_parse_color_hex():
    assert parse_color("#ffcc00") == (255, 204, 0, 255)


def test_parse_color_bad_returns_default():
    assert parse_color("not-a-color", default=(1, 2, 3, 4)) == (1, 2, 3, 4)


def test_parse_color_empty_returns_default():
    assert parse_color("", default=(9, 9, 9, 9)) == (9, 9, 9, 9)
    assert parse_color(None, default=(9, 9, 9, 9)) == (9, 9, 9, 9)


# ---- render_export --------------------------------------------------------

def test_render_no_overlays_keeps_size():
    base = Image.new("RGB", (320, 240), "white")
    out = render_export(base, None, [])
    assert out.size == (320, 240)


def test_render_circle_rgba_does_not_crash():
    # Regression: rgba float-alpha fill previously raised ValueError.
    base = Image.new("RGB", (400, 400), "white")
    canvas = FakeCanvas([{
        "type": "circle", "left": 100, "top": 100, "radius": 50,
        "scaleX": 1, "scaleY": 1,
        "fill": "rgba(255,200,0,0.5)", "stroke": "#ffcc00", "strokeWidth": 2,
    }])
    out = render_export(base, canvas, [])
    # Drawing happened -> image differs from plain white base.
    assert out.convert("RGB") != base


def test_render_rect_rgba():
    base = Image.new("RGB", (400, 400), "white")
    canvas = FakeCanvas([{
        "type": "rect", "left": 50, "top": 50, "width": 100, "height": 80,
        "scaleX": 1, "scaleY": 1,
        "fill": "rgba(0,150,255,0.5)", "stroke": "#0088ff", "strokeWidth": 2,
    }])
    out = render_export(base, canvas, [])
    assert out.convert("RGB") != base


def test_render_text_overlay():
    base = Image.new("RGB", (400, 200), "white")
    texts = [{"text": "TOP TEXT", "x": 10.0, "y": 10.0, "font_size": 8.0,
              "color": "#FFFFFF", "stroke_color": "#000000"}]
    out = render_export(base, None, texts)
    assert out.convert("RGB") != base
