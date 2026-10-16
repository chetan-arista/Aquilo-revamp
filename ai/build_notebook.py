"""Builds aquilo_wan22_colab.ipynb with shots.json and the ComfyUI workflow embedded (self-contained for Colab).
Usage: python ai/build_notebook.py
"""
import json, pathlib

here = pathlib.Path(__file__).parent
shots = (here / "shots.json").read_text(encoding="utf8")
workflow = (here / "workflow_wan22_ti2v_api.json").read_text(encoding="utf8")


def md(src):
    return {"cell_type": "markdown", "metadata": {}, "source": src}


def code(src):
    return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": src}


cells = [
    md("""# AQUILO — AI motion with Wan 2.2 + ComfyUI (free Colab T4)

Turns the client's **real product photographs** into short cinematic loops (water, light, camera) for the AQUILO sites.
The product in every video is the actual product — Wan 2.2 only animates it.

**Run:** `Runtime → Change runtime type → T4 GPU`, then `Runtime → Run all`. Finished videos land in
`Google Drive / AQUILO-AI / videos` as `.mp4` (H.264), `.webm` (VP9) and a `.jpg` poster.

Model: Wan 2.2 TI2V 5B (fp16) — the variant that fits a free T4. Defaults: 1280×704, 121 frames @ 24 fps (5 s), 20 steps.
Each clip takes roughly 15–30 min on a T4; set `PRESET = "fast"` for 832×480 / 3 s drafts first."""),
    code("""PRESET = "quality"   # "quality" (1280x704, 5s) or "fast" (832x480, 3s) — try "fast" first
ONLY = []            # e.g. ["rain-gold"] to render a subset; empty = all shots
SEED = 2010
!nvidia-smi --query-gpu=name,memory.total --format=csv
from google.colab import drive
drive.mount('/content/drive')
OUT = '/content/drive/MyDrive/AQUILO-AI/videos'
import os; os.makedirs(OUT, exist_ok=True); print('Output →', OUT)"""),
    code("""%cd /content
!git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git
%cd /content/ComfyUI
!pip install -q -r requirements.txt
!apt-get -qq install -y ffmpeg > /dev/null"""),
    code("""from huggingface_hub import hf_hub_download
import shutil, os
REPO = 'Comfy-Org/Wan_2.2_ComfyUI_Repackaged'
FILES = {
    'split_files/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors': 'models/diffusion_models',
    'split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors': 'models/text_encoders',
    'split_files/vae/wan2.2_vae.safetensors': 'models/vae',
}
for src, dst in FILES.items():
    target = os.path.join('/content/ComfyUI', dst, os.path.basename(src))
    if os.path.exists(target):
        print('cached', target); continue
    p = hf_hub_download(REPO, src, local_dir='/content/hf')
    os.makedirs(os.path.dirname(target), exist_ok=True)
    shutil.move(p, target); print('ready', target)"""),
    code("""import subprocess, time, urllib.request
server = subprocess.Popen(['python', 'main.py', '--listen', '127.0.0.1', '--port', '8188'], cwd='/content/ComfyUI',
                          stdout=open('/content/comfy.log', 'w'), stderr=subprocess.STDOUT)
for _ in range(120):
    try:
        urllib.request.urlopen('http://127.0.0.1:8188/system_stats'); print('ComfyUI is up'); break
    except Exception:
        time.sleep(2)
else:
    print(open('/content/comfy.log').read()[-3000:])"""),
    code("SHOTS = " + shots + "\nWORKFLOW = " + workflow),
    code("""import json, copy, uuid, glob, io, urllib.request
from PIL import Image

SIZES = {'quality': {'landscape': (1280, 704), 'portrait': (704, 1280), 'length': 121},
         'fast':    {'landscape': (832, 480),  'portrait': (480, 832),  'length': 73}}
cfg = SIZES[PRESET]

def prepare_image(url, w, h, name):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    img = Image.open(io.BytesIO(urllib.request.urlopen(req).read())).convert('RGB')
    # cover-crop to the target aspect, then resize
    r = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * r), round(img.height * r)), Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    img.crop((left, top, left + w, top + h)).save(f'/content/ComfyUI/input/{name}.png')
    return f'{name}.png'

def queue(prompt):
    data = json.dumps({'prompt': prompt, 'client_id': str(uuid.uuid4())}).encode()
    r = urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8188/prompt', data, {'Content-Type': 'application/json'}))
    return json.loads(r.read())['prompt_id']

def wait(pid):
    while True:
        h = json.loads(urllib.request.urlopen(f'http://127.0.0.1:8188/history/{pid}').read())
        if pid in h:
            st = h[pid].get('status', {})
            if st.get('status_str') == 'error': raise RuntimeError(st)
            return h[pid]
        time.sleep(10)

for shot in SHOTS['shots']:
    if ONLY and shot['id'] not in ONLY: continue
    if os.path.exists(f"{OUT}/{shot['id']}.mp4"): print('done already', shot['id']); continue
    w, h = cfg[shot['orientation']]
    wf = copy.deepcopy(WORKFLOW)
    wf['5']['inputs']['text'] = shot['prompt']
    wf['6']['inputs']['text'] = SHOTS['negative']
    wf['7']['inputs']['image'] = prepare_image(shot['image'], w, h, shot['id'])
    wf['8']['inputs'].update(width=w, height=h, length=cfg['length'])
    wf['9']['inputs']['seed'] = SEED
    wf['11']['inputs']['filename_prefix'] = f"{shot['id']}/frame"
    t0 = time.time(); print('▶', shot['id'], w, 'x', h)
    wait(queue(wf))
    frames = f"/content/ComfyUI/output/{shot['id']}"
    base = f"{OUT}/{shot['id']}"
    !ffmpeg -y -loglevel error -framerate 24 -pattern_type glob -i "{frames}/frame_*.png" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart -an "{base}.mp4"
    !ffmpeg -y -loglevel error -framerate 24 -pattern_type glob -i "{frames}/frame_*.png" -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -an "{base}.webm"
    !ffmpeg -y -loglevel error -i "{base}.mp4" -frames:v 1 -q:v 3 "{base}.jpg"
    print('✓', shot['id'], f'{(time.time()-t0)/60:.1f} min')
print('All done →', OUT)"""),
    md("""### Next
Tell Claude the videos are in `Drive / AQUILO-AI / videos` — it will pull them through the Google Drive connector,
optimise them and wire them into the site. To add shots, append to `SHOTS['shots']` (any public image URL + prompt)."""),
]

nb = {"nbformat": 4, "nbformat_minor": 5, "metadata": {"accelerator": "GPU", "colab": {"gpuType": "T4", "provenance": []},
      "kernelspec": {"name": "python3", "display_name": "Python 3"}}, "cells": cells}
for c in nb["cells"]:
    c["source"] = c["source"].splitlines(keepends=True)
(here / "aquilo_wan22_colab.ipynb").write_text(json.dumps(nb, indent=1, ensure_ascii=False), encoding="utf8")
print("wrote", here / "aquilo_wan22_colab.ipynb")
