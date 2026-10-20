"""CAD route, step 6: photoreal 360 of the CAD model in Blender Cycles.

Usage:
    blender -b -P product3d/cad/render_blender.py -- <product dir> [--frames 144] [--size 900] [--samples 96] [--only 0] [--between]

Imports model-cad.glb and gives each part its finish from its name ("main" = the product's finish from views.json,
or a fixed one such as "rubber"). Lights it like a product shot (bright tent, dark horizon band, black flags, long
soft boxes; chrome is only as good as what it reflects), scaled to the product's size, optionally puts a shadow
catcher under it and turns it on a virtual turntable. views.json "render": {"elevation": degrees or "photo"
(the fitted camera of the first photo), "floor": true, "axis": "center" (wall pieces) or the product's own axis}.
Frame 0 is the first photo's angle. Writes <product dir>/cad-spin/NN.png (transparent background).
"""

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
product_dir = Path(argv[0]).resolve()
opt = lambda k, d: type(d)(argv[argv.index(f"--{k}") + 1]) if f"--{k}" in argv else d
frames, size, samples, only = opt("frames", 72), opt("size", 900), opt("samples", 96), opt("only", -1)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

spec = json.loads((product_dir / "views.json").read_text())
look = spec.get("render", {})
fit_path = product_dir / "fit.json"
photo_cam = next(iter(json.loads(fit_path.read_text()).get("cameras", {}).values()), None) if fit_path.exists() else None

# Finishes: (base colour, metallic, roughness, coat).
FINISHES = {
    "chrome": ((0.93, 0.93, 0.95), 1.0, 0.05, 0.0),
    "brushed nickel": ((0.78, 0.74, 0.68), 1.0, 0.3, 0.0),
    "matte black": ((0.005, 0.005, 0.006), 0.0, 0.3, 0.0),
    "gloss white": ((0.86, 0.86, 0.84), 0.0, 0.25, 1.0),
    "rubber": ((0.32, 0.33, 0.34), 0.0, 0.7, 0.0),
}
# Model: glTF comes in Y up, Blender turns it Z up. Stand it on the floor, centred on its axis.
bpy.ops.import_scene.gltf(filepath=str(product_dir / "model-cad.glb"))
meshes = [o for o in scene.objects if o.type == "MESH"]
bpy.context.view_layer.update()


def part_name(o):
    """Part labels from build_cad.py become object names (Blender may add .001), on the mesh or a parent."""
    while o is not None:
        name = o.name.split(".")[0]
        if name == "main" or name in FINISHES:
            return name
        o = o.parent
    return "main"


pivot = bpy.data.objects.new("turntable", None)
scene.collection.objects.link(pivot)
parts = {}
materials = {}


def material(name):
    if name not in materials:
        color, metal, rough, coat = FINISHES[name]
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = (*color, 1)
        bsdf.inputs["Metallic"].default_value = metal
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Coat Weight"].default_value = coat
        materials[name] = mat
    return materials[name]


for o in meshes:
    part = part_name(o)
    o.data.materials.clear()
    o.data.materials.append(material(spec.get("finish", "chrome") if part == "main" else part))
    # Onto the turntable, keeping where the part is (its parents carry the glTF's Y up rotation).
    world_matrix = o.matrix_world.copy()
    o.parent = pivot
    o.matrix_world = world_matrix
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    o.select_set(False)

# Size, and the studio's scale: it was set up around a 16 cm tap (span 0.27 m), so a 40 cm basin gets it all larger.
bpy.context.view_layer.update()
zs = [(o.matrix_world @ v.co).z for o in meshes for v in o.data.vertices]
xs = [(o.matrix_world @ v.co).x for o in meshes for v in o.data.vertices]
ys = [(o.matrix_world @ v.co).y for o in meshes for v in o.data.vertices]
height = max(zs) - min(zs)
reach = max(max(abs(min(xs)), abs(max(xs))), max(abs(min(ys)), abs(max(ys))))
if look.get("axis") == "center":
    # Wall pieces turn about the middle of their footprint, not the head's axis, so they stay large in frame.
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    for o in meshes:
        o.location.x -= cx
        o.location.y -= cy
    xs, ys = [x - cx for x in xs], [y - cy for y in ys]
    reach = max(math.hypot(x, y) for x, y in zip(xs, ys))
S = max(height, 2 * reach) / 0.27
for o in meshes:
    o.location.z -= min(zs)

# Floor that only keeps the shadow (not for pieces that hang on a wall).
if look.get("floor", True):
    bpy.ops.mesh.primitive_plane_add(size=2 * S)
    floor = bpy.context.object
    floor.is_shadow_catcher = True
    # The camera looks down a little, so a vertical chrome body mostly mirrors the floor; seen in reflections a
    # lit floor turns the chrome into flat white. Reflections see the dark studio instead.
    floor.visible_glossy = False

