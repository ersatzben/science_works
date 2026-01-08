# Lava Lamp Dimensions & Layout Guide

This document explains how the sizing, positioning, and scaling systems work together in the lava lamp visualization. Understanding these relationships is critical for making layout changes without breaking the XOR text effect.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ body (flexbox centered)                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ #scale-wrapper (scaled dimensions)                    │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ #container (900x600, scaled via transform)      │  │  │
│  │  │                                                 │  │  │
│  │  │   ┌─────────┐          ┌──────────────┐         │  │  │
│  │  │   │ canvas  │          │  text-red    │         │  │  │
│  │  │   │ (blobs) │          │  SCIENCE     │         │  │  │
│  │  │   │ 450x410 │          │  WORKS       │         │  │  │
│  │  │   └─────────┘          └──────────────┘         │  │  │
│  │  │   ┌─────────┐          ┌──────────────┐         │  │  │
│  │  │   │particles│          │  text-bg     │         │  │  │
│  │  │   │ canvas  │          │  (masked)    │         │  │  │
│  │  │   └─────────┘          └──────────────┘         │  │  │
│  │  │                                                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Layer Stack (z-index order)

| z-index | Element           | Description                                      |
|---------|-------------------|--------------------------------------------------|
| 1       | `#text-red`       | Red text, visible through transparent blob areas |
| 2       | `#canvas`         | WebGL blob canvas with alpha transparency        |
| 3       | `#canvas-particles` | 2D canvas for small floating particles         |
| 4       | `#text-bg`        | Background-colored text, masked by blob shapes   |

## Scaling System

### CSS Variable
```css
:root {
  --scale: 0.30;  /* Adjust this single value to scale everything */
}
```

### How Scaling Works

1. **#scale-wrapper** defines the actual space the element occupies in the document flow:
   ```css
   width: calc(900px * var(--scale));   /* 270px at 0.30 scale */
   height: calc(600px * var(--scale));  /* 180px at 0.30 scale */
   ```

2. **#container** maintains its full internal dimensions but is visually scaled:
   ```css
   width: 900px;
   height: 600px;
   transform: scale(var(--scale));
   transform-origin: top left;
   ```

### Why This Pattern?
- All internal positioning uses fixed pixel values (predictable)
- Only one value (`--scale`) needs to change to resize
- `transform: scale()` scales everything proportionally: canvases, text, borders, etc.
- The wrapper ensures proper document flow at the scaled size

## Canvas Positioning

### Base Dimensions
```css
canvas {
  width: 450px;
  height: 410px;
}
```

### Position Calculation
The canvas uses `transform: translate(-50%, -50%)` for centering, so the `top` and `left` values specify where the **center** of the canvas should be:

```css
canvas {
  top: calc(50% - 20px);    /* 20px above container center */
  left: calc(50% - 265px);  /* 265px left of container center */
  transform: translate(-50%, -50%);
}
```

### Extending Canvas While Keeping Edges Fixed
When extending the canvas (e.g., adding 10px to top, 50px to left):

1. **Add to dimensions:**
   - New width = old width + left extension
   - New height = old height + top extension

2. **Adjust center position:**
   - Move left by `(left extension) / 2`
   - Move up by `(top extension) / 2`

Example: Adding 50px left, 10px top to a 400x400 canvas at `calc(50% - 240px)`:
```css
/* Before */
width: 400px; height: 400px;
left: calc(50% - 240px);
top: calc(50% - 15px);

/* After */
width: 450px; height: 410px;
left: calc(50% - 265px);  /* 240 + 25 = 265 */
top: calc(50% - 20px);    /* 15 + 5 = 20 */
```

## Text Positioning

### Red Text (#text-red)
Simple absolute positioning with centering transform:
```css
.text-overlay {
  top: 50%;
  left: calc(50% + 210px);  /* 210px right of container center */
  transform: translate(-50%, -50%);
}
```

### Background Text (#text-bg) - The Tricky Part

`#text-bg` serves dual purposes:
1. Display background-colored text
2. Receive the dynamic mask from blob canvas

Because the mask needs a predictable coordinate space, `#text-bg` covers the **entire container**:
```css
#text-bg {
  top: 0;
  left: 0;
  width: 900px;
  height: 600px;
  transform: none;  /* Overrides .text-overlay transform */
}
```

To align the text content with `#text-red`, we use padding to offset the flex centering:
```css
#text-bg {
  justify-content: center;
  padding-left: 420px;  /* Pushes content right */
}
```

