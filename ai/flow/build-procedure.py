"""Builds GOOGLE-FLOW-PROCEDURE.txt: a plain-text, step-by-step procedure with every prompt from
GOOGLE-FLOW-PROMPTS.md included, so the prompts in both files always match.
Usage: python ai/flow/build-procedure.py
"""
import pathlib
import re

here = pathlib.Path(__file__).parent
md = (here / "GOOGLE-FLOW-PROMPTS.md").read_text(encoding="utf8")
ROOT = r"C:\Users\chetan\Downloads\Aquilo-revamp\ai\flow"

# ---- Parse every shot from the prompt guide -------------------------------------------------
shot_re = re.compile(
    r"### (?P<id>[A-Z]\d) · (?P<title>[^\n*]+?)\s+\*\((?P<place>[^)]*)\)\*\s*\n"
    r"- (?P<meta>[^\n]+)\n```\n(?P<prompt>.*?)\n```",
    re.S,
)
MODES = {"S": "Frames to Video", "G": "Frames to Video", "L": "Ingredients to Video", "B": "Text to Video"}
shots = []
for m in shot_re.finditer(md):
    meta = re.sub(r"\*\*|`", "", m["meta"])
    fields = dict(
        (k.strip(), v.strip())
        for k, v in (part.split(":", 1) for part in meta.split(" · ") if ":" in part)
    )
    shots.append({**m.groupdict(), "fields": fields, "mode": MODES[m["id"][0]]})
assert len(shots) == 19, f"expected 19 shots, parsed {len(shots)}"
by_id = {s["id"]: s for s in shots}

LINE = "=" * 78
SUB = "-" * 78


def shot_block(s):
    f = s["fields"]
    upload = f.get("Upload") or f.get("Ingredient")
    out = [SUB, f"SHOT {s['id']}  |  {s['title'].strip()}", SUB,
           f"Where it goes on the site : {s['place']}",
           f"Flow mode                 : {s['mode']}"]
    if upload:
        label = "Upload (start frame)     " if s["mode"] == "Frames to Video" else "Upload (ingredient)      "
        out.append(f"{label} : {ROOT}\\{upload.replace('/', chr(92))}")
        if s["mode"] == "Frames to Video":
            out.append("End frame (if offered)    : the SAME image again (makes a perfect loop)")
    else:
        out.append("Upload                    : nothing (text only)")
    out.append(f"Aspect ratio              : {f.get('Aspect', '')}")
    out.append(f"Model                     : Veo 3.1 Fast for drafts -> {f.get('Model', 'Quality for the final').replace('Quality for final', 'Quality for the final')}")
    out.append(f"Save final download as    : {ROOT}\\out\\{filenames[s['id']]}.mp4")
    out += ["", "PROMPT (copy everything between the lines):", "~" * 78, s["prompt"].strip(), "~" * 78, ""]
    return "\n".join(out)


filenames = {
    "S6": "S6-spa-sunset", "S2": "S2-shower-rain", "G2": "G2-exclusive-rosegold-basin", "G3": "G3-altier-mist",
    "S3": "S3-shower-raincurtain", "S4": "S4-shower-cascade", "S5": "S5-ceiling-rain-dark", "S1": "S1-basin-mixer-marble",
    "S8": "S8-showroom", "S7": "S7-bathtub-garden",
    "L1": "L1-moonlight-travertine", "L2": "L2-morandi-dark-marble", "L3": "L3-champagne-limestone",
    "L4": "L4-silkrain-concrete-loft", "L5": "L5-rosegold-basin-gallery", "L6": "L6-concrete-basin-wabisabi",
    "B1": "B1-water-drop", "B2": "B2-molten-brass", "B3": "B3-light-through-water",
}
rounds = [
    ("ROUND 1 - most visible on the site (do these first)", ["S6", "S2", "G2", "G3"]),
    ("ROUND 2 - rest of the Sanitaryware page", ["S3", "S4", "S5", "S1", "S8", "S7"]),
    ("ROUND 3 - new lifestyle scenes with real products", ["L1", "L2", "L3", "L4", "L5", "L6"]),
    ("ROUND 4 - brand b-roll (no product)", ["B1", "B2", "B3"]),
]
checklist = "\n".join(
    f"\n{title}\n" + "\n".join(f"  [ ] {i}  {filenames[i]}.mp4   ({by_id[i]['mode']}, {by_id[i]['fields'].get('Aspect', '')})" for i in ids)
    for title, ids in rounds
)

