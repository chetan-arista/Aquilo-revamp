# Feature 2: Try it in your bathroom (panorama try-on)

Status: **Phase A built, plus AR (Phase C), as a dev prototype (2026-10-20)**: `/lab/studio` and
`/lab/studio/ar`. Waiting for AQUILO's real catalogue (cut-outs, finishes, 3D models) before a public `/studio`.
A brief for whoever continues it, including Claude in a later session.

## Built so far (2026-10-20)
The owner's brief: "the customer opens the feature: live AR, or a normal or panorama picture that becomes a live
panorama viewer and editor where they try another colour of the same product or a different product".
- **Start** (`components/studio/RoomStudio.tsx`): use your photo, take one now (`capture="environment"`), see it
  live in your space (AR), or a sample room.
- **Photos**: a 2:1 image opens as a 360 panorama; any other photo is projected into the same viewer as a window
  of its field of view (`PanoramaViewer photoFov`, shader pinhole projection; the view cannot leave the photo;
  a Lens slider adjusts the angle). One editor for both.
- **Room reading** (`lib/studio/roomStyle.ts`): average colour weighted for the panorama's poles → "Mid toned,
  warm and rich", and the top 3 collections by finish with a reason (rules, no AI, nothing uploaded).
- **Editor**: drawer (Suggested, Basin, Shower, Bath, Accessories, 3D); a piece appears where you look and drags
  into place (the viewer is `locked` while dragging, `lookAtScreen()` maps the pointer to yaw / pitch); cut-outs
  stand on camera facing quads with a contact shadow (`components/studio/PlacedItems.tsx`); size, flip, remove;
  "this kind of piece in our other finishes" swaps between collections; **3D models** (feature 1's CAD route)
  turn and switch finish live (chrome, brushed nickel, matte black…) under the chrome studio light.
- Before / after, undo (Ctrl+Z), Save picture (`PanoHandle.capture()` → JPEG, interface hidden), Share (Web Share
  with the file, falls back to save), Ask a consultant (WhatsApp with the piece list). Phone layout: the drawer
  folds away while arranging.
- **AR** (`components/studio/ArViewer.tsx`, `/lab/studio/ar`): `<model-viewer>` 4.3.1 self-hosted in
  `public/vendor/model-viewer/4.3.1/` (its self-contained build bundles its own three.js, so no clash with the
  site's 0.186; npm install refused the peer range). Scene Viewer / WebXR on Android, Quick Look on iPhone (USDZ
  built on the fly), true size (`ar-scale="fixed"`), finish set on the `main` material before AR opens. The CAD
  pipeline now also writes `model-ar.glb` (uncompressed, PBR materials named by part) next to `model-web.glb`.
  Tested on desktop (loads, finish switches, says AR needs a phone); **real AR still needs a phone test**: open
  `http://<computer's LAN address>:3000/lab/studio/ar` on the same Wi-Fi; WebXR also needs HTTPS (a tunnel).

Honest limits: the catalogue has no colour variants of one design, so for photo cut-outs "another colour" means
the same kind of piece in another collection; true "same product, new colour" comes from 3D models. Placement is
free (no depth yet): Phase B depth and segmentation would size and seat pieces automatically.

## Context for whoever picks this up
- Site: AQUILO Altier, Next.js 16 app in `web/` (read `web/AGENTS.md`). three.js via React Three Fiber,
  GSAP + Lenis, beige and black luxury look, copy without dashes.
- Products and finishes: `web/src/data/site.ts` (`collections`, `finishes`, `finishLine`) and
  `web/src/data/altier-collections.json` (pieces with transparent cut-outs).
- Depends on **feature 1** (`rich/01-3d-product-view.md`) for GLB models (realistic placement, AR).
  Phase A works with cut-outs alone.
- Rules: free first (in-browser AI where possible), AWS only as a last resort, commercial-use licences,
  the visitor's photos are private by default.

## What the visitor gets
1. Opens **"Try in your room"** (from a product's quick view, a collection page or `/studio`).
2. Takes or uploads a photo of their washroom: a 360 panorama (phone panorama / Photo Sphere gives an
   equirectangular image) or a normal wide photo.
3. Looks around the room, sees **suggested spots** (basin, shower wall, bath) and **suggested collections**
   for the room's style ("Warm wood and cream stone: Liberty in Brushed Brass").
4. Places products, swaps product and finish with one tap, compares before and after.
5. Saves or shares the picture, or sends it to an AQUILO consultant with the product list.

## The viewer: we already have one (`web/src/components/gl/PanoramaViewer.tsx`)
Test bench **`/lab/360`** (dev only). It already gives this feature most of what it needs:
- Shows any 2:1 equirectangular image inside a sphere; drag with inertia, pinch / wheel / double click
  zoom, arrow keys, auto rotate when idle, reset; crossfade when the image changes (nice for before / after).
- Decodes off the main thread and shrinks to the GPU's texture limit, so a phone's 8K panorama still opens.
- **`onPick({ yaw, pitch, u, v })`** on a short click = "where the visitor tapped": the placement anchor.
- `pins` show tapped spots (gold ring + dot).
- Convention: yaw 0 = image centre, + right; pitch + up; degrees; u = 0.5 + yaw / 360, v = 0.5 − pitch / 180;
  `dirOf()` turns yaw / pitch into a 3D direction.

**What try-on needs added**
1. **Visitor files as `src`**: `URL.createObjectURL(file)` works with the existing `ImageBitmapLoader`;
   revoke the URL on change. Downscale very large files first (8192 px wide) to save memory on phones.
2. **Flat photo mode**: add `projection: "equirect" | "flat"`. Flat shows the photo on a plane with a
   limited pan / zoom instead of the sphere (for normal phone photos that are not 2:1).
3. **A children slot** so the studio can put its own R3F objects in the same scene:
   `<PanoramaViewer …>{placedProducts}</PanoramaViewer>`. Export `dirOf`, `RADIUS` and the yaw / pitch
   helpers from the module.
4. **Placed products**: each item is `{ slug, finish, yaw, pitch, distance, scale, rotation }`. Render the
   cut-out (or the GLB from feature 1) on a quad **facing the camera centre**: since the camera sits at
   the sphere's centre, that quad is tangent to the panorama, so perspective is right. Draw inside the
   sphere (distance < `RADIUS`), with a soft shadow quad under it; Phase B depth sets distance and scale.
5. **Selection and handles**: raycast placed items (they are real meshes), drag to move along the sphere
   (update yaw / pitch from the pointer), pinch or handles to scale and rotate. While dragging an item,
   the viewer must not turn: add a `locked` prop (or `controls={false}`) to pause look controls.
6. **Capture**: an imperative `capture(): Promise<Blob>` that renders one frame and reads the canvas
   (`toBlob`), for save / share / send to a consultant. Optionally render at 2x for print quality.
7. **Embedding rules**: the viewer listens to arrow keys on `window` and blocks wheel scrolling; in the
   studio (full screen) that is fine.
8. **Analysis mapping (Phase B)**: models run on cube faces cut from the equirectangular image; results go
   back to the viewer through u / v → yaw / pitch with the convention above.

## Test data (local only)
`test-assets/360/` holds nine third-party bathroom panoramas from panoee.live (all 2:1 equirectangular,
1774x887 up to 8192x4096; sources in `manifest.json`). The folder is git ignored: **use them only to
develop and test locally; never commit, publish or ship them.** They cover small and large bathrooms,
light and dark finishes: good for testing projection, placement, segmentation and style suggestions.

## Phases

### Phase A: Studio MVP (free, no AI)
- **Route** `/studio` plus an overlay entry point from product UIs (`data-cursor="Try"`).
- **Input**: `<input type="file" accept="image/*" capture>`; detect 2:1 aspect → 360 mode, else flat mode.
  Downscale on device (max 8192 px wide for 360, 3000 px for flat), keep EXIF orientation.
- **Viewer**: our existing `PanoramaViewer` (see above) for 360, with the new flat mode for normal
  photos. Gyroscope look on phones is an optional extra.
- **Placing products**: tap a spot (`onPick`) → product drawer (collections, finishes) → the cut-out
  appears on a camera facing quad at that yaw / pitch inside the sphere, with a soft contact shadow;
  handles to move, scale and rotate (viewer `locked` while dragging); finish swatches swap to that
  finish's piece (or recolour the GLB once feature 1 lands).
- **Before / after** slider; **undo**; up to 6 products.
- **Output**: composite to a canvas → `toBlob` → save; share via the Web Share API; "Send to a
  consultant" opens WhatsApp `+91 93256 38368` or mail `info@aquilo.in` with the image and the list.
- **Privacy**: nothing leaves the device unless the visitor sends it.

### Phase B: the room understands itself (free, in browser)
Run with **transformers.js** (ONNX Runtime, WebGPU with a WASM fallback), models downloaded on demand
and cached:
- **Depth**: Depth Anything V2 Small (about 100 MB; runs in the browser in real time on WebGPU). Gives
  rough planes and distance so a basin mixer sits on the vanity at a believable size.
- **Segmentation**: an ADE20K semantic model (wall, floor, sink, toilet, bathtub, mirror, cabinet) for
  automatic hotspots; SAM style "tap to select" for precise masks if a browser build is available
  (check transformers.js model support at build time).
- **Style match**: CLIP or SigLIP image embeddings of the room compared with embeddings of mood images
  for each collection and finish (pre-computed at build time into `public/studio/embeddings.json`).
  Rank collections, show the top 3 with a one line reason built from simple rules (warm / cool tone,
  stone / wood / concrete, light / dark).
- **Wall and floor recolour** (optional): fill the segmentation mask with a tile or paint swatch, keep
  the original lighting by multiplying with the photo's luminance.
- Show a quiet "Analysing your room" state; everything still works if the models fail to load.

### Phase C: photoreal and live (needs GPU or feature 1 models)
- **AR on phones** (best "live test", free): `<model-viewer>` (Google, free) with the product GLB:
  Scene Viewer on Android, Quick Look on iPhone (needs a USDZ, export from Blender or
  `gltf-transform`). One "View in your space" button per product.
- **Photoreal composite** (optional): reference-guided inpainting blends the chosen product into the
  photo with matching light and reflections (an open inpainting model with an image prompt adapter).
  GPU job: try Modal free credit or a Hugging Face Space first; AWS only if needed. Always label as a
  preview and keep the true product image beside it. Check each model's licence for commercial use.

## Data and code layout (to be created)
- `web/src/app/studio/page.tsx`, `web/src/components/studio/` (`Studio` wraps `PanoramaViewer` and
  passes placed products as children; `PlacedProduct`, `ProductDrawer`, `PlacementHandles`,
  `CompareSlider`, `ShareSheet`). Prototype first inside `/lab/360` against `test-assets/360/`.
- `web/src/lib/studio/` (`projection.ts` for yaw/pitch ↔ pixel, `analyse.ts` for the Phase B models in
  a Web Worker so the UI never freezes).
- `web/scripts/build-studio-embeddings.mjs` (Phase B): CLIP embeddings for collection mood images.
- Session state in memory (and optionally IndexedDB so a refresh does not lose the room).

## Budgets and quality
- First interaction under 2 s on a mid phone (models load later, in the background).
- Phase B models only download after the visitor uploads a room (never on the home page).
- Placement must look grounded: contact shadow, size in a sane range, perspective follows the surface.

## Acceptance criteria
- A visitor can go from "Try in your room" to a shared picture in under a minute on a phone.
- Works offline after upload (Phase A); no visitor photo is uploaded without an explicit action.
- Suggestions are explainable ("because your room has warm wood and cream stone").

## Open questions for the client
- Should saving or sending ask for name and phone (lead capture)? Where should leads go (email,
  WhatsApp, a CRM)?
- Which products should appear in the drawer first (heroes per room type)?

## Research sources (2026-10-19)
Photo Sphere Viewer (MIT, official markers and virtual tour plugins), transformers.js (ONNX Runtime,
WebGPU / WASM), Depth Anything V2 browser demos (Hugging Face Spaces, Xenova), `<model-viewer>`.
