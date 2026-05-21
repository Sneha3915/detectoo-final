from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid, time, os, io, base64, numpy as np
from inference.pipeline import ForgeryDetector
from inference.postprocess import build_overlay, build_forgery_highlight, extract_regions

app = FastAPI(title="Detectoo API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET","POST","OPTIONS"], allow_headers=["*"])

WEIGHTS_PATH  = os.getenv("WEIGHTS_PATH", "weights/forgery_effb4_unet.pth")
DEVICE        = os.getenv("DEVICE", "cpu")
MAX_SIZE_MB   = int(os.getenv("MAX_UPLOAD_MB", "10"))
ALLOWED_TYPES = {"image/jpeg","image/png","image/webp"}
detector      = None

@app.on_event("startup")
async def load_model():
    global detector
    detector = ForgeryDetector(weights_path=WEIGHTS_PATH if os.path.exists(WEIGHTS_PATH) else None, device=DEVICE)
    print(f"[Detectoo] Model ready — demo_mode={detector.demo_mode}")

def validate(file, data):
    if len(data) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {MAX_SIZE_MB} MB")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Only JPEG, PNG, WebP accepted")
    try:
        from PIL import Image; img = Image.open(io.BytesIO(data)); img.verify()
    except Exception:
        raise HTTPException(422, "Invalid or corrupt image")

@app.post("/v1/analyze")
async def analyze(file: UploadFile = File(...), threshold: float = Form(0.5), return_mask: bool = Form(True)):
    data = await file.read()
    validate(file, data)
    t0  = time.perf_counter()
    out = detector.predict(data, threshold=threshold)
    ms  = int((time.perf_counter() - t0) * 1000)

    overlay_b64 = mask_b64 = highlight_b64 = None
    if return_mask:
        import cv2
        # 1. Standard heatmap overlay
        overlay = build_overlay(data, out["mask_prob"], alpha=0.55)
        _, enc  = cv2.imencode(".png", overlay)
        overlay_b64 = base64.b64encode(enc.tobytes()).decode()

        # 2. Forgery-highlight image (tampered regions isolated, background dimmed)
        highlight = build_forgery_highlight(data, out["mask_binary"], out["mask_prob"])
        _, henc   = cv2.imencode(".png", highlight)
        highlight_b64 = base64.b64encode(henc.tobytes()).decode()

        # 3. Raw binary mask
        mask_img = (out["mask_binary"] * 255).astype(np.uint8)
        _, menc  = cv2.imencode(".png", mask_img)
        mask_b64 = base64.b64encode(menc.tobytes()).decode()

    regions = extract_regions(out["mask_binary"], min_area=200)
    return JSONResponse({
        "job_id":            str(uuid.uuid4()),
        "verdict":           out["verdict"],
        "confidence":        out["confidence"],
        "tamper_percentage": out["tamper_percentage"],
        "processing_ms":     ms,
        "demo_mode":         out.get("demo_mode", False),
        "regions":           regions,
        "overlay_b64":       overlay_b64,       # heatmap overlay (left panel)
        "highlight_b64":     highlight_b64,     # forgery-isolated view (right panel) ← NEW
        "mask_b64":          mask_b64,
        "metrics": {
            "noise_inconsistency":    None,
            "edge_artifact_score":    None,
            "compression_ghost_score": None,
        },
    })

@app.get("/health")
async def health():
    return {"status": "ok", "demo_mode": detector.demo_mode if detector else True}
