# Feature 1: Interactive 3D product view

Status: **prototypes running** (written 2026-10-19, updated 2026-10-20): the AI route (`ai/product3d/`,
`/lab/3d`) and the CAD route from a few catalogue photos (`ai/product3d/cad/`, `/lab/cad`). A brief for
whoever builds it, including Claude in a later session.

## Context for whoever picks this up
- Site: AQUILO Altier, Next.js 16 app in `web/` (read `web/AGENTS.md`: Next 16 has breaking changes,
  check `web/node_modules/next/dist/docs/`). Motion: GSAP + Lenis. 3D: three.js via React Three Fiber.
- Look: ultra luxury, beige (stone / sand, ink text, bronze accents) mixed with black (onyx, bone text,
  champagne accents). Copy has no dashes.
- Products today: `web/src/data/altier-collections.json`, built by `web/scripts/build-altier.mjs` from
  the scraped catalogue (cut-outs in `web/public/media/altier/<collection>/<slug>.webp`). Shown in
  `components/altier/CollectionDetail.tsx` (grid + quick view), `CollectionsIndex.tsx`, `CollectionsJourney.tsx`.
- Existing 3D patterns: `components/gl/FaucetScene.tsx` (GLB loader `ProductModel` that auto orients a
  model and re-skins it with the live finish material), `gl/RainLogoScene.tsx`.
- **New product data is coming from the client** (new photography and possibly 3D files). Plan around
  that data, not around today's scraped photos.
- Rules: free tools and free compute first; AWS only when nothing free works; every model must allow
  commercial use (this is a client site).

## Decisions after the prototype review (owner, 2026-10-19)
- **360 spin: route A1, real turntable photos (72 frames), no AI.** Judged very good. This is the route
  for every product.
- **3D model: CAD quality models only** (like the dataset's reference GLB). The AI routes (four photos →
  Hunyuan3D-2mv → photo painted mesh, and the spin / video filmed from it) need far too much improvement
  and are parked; keep the scripts for experiments only.
- The reference model's one weakness in our viewer was **colour** (whites rendered grey, frosted glass
  flat). That is a rendering setup problem, not a model problem; fix it in `ProductOrbit` with colour
  accurate tone mapping, a real HDRI environment, per material overrides (metal finishes, glass, ceramic)
  and an automatic white balance check against turntable frame 0. See "Colour accurate rendering" below.

### Constraint from the client (2026-10-19): only four photos per product
The client will supply **4 photos from different angles per product. No CAD, no render scenes, no
turntable shoot.** So the turntable route (A1) is only available where we shoot it ourselves, and both the
3D model and the 360 spin have to be built from the four photos. Plan:

1. **Hard surface pieces (mixers, spouts, diverters, towel bars, hooks, rails, square shower heads):
   parametric templates fitted to the four photos** ("CAD from photos").
   - Sanitaryware is built from simple solids: cylinders, boxes, lathe profiles, tube spouts, levers.
     Each collection reuses one design language (Morandi = cylinders, Silk Rain = blades and squares,
     Champagne Gold = architectural squares, Liberty = classic cross handles).
   - One template per product type (tall basin mixer, short basin mixer, wall mixer, bath spout, round
     shower head, square shower head, towel bar, robe hook …) with a handful of parameters (heights, radii,
     spout reach and arc, lever shape, base plate).
   - Claude reads the four photos (and any size in the product data, e.g. "Size: 600 mm") and proposes the
     template and starting parameters; an automatic fit then adjusts the parameters until the model's
     silhouettes match the four photos (the IoU code already exists in `ai/product3d/paint.mjs`).
   - Material = the product's finish preset (chrome, brushed rose gold, matt black …), so the result looks
     like the reference CAD model: crisp edges, true symmetry, real reflections, every finish switchable.
   - The **360 spin is then rendered from that model** (72 frames in a studio HDRI), which matches the look of
     the client's existing catalogue renders.
   - Free (all local). Cost is the one time work of writing templates; each new product is then minutes.
2. **Smooth solids (basins, bathtubs, round shower heads, vases): improved AI mesh.** Hunyuan3D-2mv at
   higher settings (Standard model, 50 steps, octree 512 instead of turbo / 256), real UV textures from the
   Space's `/generation_all` (Hunyuan3D-Paint) instead of vertex painting, then cleanup (symmetry,
   smoothing, hole fill) and finish materials where the surface is a known glaze or stone.
3. **Comparison only:** online generators with free monthly credits (Hunyuan3D's own site, Meshy, Tripo,
   Rodin) usually give sharper geometry than the open turbo model. Test them on the same photos, and check
   each one's licence for commercial use of free tier output before relying on it.