# Chrome is only what it reflects. Like a product photographer's tent: bright above and below, a dark band round
# the horizon (the crisp dark lines along a chrome body), black flags by the lens (the dark stripe down the
# front), long white soft boxes either side. Nothing here is seen directly by the camera.
world = bpy.data.worlds.new("studio")
scene.world = world
world.use_nodes = True
wn, wl = world.node_tree.nodes, world.node_tree.links
coord = wn.new("ShaderNodeTexCoord")
sep = wn.new("ShaderNodeSeparateXYZ")
ramp = wn.new("ShaderNodeValToRGB")
fac = wn.new("ShaderNodeMapRange")
wl.new(coord.outputs["Generated"], sep.inputs["Vector"])
wl.new(sep.outputs["Z"], fac.inputs["Value"])
fac.inputs["From Min"].default_value, fac.inputs["From Max"].default_value = -1.0, 1.0
wl.new(fac.outputs["Result"], ramp.inputs["Fac"])
stops = [(0.0, 0.55), (0.40, 0.8), (0.47, 0.06), (0.53, 0.02), (0.60, 0.25), (0.75, 0.95), (1.0, 1.0)]
ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = stops[0][0], (stops[0][1],) * 3 + (1,)
ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = stops[-1][0], (stops[-1][1],) * 3 + (1,)
for pos, v in stops[1:-1]:
    e = ramp.color_ramp.elements.new(pos)
    e.color = (v, v, v, 1)
bg = wn["Background"]
wl.new(ramp.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = opt("ambient", 1.0)


def flag(name, loc, size_xy, face=(0, 0, 0.09)):
    """Black card; seen only in reflections, casts no shadow."""
    loc, face = Vector(loc) * S, Vector(face) * S
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    card = bpy.context.object
    card.name = name
    card.scale = (size_xy[0] * S, size_xy[1] * S, 1)
    card.rotation_euler = (face - loc).to_track_quat("Z", "Y").to_euler()
    card.visible_camera = False
    card.visible_shadow = False
    black = bpy.data.materials.new(name)
    black.use_nodes = True
    bsdf_ = black.node_tree.nodes["Principled BSDF"]
    bsdf_.inputs["Base Color"].default_value = (0, 0, 0, 1)
    bsdf_.inputs["Specular IOR Level"].default_value = 0
    card.data.materials.append(black)


flag("flag-l", (-0.12, -0.6, 0.1), (0.1, 0.8))
flag("flag-r", (0.14, -0.6, 0.1), (0.06, 0.8))


def softbox(name, loc, size_xy, strength, face=(0, 0, 0.09)):
    loc, face = Vector(loc) * S, Vector(face) * S
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    box = bpy.context.object
    box.name = name
    box.scale = (size_xy[0] * S, size_xy[1] * S, 1)
    box.rotation_euler = (face - loc).to_track_quat("Z", "Y").to_euler()
    box.visible_camera = False
    box.visible_shadow = False
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.remove(nodes["Principled BSDF"])
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength
    links.new(em.outputs["Emission"], nodes["Material Output"].inputs["Surface"])
    box.data.materials.append(mat)


k = opt("light", 1.0)
softbox("left", (-0.32, -0.3, 0.12), (0.12, 0.6), 9 * k)
softbox("right", (0.36, -0.12, 0.14), (0.1, 0.6), 7 * k)
softbox("back", (-0.05, 0.42, 0.18), (0.1, 0.5), 5 * k)
softbox("top", (0.02, -0.05, 0.5), (0.5, 0.35), 5 * k, face=(0, 0, 0.0))
softbox("front", (0.0, -0.55, 0.06), (0.5, 0.06), 3 * k)

# Camera: long lens like product photography, at the product's elevation (slightly above, or below for a shower).
cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 85
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
dist = 1.15 * S
# "photo" = the elevation the fit found for the first photo.
elev_deg = look.get("elevation", 12)
elev = math.radians(photo_cam["pitch"] if elev_deg == "photo" and photo_cam else (12 if elev_deg == "photo" else elev_deg))
target = (0, 0, height * 0.5)
cam.location = (0, -dist * math.cos(elev), target[2] + dist * math.sin(elev))
direction = (target[0] - cam.location[0], target[1] - cam.location[1], target[2] - cam.location[2])
cam.rotation_euler = Vector(direction).to_track_quat("-Z", "Y").to_euler()
# Fit: the frame must hold the tallest and widest view of the turn.
span = max(height, 2 * reach) * 1.2
cam_data.sensor_fit = "VERTICAL"
cam_data.sensor_height = span / dist * cam_data.lens

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = samples
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.glossy_bounces = 6
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = size
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"

# Frame 0 at the angle of the first photo (from fit.json), so the 360 opens on the view the client shot.
start = look.get("startYaw", photo_cam["yaw"] if photo_cam else 0.0)

out = product_dir / "cad-spin"
out.mkdir(exist_ok=True)
# --between: the turn has `frames` angles of which the even ones exist already (a doubled turn); render only the odd.
todo = [only] if only >= 0 else (range(1, frames, 2) if "--between" in argv else range(frames))
for i in todo:
    # --between resumes: frames already rendered (an interrupted run) are kept.
    if "--between" in argv and (out / f"{i:03d}.png").exists():
        continue
    pivot.rotation_euler = (0, 0, math.radians(start + i * 360 / frames))
    scene.render.filepath = str(out / f"{i:03d}.png")
    bpy.ops.render.render(write_still=True)
    print(f"frame {i}", flush=True)
