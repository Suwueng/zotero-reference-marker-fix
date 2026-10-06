# PDF preview marker positioning

## Crop-coordinate defect

Inspected version: Zotero 10.0.5 on macOS, `PDFRenderer.renderPreviewPage()` in the bundled `reader.js` (upstream source: `src/pdf/pdf-renderer.js`).

`_trimCanvas(canvas, ctx, 15)` moves the image content by `(-rect2[0], -rect2[1])`. The point-marker branch uses the untrimmed viewport center, while the rectangle branch and returned scroll coordinates already subtract the crop origin. Thus the dot's displacement is the crop origin.

The point-marker center should be calculated in trimmed-canvas coordinates before clamping:

```js
let centerX = (rect[0] + rect[2]) / 2 - rect2[0];
let centerY = (rect[1] + rect[3]) / 2 - rect2[1];
centerX = Math.max(radius, Math.min(canvas2.width - radius, centerX));
centerY = Math.max(radius, Math.min(canvas2.height - radius, centerY));
```

A numerical example with a viewport target `(635.816, 227.746)` and crop origin `(70, 56)` yields a corrected center `(565.816, 171.746)`.

## Example document

Wells & Norman (2026), *StarNet: An In Situ Surrogate Model of Primordial Star Formation and Feedback for Astrophysical Simulations*.

DOI: [10.3847/1538-4365/ae42c5](https://doi.org/10.3847/1538-4365/ae42c5)

On page 2, the right-column W22 citation points to page 7, named destination `bm_apjsae42c5bib23`, type `/FitR`, bounds `[317.908, 668.926, 568.966, 678.127]` in PDF coordinates. This targets Wells & Norman (2022), ApJ, 932, 71. The original PDF is not distributed in this repository.

## Separate visual improvement

A valid PDF anchor can sit above the actual text. Beyond correcting the crop offset, this plugin locates a nearby first text line and places the dot beside its visible letter body. Sparse comma/descender tips are excluded from optical centering. This alignment is an optional design choice of the workaround, distinct from the coordinate bug.

## Validation

- Inspected PDF destinations and the installed reader implementation.
- Reproduced the crop-origin error with an isolated execution of the original method.
- Verified plugin loading and preview rendering in a real Zotero 10.0.5 reader during development.
- Rendered the example PDF with PDF.js and tested alignment separately.
- Interactive macOS testing confirmed the final local 0.1.5 behavior. Public 0.1.6 retains that rendering implementation and changes release metadata/update delivery.

No claim is made that the similar 2024 forum report has been reproduced or has the same root cause.