4. **AI in-between frames (Wan 2.2 first and last frame, Veo Frames to Video)** stay an experiment for
   spins of pieces no template covers.

**Pilot:** fit templates to the two ABO vanity lights (backplate + spheres / bells + arms: the same kind of
hard surface geometry as faucets) and measure against their reference GLBs; then the first real AQUILO
products as soon as their four photos arrive.

### Experiment (2026-10-20): can chaining or retrying the AI get close to the reference?
Scripts: `ai/product3d/lib.mjs` (shared scoring), `score.mjs` (outline match with the four photos +
**shape distance to the reference GLB**, mean surface distance after aligning, as a % of product height),
`improve.mjs` (several Hunyuan3D-2mv tries at 50 steps / octree 384, the best outline match wins, then
Hunyuan3D-Paint on the winner).

| Product | Original AI (turbo settings) | Best of new tries, picked by outline only | Gain |
|---|---|---|---|
| Nickel vanity light | 3.61 % | **2.71 %** (seed 7) | 25 % closer |
| Ceramic vase | 4.51 % | **3.93 %** (seed 42, best of 4) | 13 % closer |
| Bronze vanity light | 6.20 % | **6.02 %** (seed 42) | 3 % closer |

- Feeding a Hunyuan3D mesh back into Hunyuan3D is not possible: the shape model takes photos, not
  meshes. Retrying with other seeds and keeping the best silhouette match is the useful version, and the
  outline score picked the closest model every time (so it works without a reference).
- Higher settings alone barely matter (same seed: 4.45 % vs 4.51 %). Seed search is what helps.
- Still far from CAD quality: about 3 to 6 % average error, roughly 9 to 18 mm on a 30 cm faucet.
- The texture step (`/generation_all`, Hunyuan3D-Paint) failed once inside the Space (`PyMeshLabException`),
  then the free ZeroGPU quota ran out (it resets after about 6.5 hours). Each try costs about 25 s.

### Hybrid: AI mesh → CAD (the owner's idea, recommended)
Use the best AI mesh as a rough sculpture, then rebuild it as clean CAD:
1. Pick the product type template (box backplate, cylinders, spheres, lathe bodies, tube spouts, levers).
2. Fit the template's parameters to **both** the AI mesh (3D distance: gives depth and the hidden sides
   the photos cannot show) and the four photos (silhouettes: keep the outline exact).
