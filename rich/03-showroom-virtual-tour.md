# Feature 3: Showroom virtual tour (360 panoramas with shoppable products)

Status: **planned, not started** (written 2026-10-19). A brief for whoever builds it, including Claude
in a later session.

## Context for whoever picks this up
- Site: AQUILO Altier, Next.js 16 app in `web/` (read `web/AGENTS.md`). three.js via React Three Fiber,
  GSAP + Lenis, beige and black luxury look, copy without dashes.
- Experience centres today: New Delhi, Mumbai, Nagpur (`centres` in `web/src/data/site.ts`), shown in
  `components/altier/Centres.tsx` and the `/visit` page (`components/altier/VisitPage.tsx`).
- Products: `web/src/data/altier-collections.json`; product UI to reuse: the quick view in
  `components/altier/CollectionDetail.tsx`.
- Rules: free tools first, AWS only as a last resort, commercial-use licences.

## What the visitor gets
1. On `/visit` (and each centre's card), **"Walk through the showroom"** opens a full-screen 360 view
   of that centre (`/visit/nagpur`, `/visit/mumbai`, `/visit/new-delhi`).
2. They look around (drag, scroll to zoom, gyroscope on phones) and move between spots in the showroom
   (entrance, basin wall, shower area, wellness area) with arrows on the floor.
3. Every displayed product has a **soft glowing marker**. Hover (or tap on phones) shows a small card:
   product photo, name, collection, finish. **Click** opens the full product quick view (spin or 3D
   from feature 1, finishes, enquiry).
4. A side list "In this room" lists every product in view; selecting one turns the camera to it.
5. "Book a visit to this centre" and "Directions" are always one tap away.

## Capture (one time per centre, refresh when the display changes)
| Option | Cost | Quality | Notes |
|---|---|---|---|
| **Consumer 360 camera** (Insta360 X series, Ricoh Theta) | Buy or rent one | Very good, 1 tap per spot | Shoot HDR / bracketed, on a tripod at about 1.5 m, at each spot |
| **Phone panorama / Photo Sphere** | Free | Good | Stitching seams near close objects; use for a first pilot |
| **DSLR + panoramic head, stitched in Hugin** (free) | Free software | Best | Slowest; for the hero centre |
| Matterport and similar | Paid subscription | Very good | Not free; avoid |

Capture checklist: lights on as for customers, products clean, no people, same white balance at every
spot, 8 to 12 spots per centre, note where each spot is on a floor plan sketch.

## Test data until the real shoot (local only)
`test-assets/360/` has third-party panoramas (git ignored; sources in `manifest.json`). `8647.jpg`
("STOREROOM", 8192x4096) is a usable stand-in for a showroom; the bathroom ones work for spots and
links. Use them to build the viewer, the editor and the tiling script. **Never commit or publish them**;
the live tour must use AQUILO's own captures.

## The viewer: we already have one (`web/src/components/gl/PanoramaViewer.tsx`)
Built 2026-10-19 (not committed yet at the time of writing). Test bench: **`/lab/360`** (dev only;
`notFound()` in production) fed by `test-assets/360/manifest.json` through the dev-only route
`app/lab/360/pano/[file]/route.ts`. Lint and types pass.

**What it does now**
- R3F canvas; an inverted sphere (radius 10, 128 x 64) shows any 2:1 equirectangular image.
- Loads with `ImageBitmapLoader` off the main thread, shrinks to the GPU's `maxTextureSize` if needed
  (8192 on most desktops, often 4096 on phones), anisotropic filtering, sRGB.
- **Crossfade between panoramas** (shader mixes `uA` → `uB` over 0.9 s when `src` changes): this is
  exactly the "walk to the next spot" transition.
- Controls: drag with inertia, wheel / pinch / double click zoom (fov 30 to 100), arrow keys and +/-,
  auto rotate after 2.5 s idle, `resetKey` to recentre. Wrapper sets `touch-action: none`,
  `data-lenis-prevent` and the custom cursor label `data-cursor="Drag"`.
- `onView({ yaw, pitch, fov })` every 100 ms; `onStatus("loading" | "ready" | "error")`.
- **`onPick({ yaw, pitch, u, v })` on a short click**: the direction under the pointer and the image
  position. This is the core of the hotspot editor.
- `pins: { yaw, pitch }[]` drawn as gold ring + bone dot billboards (always on top).
- Convention (keep it everywhere): **yaw 0 = image centre, +yaw = right; pitch + = up; degrees;
  u = 0.5 + yaw / 360, v = 0.5 − pitch / 180.** `dirOf()` converts to a 3D direction.

**What the tour needs added (in this order)**
1. **Markers with events**: replace `pins` with `markers: { id, yaw, pitch, kind: "product" | "link", label }[]`
   plus `onMarkerEnter / onMarkerLeave / onMarkerClick`. Render them as an **HTML overlay** (our luxury
   card markup, keyboard focusable, screen reader labels) positioned every frame by projecting each
   marker's direction with the camera; hide markers behind the viewer. Keep the billboard rings as the
   in-scene glow if wanted.
2. **`lookAt({ yaw, pitch, fov }, duration)`** through `useImperativeHandle` (or a `target` prop): eases
   lon / lat / fov; used by the "In this room" list, deep links and marker clicks.
3. **Spot transitions**: on `src` change also push fov from 75 to about 68 and back during the
   crossfade, so moving feels like a step forward; preload the linked spots' images in the background.
4. **Progressive loading**: show a 2048 px preview first, then swap to full size (two step `src`), before
   considering real multi-resolution tiles.
5. **Embedding rules**: today the viewer listens to arrow keys on `window` and blocks wheel scrolling
   everywhere. For full-screen tours that is right; when embedded in a page, scope keys to focus and
   require a click (or Ctrl + wheel) before it captures the wheel.
6. Optional: gyroscope look (DeviceOrientation, behind a permission tap on iOS); pause auto rotate
   while a marker card is open.

**Why ours over a library**: same R3F stack as the rest of the site (one design language, our cursor,
our transitions, no extra dependency). Fallback if tiles or tour features grow too big: **Photo Sphere
Viewer** with its official Markers and Virtual Tour plugins (MIT, free for commercial use);
Pannellum / Marzipano are other open options (check licences).

## Hotspot authoring (how products get pinned to the panorama)
1. **Manual editor (Phase A)**: grow the existing `/lab/360` bench (`components/lab/PanoramaLab.tsx`
   already drops pins from `onPick` and shows yaw, pitch, u, v) into a dev only editor
   (`/lab/360/editor`): click a product in the panorama → search box picks the product slug (from
   `altier-collections.json`) → set label → add "link" markers to other spots → **Export JSON** to
   `web/src/data/showrooms/<centre>.json`. Stays `notFound()` in production like the bench.
2. **AI assisted (Phase B)**: an offline script detects products in each panorama and proposes markers:
   - Split the equirectangular into perspective views (cube faces).
   - Open vocabulary detection (Grounding DINO or OWL-ViT style models; prompts like "faucet",
     "shower head", "basin", "bathtub", "towel rail").
   - Match each crop to the catalogue with image embeddings (CLIP / SigLIP) against our product cut-outs;
     propose the top 3 products per crop.
   - Convert box centres back to yaw/pitch; a person confirms in the editor.
   - Compute: laptop CPU or Kaggle / Colab (free). Check every model's licence.

### Data schema (`web/src/data/showrooms/nagpur.json`)
```json
{
  "centre": "nagpur",
  "start": "entrance",
  "spots": [
    {
      "id": "entrance",
      "title": "Entrance",
      "panorama": "/media/showrooms/nagpur/entrance",
      "tiles": { "width": 12288, "cols": 32, "rows": 16 },
      "links": [{ "to": "basin-wall", "yaw": 1.2, "pitch": -0.25 }],
      "products": [{ "slug": "aq-2105-brg", "yaw": 0.62, "pitch": -0.08, "label": "Basin Mixer Large" }]
    }
  ]
}
```
Product details come from `altier-collections.json` by slug, so the tour never duplicates product data.
Products not in the Altier range need adding to the catalogue first.

## Image processing
- Panoramas exported to multi-resolution tiles (Photo Sphere Viewer's tiles adapter format) so the first
  view loads fast and detail streams in; a 2048 px preview for instant display.
- Script `web/scripts/build-showrooms.mjs` (to be created): sharp based tiling and WebP export, writes the
  `tiles` block. Raw panoramas live in `scraped/showrooms/` (git ignored).

## Front end
- Routes: `web/src/app/visit/[centre]/page.tsx` (generateStaticParams over centres; read params inside
  Suspense, as in `app/collections/[slug]/page.tsx`).
- Component `components/altier/ShowroomTour.tsx`: wraps **`PanoramaViewer`** (dynamic import, `ssr:
  false`), passes the spot's `panorama` as `src` (crossfade on spot change), the spot's markers, and
  handles `onMarkerClick` (product → quick view, link → next spot). Marker HTML: dot with a slow pulse;
  on hover a card with the cut-out, name and finish. Plus the "In this room" list (calls `lookAt`), mini
  floor plan, keyboard navigation (tab through markers), reduced motion (no auto rotate, cut instead of
  crossfade).
- Clicking a marker opens the existing quick view (extract it from `CollectionDetail.tsx` into a shared
  `ProductQuickView.tsx` first).
- Deep links: `/visit/nagpur?spot=basin-wall&product=aq-2105-brg` opens straight on that product.
- Analytics (later): which products get opened most per centre.

## Budgets
- First panorama visible under 1.5 s on 4G (preview), full detail streams after.
- Marker hover card under 100 ms (product images preloaded for the current spot).

## Acceptance criteria
- Every displayed product in each spot has a marker that opens the right product.
- Works with touch (tap to show, tap again to open), mouse, and keyboard.
- Moving between spots feels like walking (a short blur and zoom transition, no white flash).

## Phases
1. **Pilot**: one centre (Nagpur), 3 spots, phone captures, manual markers, our `PanoramaViewer`
   extended with markers and `lookAt` (build and test first on `test-assets/360/8647.jpg` in `/lab/360`).
2. All three centres, 360 camera captures, editor, tiles, deep links, "In this room" list.
3. AI assisted marker proposals; product spins and 3D in the quick view (feature 1).
4. Optional: a Gaussian splat walk-through of the hero centre (Spark viewer) for free movement
   instead of fixed spots.

## Open questions for the client
- Permission and a time slot to shoot each centre; who can open early or after hours?
- A list of the products on display per centre (or we build it from the photos).
- Should a product card show stock or "available to see at this centre" only?

## Research sources (2026-10-19)
Photo Sphere Viewer and its Markers plugin (MIT, npm / jsDelivr listings; official markers and virtual
tour plugins per the project documentation).
