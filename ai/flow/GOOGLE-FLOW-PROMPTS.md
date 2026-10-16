# AQUILO × Google Flow (Veo): video production kit

Everything you need to generate the AQUILO website videos in Google Flow: which image to upload, which mode and
settings to use, and the exact prompt to paste. Each shot is written for a specific place on the website.

- **Start frames** (real AQUILO photos): `ai/flow/frames/`
- **Product cut-outs** (for "Ingredients"): `ai/flow/ingredients/`
- **Save your downloads to:** `ai/flow/out/`, named by shot ID (e.g. `S2-shower-rain.mp4`)

---

## 1. One-time setup in Flow

1. Open **labs.google/flow** and sign in with the Google account that has your Flow / Google AI plan.
2. Click **New project** and name it `AQUILO Website`.
3. Open the **settings** (the gear/tune icon next to the prompt box) and set:
   - **Model:** Veo 3.1 **Fast** for first drafts (fewer credits). Switch to Veo 3.1 **Quality** for the final version of a shot you like.
   - **Outputs per prompt:** 2. You get two takes and keep the better one.
   - **Aspect ratio:** set per shot (see each shot below). Landscape = 16:9, Portrait = 9:16.
4. Pick the mode in the dropdown on the prompt box (**Frames to Video**, **Ingredients to Video** or **Text to Video**). Each shot says which one.

> Labels in Flow change from time to time. If a name differs slightly, pick the closest option.

## 2. How to make each shot

**Frames to Video** (most shots, keeps the real product exactly):
1. Choose **Frames to Video**.
2. Click the first-frame slot and upload the image named in the shot.
3. If Flow offers an **end-frame** slot, upload the **same image** again. The clip then returns to where it started and loops seamlessly on the website.
4. Set the aspect ratio. If Flow asks how to fit the image, choose **crop** and keep the product centred.
5. Paste the prompt and press Generate.
6. Check both takes against the checklist in section 6. Keep the best one.
7. Click **Download → Upscaled (1080p)**. Save it as the shot ID in `ai/flow/out/`.

**Ingredients to Video** (new lifestyle scenes with the real product):
1. Choose **Ingredients to Video**.
2. Upload the product cut-out from `ingredients/`.
3. Paste the prompt. It describes a new scene around that exact product.
4. Check closely that the product's shape and finish are unchanged. Re-roll if not.

**Sound:** Veo also creates audio. The website plays videos muted, so audio doesn't matter for the site. The prompts ask
for quiet water ambience only, so the same clips can also be used on social media.

---

## 3. Website shots: Frames to Video (real photos → motion)

### S2 · Shower: Rain  *(Sanitaryware → Showers section, frame 1; also the gateway's Sanitaryware panel)*
- **Upload:** `frames/S2-shower-rain.jpg` · **Aspect:** Portrait 9:16 · **Model:** Quality for final
```
Cinematic product film. A wall-mounted luxury rain shower head in a dark gunmetal finish with a warm brass underside, set against a lush living green wall. Fine streams of water fall straight down from the shower head in a soft, even rain, droplets catching warm golden light and glittering as they fall. The camera performs a very slow, smooth push-in, almost imperceptible. Shallow depth of field, the green wall stays softly out of focus. Warm, natural, high-end hotel spa lighting. Photorealistic, shot on a cinema camera with a 50mm lens, 4K detail. The shower head stays perfectly still and its shape, finish and proportions do not change. No people, no hands, no text, no logos. Audio: gentle, steady rainfall only, no music.
```

### S3 · Shower: Rain curtain  *(Showers section, frame 2)*
- **Upload:** `frames/S3-shower-raincurtain.jpg` · **Aspect:** Portrait 9:16
```
Cinematic product film. A luxury dual-function shower head in dark gunmetal with a brass underside, against a lush green living wall. Half of the head releases a soft rain while the front edge pours a smooth, glassy curtain of water. The water curtain ripples gently and sparkles in warm side light; droplets bounce softly at the bottom of the frame. Very slow, steady camera drift from left to right. Shallow depth of field, rich warm tones, high-end spa atmosphere. Photorealistic, 4K, cinema lens. The shower head does not move or change shape, finish or proportions. No people, no hands, no text, no logos. Audio: soft flowing water only.
```

