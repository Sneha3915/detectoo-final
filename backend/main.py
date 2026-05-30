from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, ImageChops, ImageEnhance

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
import io
import base64
import time


# CREATE APP FIRST
app = FastAPI()


# THEN ADD CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Error Level Analysis (ELA)
# -----------------------------
def perform_ela(pil_image, quality=90):

    temp_io = io.BytesIO()

    pil_image.save(temp_io, 'JPEG', quality=quality)

    temp_io.seek(0)

    compressed = Image.open(temp_io)

    ela_image = ImageChops.difference(pil_image, compressed)

    extrema = ela_image.getextrema()

    max_diff = max([ex[1] for ex in extrema])

    if max_diff == 0:
        max_diff = 1

    scale = 255.0 / max_diff

    ela_image = ImageEnhance.Brightness(ela_image).enhance(scale)

    return np.array(ela_image)

# -----------------------------
# Edge Detection
# -----------------------------
def detect_edges(image):

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    edges = cv2.Canny(gray, 100, 200)

    return edges

# -----------------------------
# Noise Analysis
# -----------------------------
def analyze_noise(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    noise = cv2.absdiff(gray, blur)
    return noise

# -----------------------------
# Convert Image to Base64
# -----------------------------
def image_to_base64(img):

    _, buffer = cv2.imencode('.png', img)

    return base64.b64encode(buffer).decode('utf-8')

@app.post("/v1/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    threshold: float = Form(0.5),
    return_mask: bool = Form(True)
):
    start_time = time.time()

    contents = await file.read()

    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        return JSONResponse(
            status_code=400,
            content={"detail": "Invalid image"}
        )

    pil_image = Image.open(
        io.BytesIO(contents)
    ).convert("RGB")

    # -----------------------------
    # ELA
    # -----------------------------
    ela_result = perform_ela(pil_image)

    gray_ela = cv2.cvtColor(
        ela_result,
        cv2.COLOR_RGB2GRAY
    )

    # -----------------------------
    # Edge
    # -----------------------------
    edge_result = detect_edges(image)

    # -----------------------------
    # Noise
    # -----------------------------
    noise_result = analyze_noise(image)

    # -----------------------------
    # Binary mask
    # -----------------------------
    _, mask = cv2.threshold(
        gray_ela,
        40,
        255,
        cv2.THRESH_BINARY
    )

    kernel = np.ones((3, 3), np.uint8)

    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_CLOSE,
        kernel
    )

    # -----------------------------
    # Contours
    # -----------------------------
    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    regions = []

    overlay = image.copy()

    total_tampered_area = 0

    for idx, cnt in enumerate(contours):

        area = cv2.contourArea(cnt)

        if area < 100:
            continue

        x, y, w, h = cv2.boundingRect(cnt)

        total_tampered_area += area

        confidence = min(
            100,
            round((area / (w * h)) * 100, 2)
        )

        regions.append({
            "id": idx + 1,
            "bbox": [
                int(x),
                int(y),
                int(x + w),
                int(y + h)
            ],
            "area_px": int(area),
            "confidence": confidence
        })

        cv2.rectangle(
            overlay,
            (x, y),
            (x + w, y + h),
            (0, 0, 255),
            2
        )

    # -----------------------------
    # Heatmap
    # -----------------------------
    heatmap = cv2.applyColorMap(
        gray_ela,
        cv2.COLORMAP_JET
    )

    overlay = cv2.addWeighted(
        overlay,
        0.7,
        heatmap,
        0.3,
        0
    )

    # -----------------------------
    # Scores
    # -----------------------------
    ela_score = float(np.mean(gray_ela))
    edge_score = float(np.mean(edge_result))
    noise_score = float(np.mean(noise_result))

    # Demo confidence score
    image_area = image.shape[0] * image.shape[1]

    tamper_percentage = round(
    (total_tampered_area / image_area) * 100,
    2
    )

    confidence_score = min(
    98,
    max(
        80,
        int(tamper_percentage * 5)
        )
    )

    verdict = (
        "Tampered"
        if tamper_percentage > 5
        else "Authentic"
    )

    processing_time = round(
        time.time() - start_time,
        2
    )

    result = {
        "verdict": verdict,
        "confidence": confidence_score,
        "tamper_percentage": tamper_percentage,
        "processing_time": processing_time,

        "metrics": {
            "ela_score": round(ela_score, 2),
            "edge_score": round(edge_score, 2),
            "noise_score": round(noise_score, 2)
        },

        "regions": regions,

        "region_count": len(regions),

        "overlay_image": image_to_base64(
            overlay
        ),

        "heatmap_image": image_to_base64(
            heatmap
        )
    }

    return JSONResponse(content=result)


@app.get('/')
def root():
    return {
        "message": "DETECTOO Backend Running"
    }