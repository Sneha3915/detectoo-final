import io, os
import numpy as np
from PIL import Image

class ForgeryDetector:
    def __init__(self, weights_path=None, device="cpu"):
        self.device    = device
        self.demo_mode = True
        self.model     = None
        if weights_path and os.path.exists(weights_path):
            self._load_model(weights_path)

    def _load_model(self, path):
        try:
            import torch, segmentation_models_pytorch as smp
            self.model = smp.UnetPlusPlus(encoder_name="efficientnet-b4", encoder_weights=None, in_channels=3, classes=1, activation=None)
            ckpt = torch.load(path, map_location=self.device)
            self.model.load_state_dict(ckpt["model_state_dict"])
            self.model.eval().to(self.device)
            self.mean = torch.tensor([0.485,0.456,0.406]).view(3,1,1)
            self.std  = torch.tensor([0.229,0.224,0.225]).view(3,1,1)
            self.demo_mode = False
        except Exception as e:
            print(f"[Detectoo] Model load failed ({e}); demo mode")

    def _real_predict(self, img, threshold):
        import torch, cv2
        img_r = img.convert("RGB").resize((512,512), Image.LANCZOS)
        t = (torch.from_numpy(np.array(img_r)).permute(2,0,1).float()/255.0 - self.mean) / self.std
        with torch.inference_mode():
            prob = torch.sigmoid(self.model(t.unsqueeze(0))).squeeze().cpu().numpy()
        return cv2.resize(prob, (img.size[0], img.size[1]), interpolation=cv2.INTER_LINEAR)

    # ── Enhanced DL-inspired multi-signal forgery detection ──────────────────
    def _demo_predict(self, img):
        import cv2

        rgb  = np.array(img.convert("RGB")).astype(np.float32)
        h, w = rgb.shape[:2]
        gray = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)

        # ── 1. Error Level Analysis (ELA) — compression artefact inconsistency ──
        buf = io.BytesIO()
        img.convert("RGB").save(buf, "JPEG", quality=75)
        recomp = np.array(Image.open(buf).convert("RGB")).astype(np.float32)
        ela_diff = np.abs(rgb - recomp)
        ela_map  = ela_diff.max(axis=2)
        ela_norm = cv2.GaussianBlur(ela_map, (7,7), 0)
        ela_norm = np.clip(ela_norm / (ela_norm.max() + 1e-6), 0, 1)

        # ── 2. DCT block-frequency inconsistency (8×8 block analysis) ──────────
        dct_map  = np.zeros_like(gray)
        block    = 8
        padded_h = (h + block - 1) // block * block
        padded_w = (w + block - 1) // block * block
        g_padded = np.zeros((padded_h, padded_w), np.float32)
        g_padded[:h, :w] = gray
        block_stds = []
        for i in range(0, padded_h, block):
            for j in range(0, padded_w, block):
                patch = g_padded[i:i+block, j:j+block]
                d = cv2.dct(patch)
                hf = np.abs(d[4:, 4:]).mean()   # high-freq energy
                block_stds.append(hf)
        block_stds = np.array(block_stds)
        median_hf  = np.median(block_stds)
        std_hf     = block_stds.std() + 1e-6
        idx = 0
        for i in range(0, padded_h, block):
            for j in range(0, padded_w, block):
                score = np.clip(abs(block_stds[idx] - median_hf) / (2.5 * std_hf), 0, 1)
                ri = min(i + block, h); rj = min(j + block, w)
                dct_map[i:ri, j:rj] = score
                idx += 1
        dct_map = cv2.GaussianBlur(dct_map[:h, :w], (15, 15), 0)
        dct_norm = np.clip(dct_map / (dct_map.max() + 1e-6), 0, 1)

        # ── 3. Noise inconsistency (local noise residual variance) ────────────
        noise  = cv2.Laplacian(gray, cv2.CV_32F)
        nvar   = cv2.GaussianBlur(noise**2, (21, 21), 0)
        global_var = float(nvar.mean()) + 1e-6
        nmap   = np.clip(np.abs(nvar - global_var) / (3 * global_var), 0, 1)

        # ── 4. Edge-artefact / boundary inconsistency ─────────────────────────
        sx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        sy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        mag     = np.sqrt(sx**2 + sy**2)
        blurred = cv2.GaussianBlur(mag, (25, 25), 0)
        edge    = np.clip(np.abs(mag - blurred) / (blurred + 1e-6), 0, 1)

        # ── 5. Colour-channel inconsistency (splicing artefact) ───────────────
        rg = np.abs(rgb[:,:,0] - rgb[:,:,1])
        gb = np.abs(rgb[:,:,1] - rgb[:,:,2])
        color_inc = np.clip((rg + gb) / 2.0 / 60.0, 0, 1)
        color_norm = cv2.GaussianBlur(color_inc.astype(np.float32), (11, 11), 0)

        # ── 6. Texture-gradient (CW-SSIM-inspired local similarity) ──────────
        mu1  = cv2.GaussianBlur(gray, (11,11), 1.5)
        mu2  = cv2.GaussianBlur(gray**2, (11,11), 1.5)
        sigma = np.clip(mu2 - mu1**2, 0, None)
        local_texture_anom = 1.0 - np.clip(sigma / (sigma.max() + 1e-6), 0, 1)

        # ── Weighted ensemble (mimics multi-head attention fusion) ─────────────
        # Weights tuned to boost ELA & DCT which are most reliable signals
        combined = (
            0.30 * ela_norm         +   # compression-level mismatch
            0.25 * dct_norm         +   # frequency domain anomaly
            0.18 * nmap             +   # noise variance anomaly
            0.12 * edge             +   # edge artefact
            0.10 * color_norm       +   # colour channel inconsistency
            0.05 * local_texture_anom   # texture gradient anomaly
        )

        # ── Post-processing: morphological cleanup + sharpening ───────────────
        combined_u8 = (combined * 255).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        combined_u8 = cv2.morphologyEx(combined_u8, cv2.MORPH_CLOSE, kernel)
        combined_u8 = cv2.morphologyEx(combined_u8, cv2.MORPH_OPEN,  kernel)
        result = combined_u8.astype(np.float32) / 255.0

        # Adaptive contrast stretch per-region
        p5, p95 = np.percentile(result, 5), np.percentile(result, 95)
        result = np.clip((result - p5) / (p95 - p5 + 1e-6), 0, 1)

        return result.astype(np.float32)

    def predict(self, image_bytes, threshold=0.5):
        img = Image.open(io.BytesIO(image_bytes))
        mask_prob  = self._demo_predict(img) if self.demo_mode else self._real_predict(img, threshold)
        binary     = (mask_prob > threshold).astype(np.uint8)
        tamper_pct = float(binary.sum()) / binary.size * 100
        return {
            "mask_prob": mask_prob.astype(np.float32), "mask_binary": binary,
            "tamper_percentage": round(tamper_pct, 2),
            "confidence": round(float(mask_prob.max()), 4),
            "verdict": "TAMPERED" if tamper_pct > 1.5 else "AUTHENTIC",
            "demo_mode": self.demo_mode,
        }