### S4 · Shower: Cascade  *(Showers section, frame 3)*
- **Upload:** `frames/S4-shower-cascade.jpg` · **Aspect:** Portrait 9:16
```
Cinematic product film. A luxury gunmetal-and-brass shower head mounted on a wall beside a green living wall, releasing a single thick, silky waterfall cascade from its front edge. The cascade flows in a smooth arc, glowing in warm golden backlight, with fine mist rising where it lands. Slow-motion feel, very slow camera push-in. Shallow depth of field, warm luxurious tones, calm and sculptural. Photorealistic, 4K, cinema lens. The shower head remains perfectly still and unchanged in shape, finish and size. No people, no hands, no text, no logos. Audio: a soft waterfall, no music.
```

### S1 · Basin mixer on marble  *(Sanitaryware → statement section; also a faucet feature)*
- **Upload:** `frames/S1-basin-mixer-marble.jpg` · **Aspect:** Landscape 16:9
```
Cinematic product film. A sleek gunmetal basin mixer on a white Carrara marble vanity with an under-mounted basin, soft daylight from a window, a small diffuser and folded towels in the background. A clear, smooth, laminar stream of water flows from the spout into the basin, with gentle ripples and soft reflections on the marble. The camera glides very slowly sideways, revealing the mixer's silhouette. Calm, bright, editorial luxury interior, soft shadows, airy whites and warm greys. Photorealistic, 4K, macro-sharp detail on the metal. The faucet stays perfectly still and its exact shape and finish do not change. No people, no hands, no text, no logos. Audio: quiet running water.
```

### S5 · Ceiling rain in the dark  *(Sanitaryware → Technology section background)*
- **Upload:** `frames/S5-ceiling-rain-dark.jpg` · **Aspect:** Landscape 16:9
```
Cinematic product film. A large round ceiling-mounted rain shower in a dark, minimal luxury bathroom. A dense, even curtain of droplets falls straight down, lit from above with a cool, soft blue glow, each droplet sharp and glittering against deep black. Wisps of warm steam drift slowly through the light. A slow, steady upward camera tilt. Moody, architectural, high contrast, ultra-premium. Photorealistic, 4K. The shower head stays perfectly fixed and unchanged. No people, no hands, no text, no logos. Audio: soft rain on stone, no music.
```

### S6 · Spa at sunset  *(Sanitaryware → Wellness section, full-screen)*
- **Upload:** `frames/S6-spa-sunset.jpg` · **Aspect:** Landscape 16:9 · **Model:** Quality
```
Cinematic lifestyle film. A sculptural white freestanding spa bathtub on a wooden deck beside a calm sea at dusk. The sky glows in soft pink, violet and amber. Candles on the deck flicker gently; their warm light reflects on the tub's glossy curves. The sea surface shimmers with slow, gentle ripples, and a faint wisp of steam rises from the tub. A very slow, graceful camera push-in toward the bathtub. Serene, intimate, five-star resort atmosphere. Photorealistic, 4K, anamorphic cinema look. The bathtub keeps its exact shape and design. No people, no text, no logos. Audio: soft lapping water and a faint evening breeze.
```

### S7 · Glass bathtub by the garden  *(Sanitaryware → Wellness alternative / second wellness shot)*
- **Upload:** `frames/S7-bathtub-garden.jpg` · **Aspect:** Landscape 16:9
```
Cinematic lifestyle film. A modern acrylic whirlpool bathtub with a clear glass front panel, filled with softly bubbling turquoise water, in a bright bathroom that opens onto a green lawn and wooden deck. Gentle jets make the water swirl and sparkle; afternoon sunlight streams in and dances on the water. A slow, smooth sideways dolly along the bathtub. Fresh, airy, calm luxury. Photorealistic, 4K. The bathtub's shape and fittings stay exactly as they are. No people, no text, no logos. Audio: soft bubbling water, birdsong in the distance.
```

### S8 · AQUILO Experience Centre  *(Sanitaryware → Visit section / Experience Centres)*
- **Upload:** `frames/S8-showroom.jpg` · **Aspect:** Landscape 16:9
```
Cinematic architectural film inside a luxury bathroom showroom. Freestanding designer basins, sculpted stone pedestals and tall floor-mounted bath mixers are displayed under warm spotlights, with polished wooden floors and an illuminated brand wall. A very slow, smooth forward dolly through the space as the spotlights create gentle highlights on the metal and stone. Elegant, gallery-like, inviting. Photorealistic, 4K. All products, the wall signage and the architecture stay exactly as they are; do not invent new text. No people, no text overlays. Audio: quiet, calm room ambience.
```

