// SPDX-License-Identifier: AGPL-3.0-only
// Rendering method adapted from Zotero Reader (Corporation for Digital Scholarship).
// https://github.com/zotero/reader/blob/master/src/pdf/pdf-renderer.js
// Temporary correction for Zotero 10.0.5–10.0.6.

let timer;
let active = false;
const patches = new Map();
const checked = new WeakSet();

function p2v(position, viewport) {
  return { rects: position.rects.map(rect => {
    const [x1, y1] = viewport.convertToViewportPoint(rect[0], rect[1]);
    const [x2, y2] = viewport.convertToViewportPoint(rect[2], rect[3]);
    return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
  }) };
}

// Match the first text line below the PDF anchor, not the preceding entry.
async function alignedDot(page, viewport, rect) {
  if (viewport.rotation || !page.getTextContent) return null;
  const content = await page.getTextContent();
  let best = null;
  for (const item of content.items) {
    if (!item.str?.trim() || item.dir !== 'ltr') continue;
    const [a, b, c, d, x, y] = item.transform;
    if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01) continue;
    const font = content.styles[item.fontName];
    if (!font || font.vertical) continue;
    const height = Math.hypot(c, d) * viewport.scale;
    const [left, center] = viewport.convertToViewportPoint(
      x, y + d * ((font.ascent ?? 0.8) + (font.descent ?? -0.2)) / 2);
    const distance = center - rect[1];
    if (Math.abs(left - rect[0]) > height * 0.5 ||
        distance < 0 || distance > height * 1.6) continue;
    if (!best || distance < best.distance) {
      const radius = Math.max(2, Math.min(7, height * 0.28));
      const [, baseline] = viewport.convertToViewportPoint(x, y);
      best = { x: left - radius - 2 * viewport.scale, y: center, radius, distance,
        left, top: baseline - height * (font.ascent ?? 0.8),
        bottom: baseline - height * (font.descent ?? -0.2),
        width: Math.min(item.width * viewport.scale, height * 6) };
    }
  }
  return best;
}

// Use visible glyph bounds instead of the font box, which includes unused descender space.
function inkCenter(ctx, aligned, crop, canvas) {
  const left = Math.max(0, Math.floor(aligned.left - crop[0]));
  const top = Math.max(0, Math.floor(aligned.top - crop[1]));
  const width = Math.min(Math.ceil(aligned.width), canvas.width - left);
  const height = Math.min(Math.ceil(aligned.bottom - crop[1]) - top, canvas.height - top);
  if (width <= 0 || height <= 0) return null;
  const background = ctx.getImageData(0, 0, 1, 1).data;
  const pixels = ctx.getImageData(left, top, width, height).data;
  const rows = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (Math.abs(pixels[i] - background[0]) +
          Math.abs(pixels[i + 1] - background[1]) +
          Math.abs(pixels[i + 2] - background[2]) > 240) {
        rows[y]++;
      }
    }
  }
  // Ignore sparse comma/descender tips and faint edge pixels when centering visually.
  const threshold = Math.max(1, Math.max(...rows) * 0.15);
  const first = rows.findIndex(count => count >= threshold);
  let last = rows.length - 1;
  while (last >= 0 && rows[last] < threshold) last--;
  return first >= 0 ? top + (first + last + 1) / 2 : null;
}

