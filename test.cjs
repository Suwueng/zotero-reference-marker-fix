const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, 'bootstrap.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
assert.ok(manifest.applications.zotero.id);
assert.match(manifest.applications.zotero.update_url, /^https:\/\//);
assert.ok(manifest.applications.zotero.strict_max_version);

let cancelled = false;
const context = vm.createContext({
  Zotero: { version: '10.0.5', Reader: { _readers: [] }, debug() {}, logError(e) { throw e; } },
  Cc: { '@mozilla.org/timer;1': { createInstance: () => ({ initWithCallback() {}, cancel() { cancelled = true; } }) } },
  Ci: { nsITimer: { TYPE_REPEATING_SLACK: 1 } }
});
vm.runInContext(code, context);
function fixture(rect, { crop = [70, 56, 1140, 1540], dpr = 2, zoom = 1, rotation = false, fail = false } = {}) {
  const calls = {};
  const ctx = { beginPath() {}, arc(x, y) { calls.dot = [x, y]; }, fill() {}, fillRect(...args) { calls.box = args; } };
  const canvas = { style: {}, getContext: () => ctx, toDataURL: () => 'image' };
  const page = {
    getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale, scale,
      convertToViewportPoint: (x, y) => rotation ? [y * scale, x * scale] : [x * scale, (792 - y) * scale] }),
    render: () => ({ promise: fail ? Promise.reject(new Error('render failed')) : Promise.resolve() })
  };
  const renderer = {
    _pdfView: { _iframeWindow: { devicePixelRatio: dpr, document: { createElement: () => canvas },
      PDFViewerApplication: { pdfDocument: { getPage: async () => page }, pdfViewer: { _currentScale: zoom, maxCanvasPixels: 16777216 } } } },
    _trimCanvas() { canvas.width = crop[2] - crop[0]; canvas.height = crop[3] - crop[1]; return { canvas, rect: crop }; }
  };
  return { renderer, calls, position: { pageIndex: 6, rects: [rect] } };
}
async function check(rect, options, expected) {
  const f = fixture(rect, options);
  const out = await context.fixedRenderPreviewPage.call(f.renderer, f.position);
  const actual = f.calls.dot || f.calls.box;
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-8, `${actual} != ${expected}`));
  assert.equal(out.image, 'image');
}
(async () => {
  await check([317.908, 678.127, 317.908, 678.127], {}, [565.816, 171.746]);
  await check([100, 700, 100, 700], { crop: [0, 0, 1224, 1584] }, [200, 184]);
  await check([100, 700, 100, 700], { dpr: 1 }, [30, 36]);
  await check([100, 700, 100, 700], { zoom: 2 }, [490, 459.2]);
  await check([100, 700, 120, 710], {}, [130, 108, 40, 20]);
  await check([0, 792, 0, 792], {}, [7, 7]);
  await check([612, 0, 612, 0], {}, [1063, 1477]);
  await check([100, 200, 100, 200], { rotation: true }, [330, 144]);
  const failure = fixture([100, 700, 100, 700], { fail: true });
  await assert.rejects(context.fixedRenderPreviewPage.call(failure.renderer, failure.position), /render failed/);
  // Adjacent bibliography entries: choose target center below the anchor.
  const textPage = { getTextContent: async () => ({ styles: { f: { ascent: 0.683, descent: -0.317 } }, items: [
    { str: 'Wells 2021', dir: 'ltr', fontName: 'f', transform: [8, 0, 0, 8, 318, 678] },
    { str: 'Wells 2022', dir: 'ltr', fontName: 'f', transform: [8, 0, 0, 8, 318, 669] }
  ] }) };
  const viewport = { scale: 2, rotation: 0, convertToViewportPoint: (x,y) => [x*2,(792-y)*2] };
  const aligned = await context.alignedDot(textPage, viewport, [636, 227.746, 636, 227.746]);
  assert.ok(Math.abs(aligned.y - 243.072) < 1e-8);
  assert.ok(aligned.x + aligned.radius < 636);
  assert.equal(await context.alignedDot(textPage, {...viewport, rotation: 90}, [636,228,636,228]), null);
  assert.equal(await context.alignedDot({getTextContent: async () => ({items:[],styles:{}})}, viewport, [0,0,0,0]), null);
  // Font boxes include empty descender space; visible ink occupies rows 1..6.
  const ink = {getImageData(x,y,w,h) {
    const data = new Uint8ClampedArray(w*h*4).fill(255);
    if(w>1) for(let row=1;row<=6;row++) data.fill(0,row*w*4,(row*w+1)*4);
    return {data};
  }};
  assert.equal(context.inkCenter(ink,{left:10,top:20,bottom:30,width:20},[0,0],{width:100,height:100}),24);
  assert.equal(context.inkCenter({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4).fill(255)})},
    {left:10,top:20,bottom:30,width:20},[0,0],{width:100,height:100}),null);
  // Sparse punctuation below the letter body must not pull the marker down.
  const punctuation = {getImageData(x,y,w,h) {
    const data = new Uint8ClampedArray(w*h*4).fill(255);
    if(w>1) for(let row=1;row<=8;row++) {
      const count = row <= 6 ? 12 : 1;
      for(let col=0;col<count;col++) data.fill(0,(row*w+col)*4,(row*w+col)*4+3);
    }
    return {data};
  }};
  assert.equal(context.inkCenter(punctuation,{left:10,top:20,bottom:30,width:20},[0,0],{width:100,height:100}),24);
  // Source signature and lifecycle: existing/new readers, restoration, other patches.
  const original = function () {};
  original.toString = () => 'let centerX = (rect[0] + rect[2]) / 2; this._trimCanvas(canvas, ctx, 15) ctx.arc(centerX, centerY, 7';
  const proto = { renderPreviewPage: original };
  const reader = { _iframeWindow: { wrappedJSObject: { Function } }, _internalReader: { _primaryView: { _pdfRenderer: Object.create(proto) } } };
  context.Zotero.Reader._readers.push(reader);
  context.startup();
  assert.notEqual(proto.renderPreviewPage, original);
  const second = { renderPreviewPage: original };
  reader._internalReader._secondaryView = { _pdfRenderer: Object.create(second) };
  context.scanReaders();
  assert.notEqual(second.renderPreviewPage, original);
  const otherPatch = function () {};
  second.renderPreviewPage = otherPatch;
  context.shutdown();
  assert.equal(proto.renderPreviewPage, original);
  assert.equal(second.renderPreviewPage, otherPatch);
  assert.ok(cancelled);
  context.Zotero.version = '10.0.6';
  context.startup();
  assert.notEqual(proto.renderPreviewPage, original);
  context.shutdown();
  assert.equal(proto.renderPreviewPage, original);
  // Even on a supported version, do not replace an unknown/native-fixed renderer.
  const unknown = function () {};
  const unknownProto = { renderPreviewPage: unknown };
  reader._internalReader._primaryView._pdfRenderer = Object.create(unknownProto);
  context.startup();
  assert.equal(unknownProto.renderPreviewPage, unknown);
  context.shutdown();
  reader._internalReader._primaryView._pdfRenderer = Object.create(proto);
  for (const version of ['10.0.4', '10.0.7', '11.0']) {
    context.Zotero.version = version;
    context.startup();
    assert.equal(proto.renderPreviewPage, original);
  }
  console.log('PASS: rendering, text alignment, lifecycle, version and conflict checks');
})();