text = f"""{LINE}
AQUILO WEBSITE - GOOGLE FLOW (VEO) VIDEO PROCEDURE
Step-by-step guide to make all 19 website videos. Do it whenever you have time.
{LINE}

WHAT THIS IS
  You will use Google Flow to turn the client's REAL product photos into short cinematic
  videos (water flowing, light moving, slow camera). Each video has a fixed place on the
  website. When you're done, Claude cleans them up and puts them on the site.

WHAT YOU NEED
  - The Google account that has your Flow pass
  - Chrome on your laptop
  - This folder:  {ROOT}
      frames\\        10 real AQUILO photos (start frames)
      ingredients\\   6 product cut-outs on white
      out\\           EMPTY - save your finished videos here
  - About 10-15 minutes per shot (including checking takes)
  - Credits: "Fast" uses fewer credits than "Quality". Always draft on Fast first.

TIP: Keep this file open on one side of the screen and Flow on the other.


{LINE}
PART 1 - ONE-TIME SETUP (about 5 minutes)
{LINE}
  1. Open Chrome and go to:  labs.google/flow
  2. Sign in with the Google account that has your Flow pass.
  3. Click "New project". Name it:  AQUILO Website
  4. Find the settings icon (gear / sliders) next to the prompt box and set:
       Model ................ Veo 3.1 - Fast   (for drafts)
       Outputs per prompt ... 2                (you get 2 takes, keep the better one)
       Aspect ratio ......... change it per shot (each shot below says which)
  5. Note: Google renames buttons now and then. If a label is slightly different,
     choose the closest option.


{LINE}
PART 2 - HOW TO MAKE ONE SHOT
{LINE}

A) "FRAMES TO VIDEO" SHOTS  (IDs starting with S and G)
   These keep the real product exactly, because the video starts from the real photo.
   1. In the mode dropdown on the prompt box, choose "Frames to Video".
   2. Click the FIRST-frame slot and upload the image listed for the shot
      (from the frames\\ folder).
   3. If there is an END-frame slot, upload the SAME image again.
      -> The video then ends where it started, so it loops smoothly on the website.
      -> If there is no end-frame slot, that's fine. Claude will make the loop later.
   4. Set the aspect ratio listed for the shot (Landscape 16:9 or Portrait 9:16).
      If Flow asks how to fit the image, choose crop and keep the product in the middle.
   5. Copy the shot's PROMPT from PART 4 and paste it into the prompt box.
   6. Press Generate. Wait (usually 1-3 minutes).
   7. Watch both takes. Use the checklist in PART 5 and keep the better one.
      If both are bad, press Generate again (re-roll).

B) "INGREDIENTS TO VIDEO" SHOTS  (IDs starting with L)
   These build a NEW bathroom scene around the real product.
   1. Choose "Ingredients to Video".
   2. Upload the cut-out image listed for the shot (from the ingredients\\ folder).
   3. Set the aspect ratio, paste the prompt and generate.
   4. Check VERY carefully that the product keeps its exact shape and finish.
      These shots are more likely to change the product, so expect more re-rolls.

C) "TEXT TO VIDEO" SHOTS  (IDs starting with B)
   1. Choose "Text to Video". Nothing to upload.
   2. Set the aspect ratio, paste the prompt and generate.

D) MAKING THE FINAL VERSION OF A SHOT
   1. When a Fast draft looks good, switch the model to "Veo 3.1 - Quality".
   2. Generate the same shot again (same image, same prompt).
   3. Pick the better Quality take.
   4. Click Download -> choose "Upscaled (1080p)" if offered.
      (720p is also OK if 1080p isn't available.)

E) SAVING (important - Claude finds the videos by their names)
   1. Chrome saves to your Downloads folder with a random name.
   2. Move the file into:  {ROOT}\\out\\
   3. Rename it EXACTLY as listed in PART 3 (for example  S6-spa-sunset.mp4).
   4. Tick the shot in PART 3 so you know where you are.


{LINE}
PART 3 - ORDER OF WORK + EXACT FILE NAMES  (tick [x] as you go)
{LINE}
{checklist}


{LINE}
PART 4 - ALL 19 SHOTS: WHAT TO UPLOAD, SETTINGS AND PROMPTS
{LINE}
  Shots are listed in the order of PART 3.
  "Upload" paths are exact. In Flow's upload window, browse to that file.

""" + "\n".join(shot_block(by_id[i]) for _, ids in rounds for i in ids) + f"""

{LINE}
PART 5 - QUALITY CHECKLIST  (re-roll if ANY answer is "no")
{LINE}
  [ ] Does the product keep its exact shape, proportions and finish?
      (no extra handles, no bent or melted spout, no colour change)
  [ ] Is the video free of text, letters, logos and watermarks?
      (the real AQUILO sign in the S8 showroom is fine)
  [ ] Is the video free of people, faces and hands?
  [ ] Does the camera move slowly and smoothly? (no shaking, no sudden jumps or cuts)
  [ ] Does the water look real? (not jelly, not flowing upwards, not frozen)
  [ ] Are the first and last seconds calm? (needed for a smooth loop)


{LINE}
PART 6 - IF SOMETHING GOES WRONG
{LINE}
  The product changes shape
    -> Re-roll. If it keeps happening, delete the camera-movement words from the prompt
       (e.g. "slow orbit") and add: "The camera holds still."
    -> For L shots: if the product still changes, skip that shot. The S and G shots matter more.

  The image is cropped badly (product cut off)
    -> Try the other aspect ratio, or move the crop so the product is centred.

  Text or random letters appear
    -> Re-roll. The prompts already say "no text", but sometimes it slips through.

  There is no "end frame" option
    -> Skip that step. Claude will make the loop.

  Only 720p download is available
    -> That's fine. Download 720p.

  Running out of credits
    -> Finish ROUND 1 and ROUND 2 on Fast, and only use Quality for S6, S2, G2 and G3.
    -> The free backup is Google Colab: {ROOT.replace('flow', 'aquilo_wan22_colab.ipynb')}
       (see the other guide; lower resolution but free).

  Flow blocks or refuses a prompt
    -> Remove the "Audio:" sentence at the end and try again. If it still refuses,
       tell Claude which shot it was.


{LINE}
PART 7 - WHEN YOU'RE DONE
{LINE}
  1. Check that  {ROOT}\\out\\  contains your videos with the exact names from PART 3.
     (You don't need all 19. Even only ROUND 1 is useful.)
  2. Optional: if a take has a small problem (e.g. "white flash in first second"),
     write it in a file called  notes.txt  in the same out\\ folder.
  3. Open Claude Code in VS Code and type:
        Flow videos are in ai/flow/out
  4. Claude will trim the start-up frames, make seamless loops, compress the videos
     for the web (MP4 + WebM + poster image) and put each one in its place on the site.

{LINE}
(Generated from GOOGLE-FLOW-PROMPTS.md - run  python ai/flow/build-procedure.py  to rebuild.)
{LINE}
"""
(here / "GOOGLE-FLOW-PROCEDURE.txt").write_text(text.replace("\n", "\r\n"), encoding="utf-8")
print("wrote", here / "GOOGLE-FLOW-PROCEDURE.txt", "-", len(shots), "shots")