async function fixedRenderPreviewPage(position) {
    let page = await this._pdfView._iframeWindow.PDFViewerApplication.pdfDocument.getPage(position.pageIndex + 1);

    // Create a new position that just contains single rect that is a bounding
    // box of image or ink annotations
    let expandedPosition = {
      pageIndex: position.pageIndex
    };

    // Image annotations have only one rect
    expandedPosition.rects = position.rects;
    let rect = expandedPosition.rects[0];
    let dpr = this._pdfView._iframeWindow.devicePixelRatio;
    let viewer = this._pdfView._iframeWindow.PDFViewerApplication.pdfViewer;
    let currentScale = viewer._currentScale;

    // Only boost when zooming in
    let extraScale = currentScale > 1 ? 1 + (currentScale - 1) * 1.8 : currentScale;
    let scale = dpr * extraScale; // actual render scale

    // Honour max-canvas-pixel limit
    let {
      width: viewportWidth,
      height: viewportHeight
    } = page.getViewport({
      scale: 1
    });
    let maxScale = Math.sqrt(viewer.maxCanvasPixels / (viewportWidth * viewportHeight));
    if (scale > maxScale) {
      scale = maxScale;
    }
    let viewport = page.getViewport({
      scale
    });
    let position2 = p2v(position, viewport);
    let canvasWidth = viewport.width;
    let canvasHeight = viewport.height;
    let canvas = this._pdfView._iframeWindow.document.createElement('canvas');
    let ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: true
    });
    if (!canvasWidth || !canvasHeight) {
      return '';
    }
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    let renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    await page.render(renderContext).promise;
    let {
      canvas: canvas2,
      rect: rect2
    } = this._trimCanvas(canvas, ctx, 15);

    // Render the dot after trimming the canvas to make sure it doesn't interfere with trimming
    rect = position2.rects[0];
    ctx.fillStyle = '#f57b7b';
    ctx.globalCompositeOperation = 'multiply';
    if (rect[2] - rect[0] < 5 || rect[3] - rect[1] < 5) {
      let radius = 7;
      let centerX = (rect[0] + rect[2]) / 2 - rect2[0];
      let centerY = (rect[1] + rect[3]) / 2 - rect2[1];
      // Text extraction failure leaves the corrected native anchor available.
      try {
        const aligned = await alignedDot(page, viewport, rect);
        if (aligned) {
          centerX = aligned.x - rect2[0];
          centerY = inkCenter(ctx, aligned, rect2, canvas2) ?? (aligned.y - rect2[1]);
          radius = aligned.radius;
        }
      } catch (error) {
        console.warn('[Reference Marker Fix] Text alignment unavailable:', error);
      }
      centerX = Math.max(radius, Math.min(canvas2.width - radius, centerX));
      centerY = Math.max(radius, Math.min(canvas2.height - radius, centerY));
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
      ctx.fill();
    } else {
      // Adjust x and y after trimming
      let x = rect[0] - rect2[0];
      let y = rect[1] - rect2[1];
      ctx.fillRect(x, y, rect[2] - rect[0], rect[3] - rect[1]);
    }
    let width = canvas2.width / dpr;
    let height = canvas2.height / dpr;
    let rect3 = position2.rects[0].slice();
    let x = (rect3[0] + rect3[2]) / 2;
    let y = (rect3[1] + rect3[3]) / 2;
    x -= rect2[0];
    y -= rect2[1];
    x /= dpr;
    y /= dpr;
    let image = canvas2.toDataURL('image/png', 1);

    // Zeroing the width and height causes Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption. (PDF.js)
    canvas.width = 0;
    canvas.height = 0;
    return {
      image,
      width,
      height,
      x,
      y
    };
  }

function scanReaders() {
  if (!active) return;
  for (const reader of Zotero.Reader._readers) {
    try {
      const internal = reader._internalReader;
      for (const view of [internal?._primaryView, internal?._secondaryView]) {
        const renderer = view?._pdfRenderer;
        if (!renderer) continue;
        const proto = Object.getPrototypeOf(renderer);
        if (checked.has(proto)) continue;
        checked.add(proto);
        const original = proto.renderPreviewPage;
        const source = original?.toString() || '';
        // Only replace the known defective implementation; leave other patches alone.
        if (!source.includes('let centerX = (rect[0] + rect[2]) / 2;') ||
            !source.includes('this._trimCanvas(canvas, ctx, 15)') ||
            !source.includes('ctx.arc(centerX, centerY, 7')) {
          Zotero.debug('[Reference Marker Fix] Skipped an unrecognized renderer.');
          continue;
        }
        // Create the function in the reader realm, so PDF.js objects retain their methods.
        const create = reader._iframeWindow.wrappedJSObject.Function;
        const replacement = create('original', `
          ${p2v.toString()}
          ${alignedDot.toString()}
          ${inkCenter.toString()}
          ${fixedRenderPreviewPage.toString()}
          return async function(position) {
            try {
              return await fixedRenderPreviewPage.call(this, position);
            } catch (error) {
              console.error('[Reference Marker Fix] Falling back to native preview:', error);
              return original.call(this, position);
            }
          };
        `)(original);
        proto.renderPreviewPage = replacement;
        patches.set(proto, { original, replacement });
        Zotero.debug('[Reference Marker Fix] Patched PDF preview renderer.');
      }
    } catch (error) {
      Zotero.logError(error);
    }
  }
  // Release closed readers without retaining their document objects.
  const live = new Set();
  for (const reader of Zotero.Reader._readers) {
    const internal = reader._internalReader;
    for (const view of [internal?._primaryView, internal?._secondaryView]) {
      if (view?._pdfRenderer) live.add(Object.getPrototypeOf(view._pdfRenderer));
    }
  }
  for (const [proto, { original, replacement }] of patches) {
    if (!live.has(proto)) {
      if (proto.renderPreviewPage === replacement) proto.renderPreviewPage = original;
      patches.delete(proto);
      checked.delete(proto);
    }
  }
}

function startup() {
  if (!['10.0.5', '10.0.6'].includes(Zotero.version)) {
    Zotero.debug('[Reference Marker Fix] This build targets Zotero 10.0.5–10.0.6.');
    return;
  }
  active = true;
  scanReaders();
  timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
  timer.initWithCallback(scanReaders, 1000, Ci.nsITimer.TYPE_REPEATING_SLACK);
}

function shutdown() {
  active = false;
  timer?.cancel();
  timer = null;
  for (const [proto, { original, replacement }] of patches) {
    if (proto.renderPreviewPage === replacement) proto.renderPreviewPage = original;
    checked.delete(proto);
  }
  patches.clear();
}

function install() {}
function uninstall() {}