### G2 · Rose-gold basin  *(Gateway → Exclusive panel; Exclusive site hero)*
- **Upload:** `frames/G2-exclusive-rosegold-basin.jpg` · **Aspect:** Portrait 9:16 · **Model:** Quality
```
Cinematic product film. A cylindrical freestanding wash basin in matte black with a polished rose-gold rim and a rose-gold interior, standing alone in a dark, velvety studio. A soft, narrow beam of warm light slowly sweeps across the rose-gold rim, creating moving reflections that glide around the curve, while the matte black body absorbs the light. A very slow orbit of the camera around the basin. Minimal, exclusive, jewellery-like presentation. Photorealistic, 4K, macro detail. The basin keeps its exact shape, proportions and finishes. No people, no text, no logos. Audio: near silence with a soft, low ambient hum.
```

### G3 · Mist in darkness  *(Gateway → Altier panel; Altier site hero)*
- **Upload:** `frames/G3-altier-mist.jpg` · **Aspect:** Portrait 9:16 · **Model:** Quality
```
Cinematic product film. A sleek white ceiling shower panel releases two fine, cone-shaped mist sprays and a central column of droplets into absolute darkness. The mist drifts and swirls slowly, lit by a soft beam of light with a subtle warm pink glow at the edges; individual droplets glitter like jewels as they fall. Slow-motion, ultra-calm, mysterious. The camera holds almost still with a barely perceptible upward drift. Ultra-luxury, high-contrast, black background. Photorealistic, 4K. The shower panel stays perfectly fixed and unchanged. No people, no text, no logos. Audio: a whisper of fine mist.
```

---

## 4. New lifestyle scenes: Ingredients to Video (real product in a new setting)

The brief asks for AI lifestyle imagery that uses the **actual products**. These shots place the real product into new,
editorial bathrooms. Product accuracy is lower than with Frames to Video, so check each result closely.

### L1 · Moonlight wall mixer, travertine  *(Collections → Moonlight)*
- **Ingredient:** `ingredients/I1-moonlight-brushed-rosegold-wall-mixer.png` · **Aspect:** Landscape 16:9
```
Cinematic luxury interior film featuring this exact wall-mounted basin mixer in brushed rose gold, installed on a warm travertine stone wall above a sculpted stone vessel basin. A smooth stream of water flows from the spout into the basin. Soft morning light falls from the side, creating long gentle shadows across the stone texture. The camera glides slowly closer to the mixer. Calm, warm, editorial, five-star hotel suite. Photorealistic, 4K. Keep the mixer's exact shape, round plate, lever and brushed rose-gold finish. No people, no text, no logos. Audio: quiet running water.
```

### L2 · Morandi tall mixer, dark marble  *(Collections → Morandi)*
- **Ingredient:** `ingredients/I2-morandi-rosegold-tall-mixer.png` · **Aspect:** Portrait 9:16
```
Cinematic luxury interior film featuring this exact tall basin mixer in polished rose gold, standing on a dark green marble vanity beside a round white vessel basin. Water flows from the spout in a clear, glassy stream. Warm, low evening light with soft reflections on the rose gold and the veined marble. Very slow camera push-in toward the spout. Rich, moody, sophisticated. Photorealistic, 4K. Keep the mixer's exact square body, flat spout, lever and rose-gold finish. No people, no text, no logos. Audio: soft running water.
```

### L3 · Champagne gold mixer, limestone  *(Collections → Champagne Gold)*
- **Ingredient:** `ingredients/I3-champagne-gold-tall-mixer.png` · **Aspect:** Portrait 9:16
```
Cinematic luxury interior film featuring this exact tall square basin mixer in champagne gold, on a pale limestone countertop with a white ceramic vessel basin, a sprig of dried pampas grass in a vase behind. Sunlight moves slowly across the scene; the champagne gold glows softly as light glides over its edges. Water begins to flow from the spout. Slow, smooth orbit around the mixer. Bright, celebratory, refined. Photorealistic, 4K. Keep the mixer's exact architectural square shape, lever and champagne-gold finish. No people, no text, no logos. Audio: gentle water.
```

### L4 · Silk Rain steel grey, concrete loft  *(Collections → Silk Rain)*
- **Ingredient:** `ingredients/I4-silkrain-steelgrey-mixer.png` · **Aspect:** Landscape 16:9
```
Cinematic luxury interior film featuring this exact basin mixer in brushed steel grey, with its wide blade spout, on a polished concrete vanity in a minimalist loft bathroom with large windows. A wide, flat, silky sheet of water pours from the blade spout into a dark stone basin. Cool, soft daylight with gentle reflections. Very slow sideways camera glide. Architectural, calm, modern. Photorealistic, 4K. Keep the mixer's exact blade spout, lever and steel-grey finish. No people, no text, no logos. Audio: smooth flowing water.
```

