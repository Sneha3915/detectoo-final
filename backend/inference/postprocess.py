import io, cv2, numpy as np
from PIL import Image

def build_overlay(image_bytes, mask_prob, alpha=0.55):
    """Blend JET heatmap onto the original image."""
    img = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    h, w = img.shape[:2]
    prob = cv2.resize(mask_prob, (w, h), interpolation=cv2.INTER_LINEAR)
    colored     = cv2.applyColorMap((prob*255).astype(np.uint8), cv2.COLORMAP_JET)
    colored_rgb = cv2.cvtColor(colored, cv2.COLOR_BGR2RGB)
    weight      = prob[..., None] * alpha
    overlay     = (img*(1-weight) + colored_rgb*weight).clip(0,255).astype(np.uint8)
    return cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR)


def build_forgery_highlight(image_bytes, mask_binary, mask_prob):
    """
    Return an image that shows ONLY the forged/tampered regions clearly:
    - Authentic regions are darkened and desaturated (ghost effect)
    - Tampered regions are shown in original colour + red contour outline
    - A translucent red tint is blended over tampered pixels
    """
    img    = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    h, w   = img.shape[:2]
    binary = cv2.resize(mask_binary.astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST)
    prob   = cv2.resize(mask_prob,  (w, h), interpolation=cv2.INTER_LINEAR)

    # Desaturated + darkened background
    gray3 = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    gray3 = cv2.cvtColor(gray3, cv2.COLOR_GRAY2RGB)
    bg    = (gray3 * 0.30).astype(np.uint8)

    # Tampered mask — dilate slightly for a glow border
    kernel   = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9,9))
    dilated  = cv2.dilate(binary, kernel, iterations=1)

    # Composite: bg everywhere, original colour in tampered zone
    result = bg.copy()
    mask3  = (binary[..., None] > 0)
    result = np.where(mask3, img, result).astype(np.uint8)

    # Red tint over tampered area (intensity driven by prob map)
    tint       = np.zeros_like(result)
    tint[:,:,0] = 255
    tint_weight = (prob * 0.45)[..., None]
    tint_weight[binary == 0] = 0
    result      = np.clip(result * (1 - tint_weight) + tint * tint_weight, 0, 255).astype(np.uint8)

    # Draw contour lines around tampered blobs
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    result_bgr  = cv2.cvtColor(result, cv2.COLOR_RGB2BGR)
    cv2.drawContours(result_bgr, contours, -1, (0, 0, 255), 2)
    # Outer glow (dilated contour, semi-transparent orange)
    contour_mask = np.zeros((h,w), np.uint8)
    cv2.drawContours(contour_mask, contours, -1, 255, 8)
    contour_mask = cv2.GaussianBlur(contour_mask, (11,11), 0)
    orange = np.full_like(result_bgr, (0, 120, 255))  # BGR orange
    alpha_c = (contour_mask[...,None] / 255.0) * 0.5
    result_bgr = np.clip(result_bgr*(1-alpha_c) + orange*alpha_c, 0, 255).astype(np.uint8)

    return result_bgr  # BGR for cv2.imencode


def extract_regions(binary_mask, min_area=200):
    num, labels, stats, _ = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)
    regions = []
    for i in range(1, num):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area < min_area: continue
        x=int(stats[i,cv2.CC_STAT_LEFT]); y=int(stats[i,cv2.CC_STAT_TOP])
        bw=int(stats[i,cv2.CC_STAT_WIDTH]); bh=int(stats[i,cv2.CC_STAT_HEIGHT])
        conf = float((labels[y:y+bh,x:x+bw]==i).astype(np.float32).mean())
        regions.append({"id":i,"bbox":[x,y,x+bw,y+bh],"area_px":area,"confidence":round(conf,3),"label":"TAMPERED"})
    return sorted(regions, key=lambda r: -r["area_px"])
