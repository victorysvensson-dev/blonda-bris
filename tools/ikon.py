#!/usr/bin/env python3
"""Ritar appikonen resurser/ikon.png (1024 x 1024, utan genomskinlighet) med växtritaren i Chrome."""
import os
from playwright.sync_api import sync_playwright
ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1024, "height": 1024}, device_scale_factor=1)
    pg.goto("file://" + os.path.join(ROT, "tools/ikon.html")); pg.wait_for_timeout(1500)
    pg.locator("#c").screenshot(path=os.path.join(ROT, "resurser/ikon.png"), omit_background=False)
    b.close()
from PIL import Image
im = Image.open(os.path.join(ROT, "resurser/ikon.png")).convert("RGB"); im.save(os.path.join(ROT, "resurser/ikon.png"))
print("resurser/ikon.png", im.size)