3. The template forces clean geometry: straight edges, true circles, symmetry, even wall thickness.
4. Apply the finish material (chrome, rose gold, matt black …); render the 72 frame 360 spin from it.
Generic fallbacks for pieces without a template: primitive fitting (RANSAC planes, cylinders, spheres),
symmetry enforcement and smoothing. Plain mesh to STEP converters (FreeCAD, Fusion) only wrap the facets
and add no quality.
**Pilot:** the bronze vanity light (the AI's worst case at 6 %): backplate box + 3 sockets + 3 globes.
Target: under 1 % shape distance against the reference.

### CAD route, first run (2026-10-20): catalogue photos → template → CAD → Blender
Test product with **no 3D model and no turntable anywhere**: a single lever basin mixer from a
made-in-china.com listing (`test-assets/faucets/tiema-zs82003`, third party, git-ignored, never publish).
Its gallery has only **3 usable angles**: side, other side, front three quarter from above. No back, no top.
That is the client's real situation (2 to 3 photos), so no extra views were generated.

Pipeline: `ai/product3d/cad/pipeline.mjs <product dir>` (one command; `BLENDER` env var → blender.exe).
| Step | Script | Output |
|---|---|---|
| 1 Clean photos | `prepare.mjs` (views.json: files, flips, logo boxes) | `<view>.png`, `<view>-mask.png` (border flood fill + close, so chrome highlights stay solid) |
| 2 Measure | `templates/basin-mixer/profile.mjs` | `profile.json`: body radius per height, spout and lever outline, from the side photo |
| 3 Fit | `templates/basin-mixer/fit.mjs` (template as points: `shape.mjs`) | `fit.json`: widths the side photo cannot show + the other photo's camera (found 156° round, 24° down) |
| 4 CAD | `build_cad.py` + `templates/basin-mixer/build.py` (build123d, Blender's Python) | `model.step`, `model-cad.glb`, `cad.json` |
| 5 Check | `score.mjs` | `score.json`: CAD outline vs every photo |
| 6 Render | `render_blender.py` (Cycles, CPU, ~28 s a frame at 640 px) | `cad-spin/NN.png`, transparent, contact shadow |
| 7 Web | `finish-spin.mjs` | `cad-spin-web/NN.webp`, `cad-spin.mp4`, `cad-spin.webm` |
Bench page: `/lab/cad` (dev only): photos, fit overlays, the CAD model live in chrome / brushed nickel /
matte black, STEP download, the Cycles 360 and the video.

**Result:** a valid solid, 135 × 48 × 160 mm. CAD outline vs photos: **side 94.5 %, other side 89.6 %, three
quarter 91.4 %** (IoU at 200 px). By eye it is clearly the same tap, but simplified.

How the template is built (the CAD designer's method, not AI):
- body = side profile revolved (exact, read from the back edge, which nothing hides);
- spout = side outline extruded across ∩ plan outline (width taper) + 4 mm fillets, nose included, round aerator;
- lever = same construction, thin blade, 0.5 mm fillets.
Lessons: lofting sections along the spout twists at the nose (bad solid); OpenCascade cannot fillet a plan
whose tip lies on the side outline's tip (plan now runs past the tip); fillet success depends on outline
point spacing (the build searches spacing × radius). build123d's glTF export already converts mm to m and Z
up to Y up. Chrome in Cycles: hide the floor from reflections, use a bright tent with a dark horizon band
and black flags by the lens, or chrome turns flat white (or flat black).

What it does not capture yet: the housing's flat front, the lever's paddle shape seen from above, the
spout's exact cross section (assumed rounded rectangle), small details (hot / cold dot, aerator mesh). The
real size is an assumption (160 mm) until the catalogue gives one dimension.

**Takeaways for the 2 to 3 photo constraint:**
- For hard surface pieces the template route does **not** need generated views: symmetry plus one side
  photo and one three quarter photo were enough. Ask the client for exactly that pair (side + front three
  quarter), on white, plus one real dimension.
- An image foundation model to invent the missing views matters for the AI mesh route (Hunyuan3D-2mv wants
  front / back / left / right) and for smooth pieces with no template. Candidates still to test and to
  licence check for commercial use: Hunyuan3D's own multiview generation, MV-Adapter, Zero123++
  (SV3D and Stable Virtual Camera are non-commercial: excluded).
- Next: (1) templates per product type (tall mixer, wall mixer, bath spout, shower heads, towel bar);
  (2) fit the lever and housing from the three quarter photo too, not only widths; (3) use a Hunyuan3D mesh
  (when the ZeroGPU quota allows) as the depth reference for the template fit, the hybrid above;
  (4) AQUILO's own products as soon as their photos arrive.

### CAD route across three categories (2026-10-20, for pipeline approval)
Nothing pre-made: no 3D model, no turntable, no AI and no ready-made script; every step was written for this
pipeline. What changes per product type is a **template**; everything else is shared.

```
ai/product3d/cad/
  pipeline.mjs        one command per product (dispatches on views.json "template")
  prepare.mjs         photos → clean views + masks                       (shared)
  fit-template.mjs    template shape + each photo's camera fitted by outline (shared, works from one photo)
  silhouette.mjs      masks, projection, IoU                              (shared)
  build_cad.py        template parts → STEP + GLB + cad.json              (shared)
  score.mjs           CAD outline vs every photo                          (shared)
  render_blender.py   Cycles turntable, finishes per part, studio scaled to the product (shared)
  finish-spin.mjs     web frames + mp4 / webm                             (shared)
  templates/
    basin-mixer/      profile.mjs + fit.mjs (measured from a side photo), shape.mjs, build.py
    vessel-basin/     template.mjs (params, points, profile), build.py
    rain-shower/      template.mjs, build.py
```
A template is about 60 lines of fitting (parameters with ranges + the shape as points) and 60 to 100 lines of
build123d. Parts are labelled with their finish ("main" = the product's switchable finish, or fixed ones such as
"rubber" nozzles); Blender and the web viewer read the labels from the GLB node names.

| Category | Template | Photos used | Known size | Fit (outline IoU) | CAD |
|---|---|---|---|---|---|
| Basin mixer (Tiema ZS82003) | `basin-mixer`, measured | 3 (side, other side, three quarter) | none, assumed 160 mm tall | side 94.7 %, other side 89.6 %, three quarter 91.4 % | 135 × 48 × 160 mm, one chrome solid |
| Countertop basin (SICI, matte black) | `vessel-basin`, fitted | **1** (three quarter from above) | none, assumed 400 mm across | 98.9 % | 398 × 398 × 143 mm, 10 mm wall, rounded rim, dished floor, pop-up waste |
| Overhead shower (Qian, 8 inch) | `rain-shower`, fitted | **1** (front, slightly below) | head 200 mm (listing) | 89.8 % | 400 × 200 × 162 mm, swept arm, flange, hub, head, 196 nozzles |

Lessons from the two new templates:
- A round basin looks almost the same from slightly above and slightly below: each photo can state a pitch
  range (`"pitch": [5, 70]`) or the fit lands on the wrong side.
- Fitting points must be dense compared with the outline grid, or big products score low and shrink.
- One photo of a round or symmetric piece is enough for its shape. What one photo cannot give is size: one real
  dimension per product (height, width or head diameter) is the only number the client must add.
- Listings mix products: the "two angles" of the SICI listing were two different basins. Check every photo is the
  same piece before running.
- The 360 opens on the first photo's angle (`fit.json` cameras), so frame 0 looks like the client's own shot.
- Web model: build123d writes every CAD face as its own primitive and tessellates tiny features finely (the
  shower's nozzles alone were 787 primitives, 132k vertices, 6 MB). `optimize-glb.mjs` writes `model-web.glb`
  (merged, welded, simplified within 0.08 mm, meshopt): tap 62 KB, basin 99 KB, shower 187 KB. Small repeated
  features (nozzles) are fused onto one hidden mat so they are one mesh.
- Web chrome (`ProductOrbit` finishes): the first version reflected a beige, almost uniform studio through ACES
  tone mapping and read as flat grey satin. Fixed with the Blender recipe in real time: a neutral gradient dome
  (bright above and below, a narrow dark band at the horizon), white soft boxes, two slim black flags, and
  `THREE.NeutralToneMapping` (Khronos PBR Neutral). Keep the dark band narrow, or chrome turns black when the
  visitor orbits lower.
- Spin pace: one turn in 6 s. 72 frames (12 fps) felt laggy; ffmpeg motion interpolation ghosts on chrome, so the
  turntables are 144 real frames (2.5° apart, 24 fps). `render_blender.py --frames 144 --between` renders only the
  in-between angles of an existing 72 frame turn (and resumes if interrupted).
- Wall and ceiling pieces need the viewer's `mount="hanging"` (`ProductOrbit`): orbit all the way under, no
  floor shadow, start slightly below. Standing pieces stop at the horizon, so a shower's nozzle face (underneath)
  could not be seen.

### Store admin flow, prototype (2026-10-20): `/lab/admin`
Dev only, no login and no database yet (the real admin panel adds those). What a store admin does:
1. Pick the product type (from `templates/<type>/meta.json`: required photos, the one size field, finishes,
   render look, seconds per frame), type the name and the one real size, tick the finishes, drop 1 to 3 photos.
2. "Create product" saves everything (`source/` photos, `views.json`, `product.json`) and starts
   `pipeline.mjs --stage process` in the background. Measured on the gold basin test, with Blender busy at the
   same time: clean 3 s, fit 5 s, CAD 12 s, web model 2 s, score 6 s, about 30 to 45 s in all.
3. Review: fit overlays, outline score (below 85 % is flagged), the live 3D model in every finish. Approve or
   reject (retake photos).
4. Approve starts `--stage render`: one Blender at a time (`.render.lock` in the products folder; later jobs show
   "Waiting for the renderer"), live frame count and time left, then web frames, video and publish to
   `manifest.json` (it appears in `/lab/cad`).
API (dev only, 404 in production): `GET /lab/admin/api/templates`, `GET|POST /lab/admin/api/products`,
`POST /lab/admin/api/products/<slug>` with `approve | reject | retry`. Server helpers in `web/src/lib/labProducts.ts`;
`BLENDER` comes from `web/.env.local` (git-ignored).
Shared improvements made for uploads: photos are downscaled to 1000 px and EXIF rotated; only the largest shape
in a photo is kept, so logos and captions need no hand-drawn boxes; the basin wall is a monotone curve, so a
nibbled outline cannot give a basin a false waist; the shower scales to the entered head size.
Known limits seen in the test (gold band basin, one listing photo): bright gold or chrome highlights touching a
white background nibble the outline; a 92 % score still passed although the real basin has straight ribbed sides,
so the admin's eye is the real check (a higher bar for basins, e.g. 95 %, is worth trying); and products with two
finishes (gold outside, black glaze inside) need a second finish slot per template.

Tools: Blender 4.5 LTS portable (`C:\Users\chetan\tools\blender-4.5.14-windows-x64`, no install, no
connector needed: everything runs headless with `blender -b -P script.py`), build123d 0.13 installed into
Blender's Python 3.11 (`4.5/python/bin/python.exe -m pip install build123d`). Blender MCP is optional,
only for driving Blender by chat; the pipeline does not need it.

### Where CAD quality models come from (in order)
1. **The manufacturer's files.** AQUILO's white background product shots are 3D renders, so the factory
   or OEM supplier almost certainly has a model per product: ask for STEP / IGES (engineering CAD) or the
   render scene files (FBX, OBJ, 3ds Max, Blender, C4D).
2. **Convert for free:** STEP / IGES → mesh with **FreeCAD** (free); clean up, UV unwrap and name parts by
   material in **Blender** (free); export GLB; optimise with `gltf-transform` (meshopt, WebP, under 1.5 MB).
3. **Materials, not painting:** CAD has geometry but rarely colour. Assign PBR materials per part from
   our finish presets (`finishes` in `web/src/data/site.ts`: chrome, champagne gold, rose gold, matt
   black, steel grey …), so **one model covers every finish**, switchable live.
4. **No CAD at all:** photogrammetry from the turntable shoot (add two more rings of photos, higher and
   lower, about 150 photos) with RealityScan or Meshroom (free) for matte pieces; Gaussian splats (Brush,
   free) for reflective ones; or commission a modeller (paid) as a last resort.

### Colour accurate rendering (to build in `ProductOrbit`)
- **Tone mapping:** `THREE.NeutralToneMapping` (Khronos PBR Neutral, made for product colour accuracy)
  instead of ACES, which greys whites and shifts saturated colours.
- **Lighting:** a real studio HDRI (`public/hdri/studio_small_08_1k.hdr` is already in the project) as the
  environment, plus soft key and fill Lightformers; exposure tuned per category.
- **Material overrides by part name or category:** metals (metalness 1, roughness per finish), frosted
  glass (`transmission`, roughness, thickness, a warm tint when shown "lit"), glazed ceramic (`clearcoat` 1).
- **White balance check:** render angle 0, compare the mean colour of the product with turntable frame 0,
  and correct exposure / tint automatically, so the 3D view and the 360 spin match.

## Implementation status: working prototype (2026-10-19)
Four photos in, three outputs out: a 360 spin, an interactive 3D model, and a video loop. Built and
tested on 3 products; the client's own photos drop into the same folder layout later.

**Test data: Amazon Berkeley Objects (ABO).** A public dataset (CC BY 4.0) with exactly the two outputs we
want for reference: 72 frame turntables (every 5 degrees) for about 8,200 products and glTF 2.0 models for
about 7,900 (https://amazon-berkeley-objects.s3.us-east-1.amazonaws.com/index.html). It has no faucets or
basins, so the stand-ins are metal and ceramic bathroom pieces: a brushed nickel vanity light, a dark
bronze vanity light, a glazed ceramic vase. Stored in the git ignored `test-assets/abo/` (metadata in
`metadata/`, products in `products/<slug>/`). **Test only: never commit or ship ABO files.** Inputs are
turntable frames 0, 18, 36 and 54 (front, right, back, left: frame 18 shows the product's right side).

**Pipeline (`ai/product3d/`, run from `ai/`)**
| Step | Script | What it does | Where it runs | Time |
|---|---|---|---|---|
| 1 | `prepare-views.mjs <dir>` | Picks the 4 views from a turntable, squares them on one canvas | Laptop | seconds |
| 2 | `prepare-spin.mjs <dir>` | Real turntable photos → `spin-web/NN.webp` (route A1, no AI) | Laptop | seconds; 0.5 to 1.2 MB for 72 frames |
| 3 | `make3d.mjs <dir>` | 4 photos → `mesh.glb` with **Hunyuan3D-2mv** (`tencent/Hunyuan3D-2mv` Space, `/shape_generation`, steps 30, octree 256, seed 1234, background removal on) | Free HF ZeroGPU | about 10.5 s of GPU (3.4 s background removal, 6.9 s shape), 15 to 18 s with uploads |
| 4 | `paint.mjs <dir> --faces 60000` | Simplify (meshoptimizer), smooth normals, find the turn by silhouette overlap (8 yaw / mirror options, IoU), colour every vertex from the photos (z-buffer visibility, facing weight), fill unseen spots from neighbours → `model.glb` | Laptop | seconds; 60k triangles, 30k vertices, **1.4 MB** |
| 5 | `render-spin.mjs <slug>` | Films `model.glb` at 72 angles in the browser with the site's own `ProductOrbit` (`/lab/3d/render`) → `ai-spin/NN.webp`, then `ai-spin.mp4` + `ai-spin.webm` (ffmpeg, two turns at 24 fps) | Laptop (GPU, or software GL in headless tests) | about 10 min per product in software GL; much faster on a real GPU |
| all | `pipeline.mjs <slug> […] [--skip-ai]` | Runs 1 to 5 in order | | |

Needs `HF_TOKEN` (a free Hugging Face account) for step 3. Dependencies in `ai/package.json`: `@gradio/client`,
`@gltf-transform/core|functions|extensions`, `meshoptimizer`, `sharp`, `playwright`, `ffmpeg-static`.

**Results on the 3 test products**: silhouette match 76 to 80 percent; share of the surface coloured
straight from the photos: vase 89 percent, bronze light 78 percent, nickel light 55 percent (thin arms
and the back of the shades are hard to see in only four views). The vase's drip glaze lands in the right
places at angles that were never photographed (45, 135 degrees …).

**Lessons built into the scripts**
- Photo colours already contain the studio's light: models painted from photos are shown **unlit**
  (`MeshBasicMaterial` with vertex colours) or the whites go grey.
- gltf-transform's `normals()` unwelds into flat faces; compute smooth normals after simplifying instead.
- The Space returns the file wrapped in an "update" object (`data[0].value.url`).
- Hide the Next.js dev badge (`nextjs-portal`) before filming frames.

**Front end (production ready components)**
- `web/src/components/product/ProductSpin.tsx`: image sequence on a canvas, preloads, hover plays, drag
  scrubs with inertia, arrow keys, `data-cursor="Turn"`, accessible label.
- `web/src/components/product/ProductOrbit.tsx`: GLB viewer (studio Lightformers, contact shadow,
  `Bounds` framing, orbit with damping and slow auto rotate); `azimuth` ref for filming.
- Dev bench **`/lab/3d`** (`components/lab/ProductLab.tsx`, assets served by the dev only route
  `app/lab/3d/asset/[...path]`, 404 in production): per product, the 4 inputs, the real turntable spin,
  the AI model, the AI spin, the AI video and the dataset's reference model side by side.

**If the free Hugging Face quota runs out** (free accounts get a few minutes of ZeroGPU time a day, about
15 to 20 products at 10.5 s each), run the same model elsewhere, in this order:
1. **Kaggle notebook** (about 30 GPU hours a week, free): `pip install` the Hunyuan3D-2 repo
   (`github.com/Tencent/Hunyuan3D-2`), load `tencent/Hunyuan3D-2mv` with the `hy3dgen` pipeline, feed the
   same front / left / back / right PNGs, save `mesh.glb`; steps 4 and 5 stay on the laptop.
2. **Google Colab free T4** (same notebook; `ai/aquilo_wan22_colab.ipynb` shows the pattern).
3. **Modal** ($30 free credit a month): a small serverless function with the same code, called per product.
4. **Hugging Face PRO** (more daily ZeroGPU minutes) if a paid plan is ever acceptable.
5. **AWS only as a last resort.**
For heavy batches add `--skip-ai` to re-run steps 4 and 5 locally without spending GPU time.

**Next steps**
- Swap ABO for the client's photos (same names: `front.png`, `right.png`, `back.png`, `left.png`).
- Add a texture route for higher colour detail (bake the photo projection into a UV texture instead of
  vertex colours, or Hunyuan3D 2.1 texture painting) and compare.
- Try the Wan 2.2 first and last frame route for spins of thin chrome pieces where the mesh struggles.
- Wire `ProductSpin` / `ProductOrbit` into the collection quick view once real assets exist.

## What the visitor gets
1. **Hover to bring a product alive** (grids, collections journey): the still turns into motion within
   about 150 ms. A quarter turn plays on hover and reverses on leave.
2. **Drag to turn it** (quick view and product pages): full 360 degrees with inertia, keyboard arrows,
   pinch to zoom on phones, a finish switcher where the data allows.
3. **Later: place it in your room with AR** (phones), reusing the same 3D files (see feature 2).

Two technical forms deliver this; most products get one, hero pieces may get both:
- **360 spin**: 36 to 72 frames of the product turning. Exact, light (0.5 to 2 MB), works everywhere.
- **True 3D**: a GLB mesh (best for finish switching and AR) or a Gaussian splat (photoreal, keeps the
  reflections of chrome and gold; orbit only).

## Inputs we will ask the client for (new data)
| Input | Why | Ideal spec |
|---|---|---|
| CAD or 3D source files (STEP, OBJ, FBX, or the scenes used for their white studio renders) | Perfect GLB meshes, finish switching, AR | One file per product family; we add PBR materials |
| Turntable photo sets | Real 360 spins with no AI, and splats | 36 shots every 10 degrees, plain backdrop, soft light, fixed camera; plus 2 extra orbits (higher, lower) for splats |
| At least 4 angle photos (front, left, back, right) | AI routes (in-betweens, multi-view to 3D) | Same light and distance, 2000 px or more |
| Finish list per product | Switcher | Matches the finish names in `web/src/data/site.ts` |

## Generation options

### A. 360 spin (the "video" form)
| Option | Input | Licence | Compute | Notes |
|---|---|---|---|---|
| **Real turntable photos** | 36 to 72 photos | Ours | None | Best fidelity; just align, crop, colour match |
| **RIFE / FILM frame interpolation** | A spin with few frames | RIFE MIT, FILM Apache 2.0 | Any GPU; `rife-ncnn-vulkan` runs without CUDA (even Intel/AMD) | Turns 12 to 18 frames into 72; ideal for small angle steps |
| **Wan 2.2 first and last frame to video (FLF2V)** | Pairs of angle photos (45 to 90 degrees apart); each pair renders one turning segment | Apache 2.0 | Kaggle / Colab T4 with GGUF + 4 step Lightning LoRA, or Modal credit | Chain segments A to B to C to D to A; keep prompts to "turntable, studio light, product unchanged" |
| **Veo 3.1 Frames to Video** (owner's Google Flow pass) | Same angle pairs | Owner's Flow terms | Included in the pass | Best motion quality; manual in Flow UI; good for the 20 to 40 hero pieces |
| ~~SV3D, Stable Virtual Camera~~ | 1+ images | **Non-commercial** | | Do not use on the client site |

### B. True 3D
| Option | Input | Output | Licence | Compute | Notes |
|---|---|---|---|---|---|
| **CAD to GLB** (Blender, free) | Client CAD | Mesh | Ours | Laptop | Best result; decimate, UV, PBR metal; one GLB covers every finish |
| **Gaussian splat from real capture**: COLMAP (alignment) → Brush (training) → SuperSplat (clean up) → Spark (three.js viewer) | 40 to 80 photos | Splat (`.spz`) | COLMAP BSD, Brush Apache 2.0, SuperSplat MIT, Spark MIT | Brush trains on a laptop GPU or even in the browser (WebGPU); Kaggle otherwise | Photoreal reflections; no finish switching (one capture per finish) |
| **Hunyuan3D-2mv** (multi-view to mesh) | Front, left, back, right | Mesh (+ texture with Hunyuan3D 2.1) | Tencent Hunyuan community licence: not valid in EU, UK, South Korea; check scale limits and the licence file | Needs a large GPU: Modal credit, Kaggle if it fits | Good on solid forms (basins, tubs, shower heads), weak on thin mirror chrome |
| **TRELLIS.2** (Microsoft, single image to mesh) | 1 photo | Mesh | MIT (its DINOv3 encoder has its own licence, check) | About 24 GB VRAM: Modal credit | Invents the back; small holes reported; fallback only |
| **AnySplat** (feed-forward, research) | Up to about 16 uncalibrated photos | Splat in one pass | Check repo licence | Kaggle / Colab | Experimental; quick previews |

### Free compute, in order of use (verify quotas before each batch; they change)
1. **Laptop / office PC**: RIFE (`rife-ncnn-vulkan`), Blender, COLMAP, Brush, SuperSplat.
2. **Kaggle notebooks**: about 30 GPU hours a week (T4 or P100) by common report. Main free batch engine.
3. **Google Colab free**: T4 when available; `ai/aquilo_wan22_colab.ipynb` already runs Wan 2.2.
4. **Modal**: $30 free credit every month; serverless jobs for 24 GB models (TRELLIS.2, Hunyuan3D).
5. **Hugging Face ZeroGPU**: a few minutes a day on free accounts; for trying a model only.
6. **Lightning AI free tier**: backup T4 / L4.
7. **AWS (last resort only)**: `g4dn.xlarge` (T4). New accounts need a G instance vCPU quota request;
   set a $20 billing alarm; stop the instance after the batch.

## Workflow (pipeline)
1. **Intake**: the client's files go to `scraped/new/<date>/` (git ignored). A manifest
   (`rich/data/products-intake.csv`, to be created) lists slug, collection, finish, which inputs exist.
2. **Triage per product**: CAD available → route B1. Turntable set → spin A1 (+ splat B2 for heroes).
   Only angle photos → spin via RIFE / FLF2V / Veo, mesh via Hunyuan3D-2mv for solid forms.
3. **Pilot first (5 products, one per type)**: chrome basin mixer, gold tall mixer, rain shower head,
   basin, accessory. Produce every applicable route, review side by side on dark and beige, pick the
   route per product type, write the decision here.
4. **Batch**: scripts under `ai/product3d/` (to be created):
   - `spins.mjs`: align, crop, colour match frames, optional RIFE, export a WebP sprite sheet + poster.
   - `glb.mjs`: `gltf-transform` optimise (meshopt, WebP textures, under 1.5 MB), name materials by finish.
   - Kaggle / Colab notebooks for FLF2V, Hunyuan3D and splat training; outputs copied back.
5. **QA gate** for every asset: shape and proportions identical to the real product, no text or
   artefacts, colour matches the finish, file size within budget.
6. **Publish**: files to `web/public/media/altier/<collection>/<slug>/` and fields written into
   `altier-collections.json` by `build-altier.mjs`.

## Front end
- **One shared canvas** for all 3D on a page (never one WebGL context per card). Hover on a card moves
  the canvas over it (drei `View` / scissor approach) and lazy loads that card's asset.
- `ProductSpin.tsx`: sprite sheet or image sequence; preload frame 0; hover plays a quarter turn;
  pointer x scrubs; drag with inertia; arrows; reduced motion shows the still.
- `ProductSplat.tsx`: Spark viewer, `.spz`, quick view only (not grids), orbit limits, auto rotate slowly.
- `ProductGLB.tsx`: reuse `ProductModel` from `FaucetScene.tsx` (auto orient, finish material), contact
  shadow, environment from `public/hdri/` or, better, a real room panorama via `usePanoramaTexture`
  (see below).
- Custom cursor label "Turn" (see `components/LuxuryLayer.tsx`, `data-cursor`).

### How the existing panorama viewer helps (`web/src/components/gl/PanoramaViewer.tsx`)
The panorama viewer (test bench `/lab/360`, dev only) is not the product turner itself: it keeps the
camera at the centre of a sphere and turns it, while a product view orbits around an object. Three
parts of it are reused here:
1. **Real reflections for chrome and gold**: a 2:1 panorama of a bathroom or an AQUILO showroom is the
   perfect environment map. Load it with the viewer's loader (off thread `ImageBitmap`, downscale to the
   GPU limit, sRGB), set `mapping = EquirectangularReflectionMapping`, run it through PMREM and use it as
   `scene.environment` (and optionally a blurred `scene.background`). Metal then mirrors a real room
   instead of a studio HDRI. Extract the loader into a shared hook `usePanoramaTexture(src)` used by both.
2. **"See it in a room" switch** in the quick view: the GLB or splat in front, the same panorama blurred
   behind and in its reflections; a small picker swaps rooms with the viewer's crossfade idea.
3. **Inside the showroom tour (feature 3)** and the try-on studio (feature 2): clicking a product there
   opens this feature's quick view (spin / GLB / splat), so the three features share one product UI.
Keep the yaw / pitch convention from the viewer (yaw 0 = image centre, + right; pitch + up) when
storing which panorama and direction a product was seen in.

### Data schema (per piece in `altier-collections.json`)
```json
{
  "slug": "aq-2105-brg",
  "spin": { "sprite": "/media/altier/moonlight/aq-2105-brg/spin.webp", "frames": 72, "cols": 12, "poster": "…/poster.webp" },
  "model": { "glb": "…/model.glb", "finishes": ["Brushed Rose Gold", "Chrome"] },
  "splat": "…/capture.spz"
}
```

### Budgets
- Spin: under 2 MB, first frame under 100 KB. GLB: under 1.5 MB. Splat: under 10 MB, quick view only.
- 60 fps on a mid laptop; under 300 ms from hover to first motion on a warm cache.

## Acceptance criteria
- Every product shown on the site has at least a spin or a model; hero pieces have both.
- No product changes shape, gains text, or flickers. Finishes look like the real ones.
- Works on iPhone Safari, Android Chrome, desktop Chrome / Edge / Safari; falls back to the still.

## Open questions for the client
- Can they share CAD or render source files? Which products are heroes?
- Can we shoot turntable sets in an experience centre (Nagpur, Mumbai, New Delhi) if files are missing?

## Research sources (2026-10-19)
Stable Virtual Camera and SV3D (Stability AI, non-commercial licences), Hunyuan3D-2mv model card and
licence (Hugging Face, tencent), TRELLIS.2 notes, AnySplat (huggingface.co/papers/2505.23716), Wan 2.2
FLF2V workflow (comfy.org), Gaussian splatting workflow guides (Spark, Brush, SuperSplat), RIFE and
rife-ncnn-vulkan, free GPU round-ups (Kaggle, Colab, Modal, ZeroGPU, Lightning).