**Calculating padding-left:**
If text should be centered at X pixels from left edge:
```
padding-left = 2 * (X - container_width/2)
             = 2 * (X - 450)

For X = 660px (which is 450 + 210):
padding-left = 2 * (660 - 450) = 420px
```

## The Mask System

The XOR effect is achieved by masking `#text-bg` with the blob canvas. This requires **three synchronized values**:

### 1. Canvas CSS Dimensions
```css
canvas {
  width: 450px;
  height: 410px;
}
```

### 2. JavaScript Canvas Dimensions
```javascript
resize() {
  const width = 450;   // Must match CSS
  const height = 410;  // Must match CSS
  // ...
}
```

### 3. Mask Size & Position (JavaScript)
```javascript
updateTextMask() {
  // Size must match canvas CSS dimensions
  this.textBg.style.maskSize = '450px 410px';

  // Position must match canvas CSS position
  this.textBg.style.maskPosition = 'calc(50% - 265px) calc(50% - 20px)';
}
```

### Critical: Keep These In Sync!

When changing canvas dimensions or position, update **all three locations**:

| Change | CSS canvas | JS resize() | JS updateTextMask() |
|--------|------------|-------------|---------------------|
| Width  | ✓          | ✓           | maskSize            |
| Height | ✓          | ✓           | maskSize            |
| Left   | ✓          | -           | maskPosition X      |
| Top    | ✓          | -           | maskPosition Y      |

## Text Sizing

Font sizes for the two lines:
```css
.text-overlay .line1 { font-size: 186.51px; }  /* SCIENCE */
.text-overlay .line2 { font-size: 213.54px; }  /* WORKS */
```

These affect both `#text-red` and `#text-bg` (shared class).

**Sizing ratio:** WORKS is ~1.145x larger than SCIENCE (maintains original design proportions).

## Blob Physics Dimensions

The blob physics operate in a **normalized 0-1 coordinate space**, independent of pixel dimensions:

```javascript
const CONFIG = {
  BOUNDARY_MARGIN: 0.22,  // Blobs stay within 22%-78% of canvas
  // ...
};
```

The `BOUNDARY_MARGIN` constrains blob movement. Increasing it pushes blobs toward center; decreasing allows blobs closer to edges.

## Particle Layer

Particles render on a separate 2D canvas (`#canvas-particles`) with identical dimensions and position to the WebGL canvas. They use their own physics config:

```javascript
const PARTICLE_CONFIG = {
  RADIUS: 0.024,          // Normalized size
  BOUNDARY_MARGIN: 0.08,  // Can go closer to edges than main blobs
};
```

## Common Pitfalls

### 1. Mask Misalignment
**Symptom:** XOR effect doesn't align with blobs
**Cause:** Mask position/size doesn't match canvas position/size
**Fix:** Ensure all three sync points match (see table above)

### 2. Text Clipping
**Symptom:** Top of text-bg is cut off
**Cause:** Mask area doesn't cover full text
**Fix:** Ensure `#text-bg` has full container dimensions (900x600) and mask size covers canvas

### 3. Text Misalignment Between Layers
**Symptom:** Red text and background text don't overlap perfectly
**Cause:** `#text-bg` padding-left doesn't match `#text-red` position
**Fix:** Recalculate padding using formula: `padding-left = 2 * offset`

### 4. Blurry Rendering on Retina
**Symptom:** Blobs or particles look fuzzy
**Cause:** Canvas buffer size doesn't account for device pixel ratio
**Fix:** The `resize()` function handles this:
```javascript
const dpr = Math.min(window.devicePixelRatio || 1, 2);
this.canvas.width = width * dpr;
```

### 5. Scaling Breaks Layout
**Symptom:** Elements mispositioned after changing `--scale`
**Cause:** Using scaled values in internal positioning
**Fix:** All internal values should be in original (unscaled) pixels; only the wrapper and container transform handle scaling

## Quick Reference: Current Values

| Property | Value |
|----------|-------|
| Container | 900px × 600px |
| Scale | 0.30 (30%) |
| Displayed size | 270px × 180px |
| Canvas | 450px × 410px |
| Canvas position | 265px left, 20px up from center |
| Text position | 210px right of center |
| text-bg padding | 420px left |
| SCIENCE font | 186.51px |
| WORKS font | 213.54px |