### L5 · Black & rose-gold basin, gallery  *(Exclusive)*
- **Ingredient:** `ingredients/I5-black-rosegold-freestanding-basin.png` · **Aspect:** Portrait 9:16
```
Cinematic luxury interior film featuring this exact freestanding cylindrical basin in matte black with a polished rose-gold rim and interior, placed in a dim gallery-like bathroom with dark plaster walls and a single warm spotlight from above. A floor-mounted rose-gold mixer pours a thin stream of water into the basin. The spotlight slowly brightens, and reflections glide around the rose-gold rim. A very slow, low-angle orbit. Exclusive, sculptural, quiet. Photorealistic, 4K. Keep the basin's exact shape, proportions and finishes. No people, no text, no logos. Audio: a single stream of water in a quiet room.
```

### L6 · Concrete vessel basin, wabi-sabi  *(Sanitaryware → Basins section)*
- **Ingredient:** `ingredients/I6-concrete-vessel-basin.png` · **Aspect:** Landscape 16:9
```
Cinematic luxury interior film featuring this exact cylindrical concrete vessel basin with its rough, porous grey texture, on a solid oak countertop in a calm wabi-sabi bathroom with lime-washed walls. A slim black wall spout pours water into the basin; soft sunlight through linen curtains moves across the concrete texture. A slow push-in to the basin's rim. Earthy, tactile, serene. Photorealistic, 4K. Keep the basin's exact shape and concrete texture. No people, no text, no logos. Audio: soft pouring water.
```

---

## 5. Brand b-roll: Text to Video (no product; transitions, the loader and social)

### B1 · A single drop  *(loader / transitions / social intro)*
- **Aspect:** Landscape 16:9
```
Extreme macro cinematic shot in slow motion: a single crystal-clear drop of water falls onto a perfectly still, dark water surface, creating a perfect crown splash and widening concentric ripples that catch a warm champagne-gold rim light. Deep black background, ultra-sharp detail, luxurious and minimal. Photorealistic, 4K, high-speed camera look. No text, no logos. Audio: one soft, resonant water drop.
```

### B2 · Molten brass  *(Sanitaryware → Craft section)*
- **Aspect:** Landscape 16:9
```
Cinematic slow-motion shot in a precision foundry: molten brass glowing bright orange-gold is poured from a crucible into a sand mould, sparks drifting, heat haze rippling the air. Dark industrial background, warm dramatic light, shallow depth of field. Then the camera slowly drifts closer to the glowing metal surface. Photorealistic, 4K, documentary-luxury tone like a high-end watch brand film. No people's faces, no text, no logos. Audio: deep low hum of the furnace and soft crackle.
```

### B3 · Light through water  *(section transitions / Altier background)*
- **Aspect:** Landscape 16:9
```
Abstract cinematic shot: shimmering water caustics of light dance slowly across a polished black stone surface, rippling patterns of warm silver and soft champagne light flowing and merging. Very slow, hypnotic, calm. Camera locked off. Ultra-luxury, minimal, high contrast. Photorealistic, 4K. No objects, no text, no logos. Audio: very soft, distant water ambience.
```

---

## 6. Quality checklist (re-roll if any of these fail)

- [ ] The product's **shape, proportions and finish** match the photo exactly: no extra handles, warped spouts or melted edges.
- [ ] No **text, logos or watermarks** appear, apart from the real AQUILO sign in S8.
- [ ] No **people, faces or hands**.
- [ ] The camera moves **slowly and smoothly**, with no shaking or sudden cuts.
- [ ] The water looks **real**: no jelly-like water, no water flowing upwards.
- [ ] The first and last second look calm. For loops, the end is close to the start.

## 7. Hand-off

1. Save the chosen takes as `ai/flow/out/<SHOT-ID>.mp4` (for example `ai/flow/out/S6-spa-sunset.mp4`).
2. Tell Claude **"Flow videos are in ai/flow/out"**. Claude will:
   - trim any start-up frames,
   - make seamless loops,
   - compress them to web size (H.264 + WebM + poster),
   - put each one in its place on the site.

**Suggested order:** S6, S2, G2, G3 first (the most visible placements), then S3, S4, S5, S1, S8 and S7, then the L and B shots.
