import bpy
import bmesh
import json
import math
import os
import random
import traceback
from mathutils import Vector, Euler, Matrix

PROJECT_DIR = r"c:\Users\stdma\projetos\Site-Jl-Cacamas"
BLENDER_DIR = os.path.join(PROJECT_DIR, "blender")
TEX_DIR = os.path.join(BLENDER_DIR, "textures")
RENDERS_DIR = os.path.join(BLENDER_DIR, "renders")
BLEND_PATH = os.path.join(BLENDER_DIR, "jl_cacamba.blend")
GLB_PATH = os.path.join(PROJECT_DIR, "assets", "models", "jl_cacamba.glb")
STATUS_PATH = os.path.join(RENDERS_DIR, "build_status.json")

os.makedirs(RENDERS_DIR, exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def set_bsdf(bsdf, names, value):
    for n in names:
        if n in bsdf.inputs:
            bsdf.inputs[n].default_value = value
            return


def load_packed_image(filename, non_color=False):
    path = os.path.join(TEX_DIR, filename)
    if not os.path.exists(path):
        return None
    img = bpy.data.images.load(path)
    if non_color:
        try:
            img.colorspace_settings.name = "Non-Color"
        except Exception:
            pass
    img.pack()
    return img


def make_pbr_mat(name, base_color=(0.5, 0.5, 0.5, 1.0), metallic=0.0, roughness=0.5,
                 coat=0.0, coat_rough=0.2, emission=None, emission_strength=0.0,
                 albedo_file=None, rough_file=None, normal_file=None, normal_strength=0.75,
                 uv_scale=1.0, clip_uv=False):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (uv_scale, uv_scale, uv_scale)
    nt.links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])

    if albedo_file:
        img = load_packed_image(albedo_file, non_color=False)
        if img:
            t = nt.nodes.new("ShaderNodeTexImage")
            t.image = img
            if clip_uv:
                t.extension = "CLIP"
            nt.links.new(mapping.outputs["Vector"], t.inputs["Vector"])
            nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        set_bsdf(bsdf, ["Base Color"], base_color)

    if rough_file:
        rimg = load_packed_image(rough_file, non_color=True)
        if rimg:
            rt = nt.nodes.new("ShaderNodeTexImage")
            rt.image = rimg
            if clip_uv:
                rt.extension = "CLIP"
            nt.links.new(mapping.outputs["Vector"], rt.inputs["Vector"])
            nt.links.new(rt.outputs["Color"], bsdf.inputs["Roughness"])
    else:
        set_bsdf(bsdf, ["Roughness"], roughness)

    if normal_file:
        nimg = load_packed_image(normal_file, non_color=True)
        if nimg:
            ntex = nt.nodes.new("ShaderNodeTexImage")
            ntex.image = nimg
            if clip_uv:
                ntex.extension = "CLIP"
            nmap = nt.nodes.new("ShaderNodeNormalMap")
            nmap.inputs["Strength"].default_value = normal_strength
            nt.links.new(mapping.outputs["Vector"], ntex.inputs["Vector"])
            nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
            nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])

    set_bsdf(bsdf, ["Metallic"], metallic)
    set_bsdf(bsdf, ["Coat Weight", "Clearcoat"], coat)
    set_bsdf(bsdf, ["Coat Roughness", "Clearcoat Roughness"], coat_rough)
    if emission is not None:
        set_bsdf(bsdf, ["Emission Color", "Emission"], emission)
        set_bsdf(bsdf, ["Emission Strength"], emission_strength)
    return mat


def create_materials():
    mats = {}
    mats["yellow_steel"] = make_pbr_mat(
        "Mat_JL_Yellow_Steel",
        metallic=0.22,
        coat=0.35,
        coat_rough=0.18,
        albedo_file="jl_hull_albedo.png",
        rough_file="jl_hull_roughness.png",
        normal_file="jl_hull_normal.png",
        normal_strength=0.45,
        uv_scale=2.0,
    )
    mats["side_decal"] = make_pbr_mat(
        "Mat_JL_Side_Decal",
        metallic=0.22,
        coat=0.35,
        coat_rough=0.18,
        albedo_file="jl_steel_albedo.png",
        rough_file="jl_steel_roughness.png",
        normal_file="jl_steel_normal.png",
        normal_strength=0.45,
        uv_scale=1.0,
        clip_uv=True,
    )
    mats["yellow_inner"] = make_pbr_mat(
        "Mat_JL_Yellow_Inner",
        metallic=0.42,
        albedo_file="inner_steel_albedo.png",
        rough_file="inner_steel_roughness.png",
        normal_file="inner_steel_normal.png",
        normal_strength=0.70,
        uv_scale=2.2,
    )
    mats["dark_steel"] = make_pbr_mat(
        "Mat_Forged_Steel",
        base_color=(0.042, 0.048, 0.058, 1.0),
        metallic=0.88,
        roughness=0.32,
        coat=0.20,
        normal_file="jl_hull_normal.png",
        normal_strength=0.35,
        uv_scale=3.0,
    )
    mats["chrome_steel"] = make_pbr_mat(
        "Mat_Chrome_Steel",
        base_color=(0.76, 0.78, 0.80, 1.0),
        metallic=0.95,
        roughness=0.22,
    )
    mats["rebar_rust"] = make_pbr_mat(
        "Mat_Rebar_Rust",
        base_color=(0.24, 0.075, 0.028, 1.0),
        metallic=0.58,
        roughness=0.72,
    )
    mats["ref_red"] = make_pbr_mat(
        "Mat_Reflective_Red",
        base_color=(0.82, 0.022, 0.022, 1.0),
        metallic=0.25,
        roughness=0.16,
        coat=0.88,
        emission=(0.82, 0.025, 0.02, 1.0),
        emission_strength=0.22,
    )
    mats["ref_white"] = make_pbr_mat(
        "Mat_Reflective_White",
        base_color=(0.95, 0.95, 0.95, 1.0),
        metallic=0.20,
        roughness=0.15,
        coat=0.88,
        emission=(0.95, 0.95, 0.92, 1.0),
        emission_strength=0.14,
    )

    # AAA Debris PBR materials
    mats["concrete"] = make_pbr_mat(
        "Mat_Concrete_PBR",
        metallic=0.0,
        roughness=0.92,
        albedo_file="concrete_albedo.png",
        normal_file="concrete_normal.png",
        normal_strength=0.95,
        uv_scale=1.6,
    )
    mats["concrete_block"] = make_pbr_mat(
        "Mat_Concrete_Block",
        metallic=0.0,
        roughness=0.94,
        albedo_file="concrete_albedo.png",
        normal_file="concrete_normal.png",
        normal_strength=1.05,
        uv_scale=2.2,
    )
    mats["brick"] = make_pbr_mat(
        "Mat_Brick_Baiano",
        metallic=0.0,
        roughness=0.84,
        albedo_file="brick_albedo.png",
        normal_file="brick_normal.png",
        normal_strength=0.95,
        uv_scale=1.4,
    )
    mats["wood"] = make_pbr_mat(
        "Mat_Wood_Formwork",
        metallic=0.0,
        roughness=0.78,
        albedo_file="wood_albedo.png",
        normal_file="wood_normal.png",
        normal_strength=0.80,
        uv_scale=1.5,
    )
    mats["gravel"] = make_pbr_mat(
        "Mat_Gravel_Bed",
        metallic=0.0,
        roughness=0.96,
        albedo_file="gravel_albedo.png",
        normal_file="gravel_normal.png",
        normal_strength=1.15,
        uv_scale=4.5,
    )
    mats["tile_ceramic"] = make_pbr_mat(
        "Mat_Tile_Ceramic",
        base_color=(0.82, 0.79, 0.72, 1.0),
        metallic=0.0,
        roughness=0.24,
        coat=0.65,
    )
    mats["pvc_pipe"] = make_pbr_mat(
        "Mat_PVC_Pipe",
        base_color=(0.24, 0.25, 0.28, 1.0),
        metallic=0.04,
        roughness=0.38,
        coat=0.22,
    )

    # Tarp woven PVC + ratchet straps + rope
    mats["tarp"] = make_pbr_mat(
        "Mat_Tarp_Cover",
        metallic=0.04,
        roughness=0.62,
        coat=0.14,
        albedo_file="tarp_albedo.png",
        normal_file="tarp_normal.png",
        normal_strength=0.75,
        uv_scale=3.5,
    )
    mats["tarp_strap"] = make_pbr_mat(
        "Mat_Tarp_Strap",
        base_color=(0.92, 0.54, 0.01, 1.0),
        metallic=0.05,
        roughness=0.46,
    )
    mats["tarp_rope"] = make_pbr_mat(
        "Mat_Tarp_Rope",
        base_color=(0.14, 0.14, 0.14, 1.0),
        metallic=0.0,
        roughness=0.82,
    )
    return mats


def link_obj(obj, col):
    col.objects.link(obj)
    return obj


def apply_box_uv(bm, scale=0.5):
    """Deterministic tri-planar box UV projection in bmesh so PBR textures never stretch."""
    uv_layer = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for loop in f.loops:
            co = loop.vert.co
            if az >= ax and az >= ay:
                u, v = co.x * scale, co.y * scale
            elif ax >= ay and ax >= az:
                u, v = co.y * scale, co.z * scale
            else:
                u, v = co.x * scale, co.z * scale
            loop[uv_layer].uv = (u, v)


def apply_bevel(obj, width=0.008, segments=2, angle_deg=32):
    mod = obj.modifiers.new(name="Bevel", type="BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(angle_deg)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)


def build_cacamba_hull(mats, col, parent_empty):
    """
    High-Craft Industrial Brooks 4.2m3 Dumpster (NBR 14728 / Indaiatuba Lei 097/2017):
    - Beveled folded-steel hollow body with worn inner steel PBR & satin powdercoat exterior
    - Heavy mitered top tubular rim with 4 welded corner reinforcement gussets
    - 8 welded tarp tie-down loops under the rim
    - Slanted structural corner ribs, end-wall trapezoid ribs & heavy I-beam base skids
    - 6 forged steel lifting/tipping pins with hex-bolted backing plates & chain grooves
    - Flush PBR UV-mapped side decal plaques (Albedo + Roughness + Normal)
    - Riveted reflective chevron brackets on both ends
    """
    def shell_pts(inset_xy=0.0, z_floor=0.08):
        bx0, bx1 = -0.92 + inset_xy, 0.92 - inset_xy
        by0, by1 = -0.66 + inset_xy, 0.66 - inset_xy
        tx0, tx1 = -1.36 + inset_xy, 1.36 - inset_xy
        ty0, ty1 = -0.82 + inset_xy, 0.82 - inset_xy
        return {
            "b": [Vector((bx0, by0, z_floor)), Vector((bx1, by0, z_floor)), Vector((bx1, by1, z_floor)), Vector((bx0, by1, z_floor))],
            "t": [Vector((tx0, ty0, 1.12)), Vector((tx1, ty0, 1.22)), Vector((tx1, ty1, 1.22)), Vector((tx0, ty1, 1.12))],
        }

    outer = shell_pts(0.0, 0.08)
    inner = shell_pts(0.048, 0.13)

    mesh = bpy.data.meshes.new("Cacamba_Hull_Mesh")
    bm = bmesh.new()
    ob = [bm.verts.new(v) for v in outer["b"]]
    ot = [bm.verts.new(v) for v in outer["t"]]
    ib = [bm.verts.new(v) for v in inner["b"]]
    it = [bm.verts.new(v) for v in inner["t"]]

    f = bm.faces.new([ob[0], ob[3], ob[2], ob[1]])
    f.material_index = 0
    f = bm.faces.new([ib[0], ib[1], ib[2], ib[3]])
    f.material_index = 1

    for i in range(4):
        j = (i + 1) % 4
        f1 = bm.faces.new([ob[i], ob[j], ot[j], ot[i]])
        f1.material_index = 0
        f2 = bm.faces.new([ib[j], ib[i], it[i], it[j]])
        f2.material_index = 1
        f3 = bm.faces.new([ot[i], ot[j], it[j], it[i]])
        f3.material_index = 0

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    apply_box_uv(bm, scale=0.6)
    bm.to_mesh(mesh)
    bm.free()

    hull = bpy.data.objects.new("Cacamba_Hull", mesh)
    hull.data.materials.append(mats["yellow_steel"])
    hull.data.materials.append(mats["yellow_inner"])
    link_obj(hull, col)
    apply_bevel(hull, width=0.010, segments=2)
    hull.parent = parent_empty

    # Mitered Top Structural Collar + 4 Welded Corner Gusset Plates
    rim_mesh = bpy.data.meshes.new("Cacamba_Top_Rim_Mesh")
    bm_r = bmesh.new()
    top_pts = outer["t"]
    for i in range(4):
        j = (i + 1) % 4
        p0, p1 = top_pts[i], top_pts[j]
        seg = p1 - p0
        length = seg.length + 0.11
        mid = (p0 + p1) * 0.5 + Vector((0, 0, 0.030))
        x_ax = seg.normalized()
        z_ax = Vector((0, 0, 1))
        y_ax = z_ax.cross(x_ax).normalized()
        z_ax = x_ax.cross(y_ax).normalized()
        rot_m = Matrix((
            (x_ax.x, y_ax.x, z_ax.x, mid.x),
            (x_ax.y, y_ax.y, z_ax.y, mid.y),
            (x_ax.z, y_ax.z, z_ax.z, mid.z),
            (0, 0, 0, 1),
        ))
        bmesh.ops.create_cube(bm_r, size=1.0, matrix=rot_m @ Matrix.Diagonal((length, 0.112, 0.082, 1.0)))

    # 4 corner steel gusset caps on top corners
    for pt in top_pts:
        sx = -1 if pt.x < 0 else 1
        sy = -1 if pt.y < 0 else 1
        gm = Matrix.Translation((pt.x - sx * 0.055, pt.y - sy * 0.055, pt.z + 0.074)) @ Matrix.Diagonal((0.18, 0.18, 0.014, 1.0))
        bmesh.ops.create_cube(bm_r, size=1.0, matrix=gm)

    apply_box_uv(bm_r, scale=0.8)
    bm_r.to_mesh(rim_mesh)
    bm_r.free()
    rim_obj = bpy.data.objects.new("Cacamba_Top_Rim", rim_mesh)
    rim_obj.data.materials.append(mats["yellow_steel"])
    link_obj(rim_obj, col)
    apply_bevel(rim_obj, width=0.009, segments=2)
    rim_obj.parent = parent_empty

    # Heavy I-beam Floor Skids + Cross Members + Corner Skid Shoes
    skid_mesh = bpy.data.meshes.new("Cacamba_Skids_Mesh")
    bm_s = bmesh.new()
    for sy in (-0.50, 0.50):
        # Web + top/bottom flanges (real I-beam silhouette)
        bmesh.ops.create_cube(bm_s, size=1.0, matrix=Matrix.Translation((0.0, sy, 0.042)) @ Matrix.Diagonal((1.84, 0.042, 0.084, 1.0)))
        bmesh.ops.create_cube(bm_s, size=1.0, matrix=Matrix.Translation((0.0, sy, 0.012)) @ Matrix.Diagonal((1.88, 0.125, 0.022, 1.0)))
        bmesh.ops.create_cube(bm_s, size=1.0, matrix=Matrix.Translation((0.0, sy, 0.074)) @ Matrix.Diagonal((1.84, 0.125, 0.020, 1.0)))
    for sx in (-0.78, -0.26, 0.26, 0.78):
        bmesh.ops.create_cube(bm_s, size=1.0, matrix=Matrix.Translation((sx, 0.0, 0.054)) @ Matrix.Diagonal((0.085, 1.26, 0.055, 1.0)))
    apply_box_uv(bm_s, scale=1.0)
    bm_s.to_mesh(skid_mesh)
    bm_s.free()
    skid_obj = bpy.data.objects.new("Cacamba_Skids", skid_mesh)
    skid_obj.data.materials.append(mats["dark_steel"])
    link_obj(skid_obj, col)
    apply_bevel(skid_obj, width=0.005, segments=1)
    skid_obj.parent = parent_empty

    # Folded Structural Ribs Framing the Unobstructed Stencil Area + Tarp Tie-Down Loops
    rib_mesh = bpy.data.meshes.new("Cacamba_Ribs_Mesh")
    bm_rib = bmesh.new()
    wall_slope = math.atan2(0.16, 1.09)
    for side in (-1, 1):
        # Bottom bumper rail
        bmesh.ops.create_cube(bm_rib, size=1.0, matrix=Matrix.Translation((0.0, side * 0.680, 0.145)) @ Matrix.Diagonal((1.88, 0.052, 0.068, 1.0)))
        # Upper sub-rim rail cleanly above stencil
        bmesh.ops.create_cube(
            bm_rib,
            size=1.0,
            matrix=Matrix.Translation((0.0, side * 0.816, 1.075)) @ Euler((0, math.radians(-2.1), 0)).to_matrix().to_4x4() @ Matrix.Diagonal((2.62, 0.048, 0.058, 1.0)),
        )
        # Slanted corner omega ribs at x = +-0.98 framing the decal panel
        for rx in (-0.98, 0.98):
            m_v = Matrix.Translation((rx, side * 0.752, 0.62)) @ Euler((-side * wall_slope, 0, 0)).to_matrix().to_4x4() @ Matrix.Diagonal((0.076, 0.054, 0.96, 1.0))
            bmesh.ops.create_cube(bm_rib, size=1.0, matrix=m_v)
            # Corner diagonal weld brace near bottom
            m_br = Matrix.Translation((rx * 0.95, side * 0.715, 0.22)) @ Euler((-side * wall_slope, 0, 0)).to_matrix().to_4x4() @ Matrix.Diagonal((0.12, 0.064, 0.14, 1.0))
            bmesh.ops.create_cube(bm_rib, size=1.0, matrix=m_br)

    # Front & rear ramp heavy vertical structural channels
    for ex, tilt in ((-1.155, -22.5), (1.155, 22.5)):
        for ry in (-0.48, 0.0, 0.48):
            m_e = Matrix.Translation((ex, ry, 0.62)) @ Euler((0, math.radians(tilt), 0)).to_matrix().to_4x4() @ Matrix.Diagonal((0.052, 0.078, 0.98, 1.0))
            bmesh.ops.create_cube(bm_rib, size=1.0, matrix=m_e)
        # End bumper beam near lower ramp
        bmesh.ops.create_cube(bm_rib, size=1.0, matrix=Matrix.Translation((ex * 0.88, 0.0, 0.22)) @ Euler((0, math.radians(tilt), 0)).to_matrix().to_4x4() @ Matrix.Diagonal((0.055, 1.32, 0.075, 1.0)))

    apply_box_uv(bm_rib, scale=0.8)
    bm_rib.to_mesh(rib_mesh)
    bm_rib.free()
    rib_obj = bpy.data.objects.new("Cacamba_Ribs", rib_mesh)
    rib_obj.data.materials.append(mats["yellow_steel"])
    link_obj(rib_obj, col)
    apply_bevel(rib_obj, width=0.006, segments=2)
    rib_obj.parent = parent_empty

    # Heavy Forged Steel Lifting Pins (6 units) with Bolted Plates, Chain Grooves & Tie-Down Hooks
    pin_mesh = bpy.data.meshes.new("Cacamba_Steel_Pins_Mesh")
    bm_p = bmesh.new()
    pin_coords = [(-1.09, 0.84), (1.09, 0.88), (0.98, 0.28)]
    for side in (-1, 1):
        for px, pz in pin_coords:
            t = (pz - 0.08) / (1.17 - 0.08)
            wy = 0.66 + t * (0.82 - 0.66)
            # Square beveled mounting plate + 4 hex bolts
            mp = Matrix.Translation((px, side * (wy + 0.015), pz)) @ Euler((-side * wall_slope, 0, 0)).to_matrix().to_4x4() @ Matrix.Diagonal((0.155, 0.026, 0.155, 1.0))
            bmesh.ops.create_cube(bm_p, size=1.0, matrix=mp)
            for bx in (-0.052, 0.052):
                for bz in (-0.052, 0.052):
                    mb = Matrix.Translation((px + bx, side * (wy + 0.032), pz + bz)) @ Euler((math.radians(90), 0, 0)).to_matrix().to_4x4()
                    bmesh.ops.create_cone(bm_p, cap_ends=True, cap_tris=False, segments=6, radius1=0.013, radius2=0.013, depth=0.016, matrix=mb)
            # Machined forged pin collar, shaft, chain retention groove & outer flanged head
            for dy, r1, r2, dep in (
                (0.034, 0.054, 0.050, 0.024),
                (0.072, 0.036, 0.036, 0.062),
                (0.106, 0.030, 0.030, 0.018),
                (0.126, 0.050, 0.044, 0.026),
            ):
                mc = Matrix.Translation((px, side * (wy + dy), pz)) @ Euler((math.radians(90), 0, 0)).to_matrix().to_4x4()
                bmesh.ops.create_cone(bm_p, cap_ends=True, cap_tris=False, segments=24, radius1=r1, radius2=r2, depth=dep, matrix=mc)

        # 4 welded tarp tie-down hooks along upper rail (each side)
        for hx in (-0.75, -0.25, 0.25, 0.75):
            zh = 1.06 + (hx / 2.72) * 0.10
            mh = Matrix.Translation((hx, side * 0.855, zh)) @ Matrix.Diagonal((0.024, 0.038, 0.045, 1.0))
            bmesh.ops.create_cube(bm_p, size=1.0, matrix=mh)

    apply_box_uv(bm_p, scale=2.0)
    bm_p.to_mesh(pin_mesh)
    bm_p.free()
    pin_obj = bpy.data.objects.new("Cacamba_Steel_Pins", pin_mesh)
    pin_obj.data.materials.append(mats["dark_steel"])
    link_obj(pin_obj, col)
    pin_obj.parent = parent_empty

    # Flush PBR Brand Decal Plaques (Albedo + Roughness + Normal Map)
    for side, name in ((-1, "Cacamba_Decal_Front"), (1, "Cacamba_Decal_Back")):
        dmesh = bpy.data.meshes.new(name + "_Mesh")
        bm_d = bmesh.new()
        uv_layer = bm_d.loops.layers.uv.new("UVMap")
        z_bot, z_top = 0.22, 1.00
        def wall_y(z):
            t = (z - 0.08) / (1.17 - 0.08)
            return side * (0.66 + t * (0.82 - 0.66) + 0.007)
        yb, yt = wall_y(z_bot), wall_y(z_top)
        if side == -1:
            verts = [bm_d.verts.new((-0.90, yb, z_bot)), bm_d.verts.new((0.90, yb, z_bot)), bm_d.verts.new((0.90, yt, z_top)), bm_d.verts.new((-0.90, yt, z_top))]
        else:
            verts = [bm_d.verts.new((0.90, yb, z_bot)), bm_d.verts.new((-0.90, yb, z_bot)), bm_d.verts.new((-0.90, yt, z_top)), bm_d.verts.new((0.90, yt, z_top))]
        face = bm_d.faces.new(verts)
        for loop, uv in zip(face.loops, [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]):
            loop[uv_layer].uv = uv
        bmesh.ops.recalc_face_normals(bm_d, faces=bm_d.faces)
        bm_d.to_mesh(dmesh)
        bm_d.free()
        dobj = bpy.data.objects.new(name, dmesh)
        dobj.data.materials.append(mats["side_decal"])
        link_obj(dobj, col)
        dobj.parent = parent_empty

    # Riveted Reflective Safety Brackets on Both End Ramps
    ref_mesh = bpy.data.meshes.new("Cacamba_Reflectors_Mesh")
    bm_rf = bmesh.new()
    for ex, tilt in ((-1.268, -22.5), (1.268, 22.5)):
        for idx, ry in enumerate((-0.62, -0.45, 0.45, 0.62)):
            m_rf = Matrix.Translation((ex, ry, 0.90)) @ Euler((0, math.radians(tilt), 0)).to_matrix().to_4x4() @ Matrix.Diagonal((0.022, 0.145, 0.075, 1.0))
            ret = bmesh.ops.create_cube(bm_rf, size=1.0, matrix=m_rf)
            mat_i = 0 if idx % 2 == 0 else 1
            for v in ret["verts"]:
                for f in v.link_faces:
                    f.material_index = mat_i
    bm_rf.to_mesh(ref_mesh)
    bm_rf.free()
    ref_obj = bpy.data.objects.new("Cacamba_Reflectors", ref_mesh)
    ref_obj.data.materials.append(mats["ref_red"])
    ref_obj.data.materials.append(mats["ref_white"])
    link_obj(ref_obj, col)
    ref_obj.parent = parent_empty

    return hull


def make_hollow_baiano_brick(name, broken=False, seed=0):
    """
    Authentic Brazilian hollow ceramic brick (tijolo baiano de 6 furos):
    Real exterior shell with 2x3 hollow channels passing completely through + ceramic grooves PBR!
    """
    rng = random.Random(seed)
    L = 0.24 * (rng.uniform(0.58, 0.85) if broken else 1.0)
    W = 0.125
    H = 0.115
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm = bmesh.new()

    # Build a 3-column x 2-row hollow grid (walls + partitions = authentic 6-hole hollow brick!)
    t_wall = 0.014
    # Outer 4 walls
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, 0, H / 2 - t_wall / 2)) @ Matrix.Diagonal((L, W, t_wall, 1.0)))
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, 0, -H / 2 + t_wall / 2)) @ Matrix.Diagonal((L, W, t_wall, 1.0)))
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, W / 2 - t_wall / 2, 0)) @ Matrix.Diagonal((L, t_wall, H, 1.0)))
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, -W / 2 + t_wall / 2, 0)) @ Matrix.Diagonal((L, t_wall, H, 1.0)))
    # Inner horizontal divider (separates upper 3 holes & lower 3 holes)
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((L, W - t_wall, 0.011, 1.0)))
    # 2 inner vertical dividers (3 columns of holes)
    for dy in (-W / 6, W / 6):
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, dy, 0)) @ Matrix.Diagonal((L, 0.011, H - t_wall, 1.0)))

    if broken:
        for v in bm.verts:
            if v.co.x > L * 0.25:
                v.co.x += rng.uniform(-0.028, 0.028)
                v.co.z += rng.uniform(-0.010, 0.010)

    apply_box_uv(bm, scale=4.5)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def make_hollow_concrete_block(name, seed=0):
    """Authentic Brazilian 2-cell hollow concrete masonry block (bloco de concreto)."""
    rng = random.Random(seed)
    L, W, H = 0.34, 0.145, 0.165
    t = 0.024
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm = bmesh.new()
    # 2 long walls + 3 cross webs leaving 2 deep open vertical cavities
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, W / 2 - t / 2, 0)) @ Matrix.Diagonal((L, t, H, 1.0)))
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, -W / 2 + t / 2, 0)) @ Matrix.Diagonal((L, t, H, 1.0)))
    for dx in (-L / 2 + t / 2, 0.0, L / 2 - t / 2):
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((dx, 0, 0)) @ Matrix.Diagonal((t, W, H, 1.0)))
    # Subtle chipped corners for demolition realism
    for v in bm.verts:
        v.co.x += rng.uniform(-0.005, 0.005)
        v.co.y += rng.uniform(-0.004, 0.004)
        v.co.z += rng.uniform(-0.005, 0.005)
    apply_box_uv(bm, scale=3.2)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def make_reinforced_concrete_slab(name, sx, sy, sz, seed, mats):
    """Broken reinforced concrete beam/slab with exposed rusted CA-50 steel rebar rods!"""
    rng = random.Random(seed)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm = bmesh.new()
    # Material 0: concrete, Material 1: rebar_rust
    ret = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((sx, sy, sz, 1.0)))
    bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=2, use_grid_fill=True)
    for v in bm.verts:
        edge_bias = 1.0 if abs(v.co.x) > sx * 0.35 else 0.4
        v.co.x += rng.uniform(-sx * 0.08, sx * 0.08) * edge_bias
        v.co.y += rng.uniform(-sy * 0.09, sy * 0.09)
        v.co.z += rng.uniform(-sz * 0.14, sz * 0.14)
    for f in bm.faces:
        f.material_index = 0

    # Add 2 protruding bent steel rebar rods on broken end
    for ry in (-sy * 0.24, sy * 0.24):
        rod_len = rng.uniform(0.18, 0.30)
        rot_rod = Euler((rng.uniform(-0.2, 0.2), math.radians(90) + rng.uniform(-0.25, 0.25), rng.uniform(-0.2, 0.2))).to_matrix().to_4x4()
        m_rod = Matrix.Translation((sx * 0.45 + rod_len * 0.35, ry, rng.uniform(-sz * 0.15, sz * 0.15))) @ rot_rod
        r_geo = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8, radius1=0.0085, radius2=0.0085, depth=rod_len, matrix=m_rod)
        for v in r_geo["verts"]:
            for f in v.link_faces:
                f.material_index = 1

    apply_box_uv(bm, scale=2.6)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mats["concrete"])
    obj.data.materials.append(mats["rebar_rust"])
    return obj


def make_organic_rubble_chunk(name, sx, sy, sz, seed):
    """High-resolution smooth-shaded jagged concrete rubble chunk (zero ugly low-poly facets!)."""
    rng = random.Random(seed)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    # Coherent multi-frequency wave displacement (produces crisp fractured stone, NOT spiky noise)
    px, py, pz = rng.uniform(0, 6), rng.uniform(0, 6), rng.uniform(0, 6)
    for v in bm.verts:
        d = v.co.normalized()
        disp = (
            1.0
            + 0.18 * math.sin(d.x * 3.2 + px) * math.cos(d.y * 2.9 + py)
            + 0.11 * math.cos(d.z * 4.5 + pz) * math.sin(d.x * 4.1)
            + 0.06 * math.sin((d.x + d.y + d.z) * 7.0 + px)
        )
        # Shear one side flat like a fractured concrete face
        if d.z < -0.45:
            disp *= 0.78
        v.co.x *= sx * disp
        v.co.y *= sy * disp
        v.co.z *= sz * disp
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    apply_box_uv(bm, scale=3.0)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    return mesh


def make_hollow_pvc_pipe(name, length=0.44, radius=0.052):
    """Authentic hollow open-ended PVC conduit pipe (thick tube wall, never a capped solid cylinder!)."""
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm = bmesh.new()
    segs = 18
    r_in = radius * 0.84
    ring_l_out, ring_l_in, ring_r_out, ring_r_in = [], [], [], []
    for i in range(segs):
        a = (i / segs) * math.tau
        cy, cz = math.cos(a), math.sin(a)
        ring_l_out.append(bm.verts.new((-length / 2, cy * radius, cz * radius)))
        ring_l_in.append(bm.verts.new((-length / 2, cy * r_in, cz * r_in)))
        ring_r_out.append(bm.verts.new((length / 2, cy * radius, cz * radius)))
        ring_r_in.append(bm.verts.new((length / 2, cy * r_in, cz * r_in)))
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new([ring_l_out[i], ring_r_out[i], ring_r_out[j], ring_l_out[j]])
        bm.faces.new([ring_l_in[j], ring_r_in[j], ring_r_in[i], ring_l_in[i]])
        bm.faces.new([ring_l_out[j], ring_l_in[j], ring_l_in[i], ring_l_out[i]])
        bm.faces.new([ring_r_out[i], ring_r_in[i], ring_r_in[j], ring_r_out[j]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    apply_box_uv(bm, scale=2.0)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    return mesh


def make_wood_plank(name, sx, sy, sz, seed):
    rng = random.Random(seed)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((sx, sy, sz, 1.0)))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.004, segments=1, affect="EDGES")
    # Splintered end edge
    for v in bm.verts:
        if v.co.x > sx * 0.42:
            v.co.x += rng.uniform(-0.035, 0.035)
    apply_box_uv(bm, scale=2.0)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def build_debris_system(mats, col, parent_empty):
    """
    74 High-Craft individual debris pieces + high-density organic gravel/rubble base mound:
    Hollow 6-hole baiano bricks, 2-cell hollow concrete blocks, rebar-reinforced slabs,
    smooth-fractured organic concrete chunks, splintered formwork planks, hollow PVC pipes,
    and broken ceramic tiles — strictly respecting Lei 46.594/2005 rim limit!
    """
    rng = random.Random(2013)
    debris_objs = []

    # 1. High-resolution gravel/rubble bed mound (fills all internal voids cleanly)
    mound_mesh = bpy.data.meshes.new("Debris_Mound_Core_Mesh")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=22, y_segments=14, size=1.0)
    for v in list(bm.verts):
        v.co.x *= 1.14
        v.co.y *= 0.68
        dist = math.sqrt((v.co.x / 1.20) ** 2 + (v.co.y / 0.72) ** 2)
        dome = max(0.0, 1.0 - dist * dist) * 0.25
        bump = (
            0.035 * math.sin(v.co.x * 7.0 + v.co.y * 5.0)
            + 0.022 * math.cos(v.co.x * 13.0 - v.co.y * 11.0)
            + rng.uniform(-0.015, 0.018)
        )
        v.co.z = 0.80 + dome + bump
    ret = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    for v in [e for e in ret["geom"] if isinstance(e, bmesh.types.BMVert)]:
        v.co.x *= 0.74
        v.co.y *= 0.82
        v.co.z = 0.14
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    apply_box_uv(bm, scale=1.2)
    bm.to_mesh(mound_mesh)
    bm.free()
    for p in mound_mesh.polygons:
        p.use_smooth = True
    mound = bpy.data.objects.new("Debris_Mound_Core", mound_mesh)
    mound.data.materials.append(mats["gravel"])
    link_obj(mound, col)
    mound.parent = parent_empty
    debris_objs.append({"obj": mound, "layer": 0, "kind": "mound"})

    # 2. 74 hero debris pieces across 5 layers
    layer_specs = [
        (1, 0.34, 0.54, 0.86, 0.52, 14),
        (2, 0.52, 0.72, 0.94, 0.56, 15),
        (3, 0.70, 0.88, 1.02, 0.59, 15),
        (4, 0.86, 1.02, 1.06, 0.61, 15),
        (5, 0.99, 1.12, 1.00, 0.56, 15),
    ]

    seed_counter = 500
    for layer_idx, z0, z1, xs, ys, count in layer_specs:
        for i in range(count):
            seed_counter += 1
            cols = 5
            row = i // cols
            col_i = i % cols
            rows_total = math.ceil(count / cols)
            fx = ((col_i + 0.5) / cols) * 2.0 - 1.0
            fy = ((row + 0.5) / rows_total) * 2.0 - 1.0
            px = fx * xs * 0.86 + rng.uniform(-0.10, 0.10)
            py = fy * ys * 0.84 + rng.uniform(-0.07, 0.07)
            pz = rng.uniform(z0, z1)

            roll = (i + layer_idx * 3) % 12
            piece_name = f"Debris_L{layer_idx}_{i+1:02d}"

            if roll in (0, 4, 8):
                mesh = make_hollow_baiano_brick(piece_name, broken=(roll == 8), seed=seed_counter)
                obj = bpy.data.objects.new(piece_name, mesh)
                obj.data.materials.append(mats["brick"])
            elif roll in (1, 7):
                mesh = make_hollow_concrete_block(piece_name, seed=seed_counter)
                obj = bpy.data.objects.new(piece_name, mesh)
                obj.data.materials.append(mats["concrete_block"])
            elif roll in (2, 9):
                obj = make_reinforced_concrete_slab(
                    piece_name,
                    rng.uniform(0.30, 0.44),
                    rng.uniform(0.18, 0.28),
                    rng.uniform(0.065, 0.095),
                    seed_counter,
                    mats,
                )
            elif roll in (3, 10):
                mesh = make_organic_rubble_chunk(
                    piece_name,
                    rng.uniform(0.14, 0.22),
                    rng.uniform(0.11, 0.18),
                    rng.uniform(0.08, 0.13),
                    seed_counter,
                )
                obj = bpy.data.objects.new(piece_name, mesh)
                obj.data.materials.append(mats["concrete"])
            elif roll == 5:
                mesh = make_wood_plank(
                    piece_name,
                    rng.uniform(0.48, 0.72),
                    rng.uniform(0.095, 0.13),
                    rng.uniform(0.028, 0.042),
                    seed_counter,
                )
                obj = bpy.data.objects.new(piece_name, mesh)
                obj.data.materials.append(mats["wood"])
            elif roll == 6:
                mesh = make_hollow_pvc_pipe(piece_name, length=rng.uniform(0.36, 0.54), radius=0.048)
                obj = bpy.data.objects.new(piece_name, mesh)
                obj.data.materials.append(mats["pvc_pipe"])
            else:
                # Broken glazed ceramic floor tile shard
                mesh = make_wood_plank(piece_name, rng.uniform(0.22, 0.34), rng.uniform(0.18, 0.26), 0.014, seed_counter)
                obj = bpy.data.objects.new(piece_name, mesh)
                obj.data.materials.append(mats["tile_ceramic"])

            obj.location = (px, py, pz)
            obj.rotation_euler = (
                rng.uniform(-0.36, 0.36),
                rng.uniform(-0.34, 0.34),
                rng.uniform(0.0, math.tau),
            )
            link_obj(obj, col)
            obj.parent = parent_empty
            debris_objs.append({
                "obj": obj,
                "layer": layer_idx,
                "kind": "piece",
                "rest_loc": obj.location.copy(),
                "rest_rot": obj.rotation_euler.copy(),
            })

    return debris_objs


def build_tarp_cover(mats, col, parent_empty):
    """
    AAA Woven Waterproof Tarp (Lei Municipal 097/2017 Indaiatuba):
    - Clears all 4 corners of top rim with zero clipping
    - Natural fabric tension ripples & side skirt overhang
    - 12 chrome grommets + tension straps + metal ratchet buckles!
    """
    def tarp_z(tx, ty):
        z_rim_top = 1.12 + tx * 0.10 + 0.118
        cx = (tx - 0.5) * 2.0
        cy = (ty - 0.5) * 2.0
        ex = max(0.0, (abs(cx) - 0.945) / 0.055)
        ey = max(0.0, (abs(cy) - 0.935) / 0.065)
        skirt = max(ex, ey)
        bulge = max(0.0, 1.0 - (cx * cx * 0.65 + cy * cy * 0.72)) * 0.115
        wrinkle = (
            math.sin(tx * 18.0 + ty * 7.0) * 0.010
            + math.cos(tx * 9.0 - ty * 13.0) * 0.006
        ) * (1.0 - skirt * 0.7)
        return z_rim_top + bulge + wrinkle - (skirt ** 1.15) * 0.18

    mesh = bpy.data.meshes.new("Tarp_Cover_Mesh")
    bm = bmesh.new()
    nx, ny = 24, 16
    verts_grid = []
    for ix in range(nx + 1):
        row = []
        tx = ix / nx
        x = -1.56 + tx * 3.12
        for iy in range(ny + 1):
            ty = iy / ny
            y = -1.00 + ty * 2.00
            row.append(bm.verts.new((x, y, tarp_z(tx, ty))))
        verts_grid.append(row)

    uv_layer = bm.loops.layers.uv.new("UVMap")
    for ix in range(nx):
        for iy in range(ny):
            f = bm.faces.new([verts_grid[ix][iy], verts_grid[ix + 1][iy], verts_grid[ix + 1][iy + 1], verts_grid[ix][iy + 1]])
            uvs = [
                (ix / nx, iy / ny),
                ((ix + 1) / nx, iy / ny),
                ((ix + 1) / nx, (iy + 1) / ny),
                (ix / nx, (iy + 1) / ny),
            ]
            for loop, uv in zip(f.loops, uvs):
                loop[uv_layer].uv = uv

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    tarp = bpy.data.objects.new("Tarp_Cover", mesh)
    tarp.data.materials.append(mats["tarp"])
    mod = tarp.modifiers.new(name="Solidify", type="SOLIDIFY")
    mod.thickness = 0.016
    mod.offset = 1.0
    link_obj(tarp, col)
    bpy.context.view_layer.objects.active = tarp
    tarp.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    tarp.select_set(False)
    for p in tarp.data.polygons:
        p.use_smooth = True
    tarp.parent = parent_empty

    # 2 conforming yellow ratchet straps + metal chrome buckles & grommets
    strap_mesh = bpy.data.meshes.new("Tarp_Straps_Mesh")
    bm_st = bmesh.new()
    for tx_s in (0.30, 0.70):
        x_center = -1.56 + tx_s * 3.12
        half_w = 0.034
        prev_l = prev_r = None
        for iy in range(ny + 1):
            ty = iy / ny
            y = -1.00 + ty * 2.00
            z = tarp_z(tx_s, ty) + 0.022
            vl = bm_st.verts.new((x_center - half_w, y, z))
            vr = bm_st.verts.new((x_center + half_w, y, z))
            if prev_l is not None:
                bm_st.faces.new([prev_l, prev_r, vr, vl])
            prev_l, prev_r = vl, vr
    bmesh.ops.recalc_face_normals(bm_st, faces=bm_st.faces)
    bm_st.to_mesh(strap_mesh)
    bm_st.free()
    straps = bpy.data.objects.new("Tarp_Straps", strap_mesh)
    straps.data.materials.append(mats["tarp_strap"])
    mod_s = straps.modifiers.new(name="Solidify", type="SOLIDIFY")
    mod_s.thickness = 0.011
    mod_s.offset = 1.0
    link_obj(straps, col)
    bpy.context.view_layer.objects.active = straps
    straps.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod_s.name)
    straps.select_set(False)
    straps.parent = tarp

    # Chrome grommets & ratchet buckles along edges
    hw_mesh = bpy.data.meshes.new("Tarp_Hardware_Mesh")
    bm_hw = bmesh.new()
    for tx_g in (0.12, 0.30, 0.50, 0.70, 0.88):
        gx = -1.56 + tx_g * 3.12
        for side, ty_g in ((-1, 0.02), (1, 0.98)):
            gy = -1.00 + ty_g * 2.00
            gz = tarp_z(tx_g, ty_g) + 0.024
            m_g = Matrix.Translation((gx, gy, gz)) @ Euler((math.radians(90), 0, 0)).to_matrix().to_4x4()
            bmesh.ops.create_cone(bm_hw, cap_ends=True, cap_tris=False, segments=14, radius1=0.022, radius2=0.022, depth=0.016, matrix=m_g)
    # Ratchet buckle blocks on front side (-Y)
    for tx_b in (0.30, 0.70):
        bx = -1.56 + tx_b * 3.12
        bz = tarp_z(tx_b, 0.04) + 0.04
        bmesh.ops.create_cube(bm_hw, size=1.0, matrix=Matrix.Translation((bx, -0.96, bz)) @ Matrix.Diagonal((0.095, 0.042, 0.065, 1.0)))
    bm_hw.to_mesh(hw_mesh)
    bm_hw.free()
    hw_obj = bpy.data.objects.new("Tarp_Hardware", hw_mesh)
    hw_obj.data.materials.append(mats["chrome_steel"])
    link_obj(hw_obj, col)
    hw_obj.parent = tarp

    return tarp


def build_native_animation(root_empty, debris_objs, tarp):
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 180
    scene.render.fps = 30

    for item in debris_objs:
        obj = item["obj"]
        if item["kind"] == "mound":
            obj.scale = (0.001, 0.001, 0.001)
            obj.location = (0.0, 0.0, -0.04)
            obj.keyframe_insert(data_path="scale", frame=1)
            obj.keyframe_insert(data_path="location", frame=1)
            obj.keyframe_insert(data_path="scale", frame=20)
            obj.keyframe_insert(data_path="location", frame=20)
            obj.scale = (0.88, 0.88, 0.50)
            obj.location = (0.0, 0.0, 0.0)
            obj.keyframe_insert(data_path="scale", frame=72)
            obj.keyframe_insert(data_path="location", frame=72)
            obj.scale = (1.0, 1.0, 1.0)
            obj.location = (0.0, 0.0, 0.0)
            obj.keyframe_insert(data_path="scale", frame=122)
            obj.keyframe_insert(data_path="location", frame=122)
            continue

        layer = item["layer"]
        rest_loc = item["rest_loc"]
        rest_rot = item["rest_rot"]
        idx_num = int(obj.name.split("_")[-1])
        f_start = 16 + (layer - 1) * 19 + (idx_num % 7) * 2
        f_land = f_start + 13

        obj.location = (rest_loc.x * 0.85, rest_loc.y * 0.85, rest_loc.z + 2.8)
        obj.rotation_euler = (rest_rot.x + 1.4, rest_rot.y - 1.1, rest_rot.z + 1.8)
        obj.scale = (0.001, 0.001, 0.001)
        obj.keyframe_insert(data_path="location", frame=1)
        obj.keyframe_insert(data_path="rotation_euler", frame=1)
        obj.keyframe_insert(data_path="scale", frame=1)

        obj.keyframe_insert(data_path="location", frame=f_start)
        obj.keyframe_insert(data_path="rotation_euler", frame=f_start)
        obj.keyframe_insert(data_path="scale", frame=f_start)

        obj.scale = (1.0, 1.0, 1.0)
        obj.keyframe_insert(data_path="scale", frame=f_start + 3)

        obj.location = rest_loc
        obj.rotation_euler = rest_rot
        obj.keyframe_insert(data_path="location", frame=f_land)
        obj.keyframe_insert(data_path="rotation_euler", frame=f_land)
        obj.keyframe_insert(data_path="scale", frame=180)

    tarp.scale = (0.001, 0.001, 0.001)
    tarp.location = (0.0, 0.0, 1.25)
    tarp.keyframe_insert(data_path="scale", frame=1)
    tarp.keyframe_insert(data_path="location", frame=1)
    tarp.keyframe_insert(data_path="scale", frame=132)
    tarp.keyframe_insert(data_path="location", frame=132)

    tarp.scale = (1.0, 1.0, 1.0)
    tarp.location = (0.0, 0.0, 0.0)
    tarp.keyframe_insert(data_path="scale", frame=162)
    tarp.keyframe_insert(data_path="location", frame=162)
    tarp.keyframe_insert(data_path="scale", frame=180)

    root_empty.location = (0.0, 0.0, 0.0)
    root_empty.rotation_euler = (0.0, 0.0, 0.0)
    root_empty.keyframe_insert(data_path="location", frame=1)
    root_empty.keyframe_insert(data_path="rotation_euler", frame=1)
    root_empty.keyframe_insert(data_path="location", frame=164)
    root_empty.keyframe_insert(data_path="rotation_euler", frame=164)
    root_empty.location = (0.0, 0.0, 0.16)
    root_empty.rotation_euler = (0.0, math.radians(-5.0), 0.0)
    root_empty.keyframe_insert(data_path="location", frame=180)
    root_empty.keyframe_insert(data_path="rotation_euler", frame=180)


def setup_studio(stage_col):
    scene = bpy.context.scene
    for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = eng
            break
        except Exception:
            pass
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"

    world = bpy.data.worlds.new("JL_Studio_World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.022, 0.026, 0.036, 1.0)
        bg.inputs[1].default_value = 0.85

    lights = [
        ("Key_Light", "AREA", (3.8, -4.2, 4.8), (0.85, 0.0, 0.72), 580, 3.2, (1.0, 0.97, 0.90)),
        ("Fill_Light", "AREA", (-4.2, -3.2, 3.2), (1.02, 0.0, -0.85), 240, 3.8, (0.82, 0.90, 1.0)),
        ("Rim_Light", "AREA", (-1.8, 4.5, 4.0), (-0.92, 0.0, -2.65), 390, 2.4, (1.0, 0.88, 0.62)),
    ]
    for name, ltype, loc, rot, energy, size, col_rgb in lights:
        ld = bpy.data.lights.new(name=name, type=ltype)
        ld.energy = energy
        ld.size = size
        ld.color = col_rgb
        lo = bpy.data.objects.new(name=name, object_data=ld)
        lo.location = loc
        lo.rotation_euler = rot
        link_obj(lo, stage_col)

    floor_m = bpy.data.meshes.new("Studio_Floor_Mesh")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=2, y_segments=2, size=14.0)
    bm.to_mesh(floor_m)
    bm.free()
    floor = bpy.data.objects.new("Studio_Floor", floor_m)
    floor.data.materials.append(make_pbr_mat("Mat_Studio_Asphalt", (0.025, 0.028, 0.035, 1.0), metallic=0.05, roughness=0.72))
    link_obj(floor, stage_col)

    cam_data = bpy.data.cameras.new("Hero_Cam")
    cam_data.lens = 42.0
    cam = bpy.data.objects.new("Hero_Cam", cam_data)
    cam.location = (3.30, -3.55, 2.55)
    direction = Vector((0.0, 0.0, 0.62)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    link_obj(cam, stage_col)

    # Secondary close-up camera to audit brick holes, rebar, concrete & bevel craft
    cam2_data = bpy.data.cameras.new("Closeup_Cam")
    cam2_data.lens = 55.0
    cam2 = bpy.data.objects.new("Closeup_Cam", cam2_data)
    cam2.location = (1.65, -1.95, 2.15)
    d2 = Vector((0.0, 0.0, 0.88)) - cam2.location
    cam2.rotation_euler = d2.to_track_quat("-Z", "Y").to_euler()
    link_obj(cam2, stage_col)

    scene.camera = cam
    return cam, cam2, floor


def main():
    status = {"ok": False}
    try:
        clear_scene()
        scene = bpy.context.scene
        asset_col = bpy.data.collections.new("JL_Cacamba_Asset")
        stage_col = bpy.data.collections.new("Studio_Stage")
        scene.collection.children.link(asset_col)
        scene.collection.children.link(stage_col)

        mats = create_materials()
        root = bpy.data.objects.new("JL_Cacamba_Root", None)
        root.empty_display_type = "PLAIN_AXES"
        link_obj(root, asset_col)

        build_cacamba_hull(mats, asset_col, root)
        debris_objs = build_debris_system(mats, asset_col, root)
        tarp = build_tarp_cover(mats, asset_col, root)
        build_native_animation(root, debris_objs, tarp)
        cam, cam2, floor = setup_studio(stage_col)

        bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

        renders = []
        for frame_num, fname, use_cam in (
            (1, "v3_01_empty_hero.png", cam),
            (126, "v3_02_full_rubble.png", cam),
            (126, "v3_03_closeup_debris.png", cam2),
            (168, "v3_04_covered_tarp.png", cam),
        ):
            scene.camera = use_cam
            scene.frame_set(frame_num)
            out_png = os.path.join(RENDERS_DIR, fname)
            scene.render.filepath = out_png
            bpy.ops.render.render(write_still=True)
            renders.append(out_png)

        # Clean transparent-background studio PNG (floor hidden!)
        scene.camera = cam
        floor.hide_render = True
        scene.render.film_transparent = True
        scene.frame_set(126)
        og_png = os.path.join(PROJECT_DIR, "assets", "img", "cacamba-3d-render.png")
        scene.render.filepath = og_png
        bpy.ops.render.render(write_still=True)
        scene.render.film_transparent = False
        floor.hide_render = False

        # Export ONLY the asset collection to GLB (JPEG textures for crisp PBR under ~2.2MB!)
        bpy.ops.object.select_all(action="DESELECT")
        for obj in asset_col.objects:
            obj.select_set(True)

        scene.frame_set(1)
        bpy.ops.export_scene.gltf(
            filepath=GLB_PATH,
            export_format="GLB",
            use_selection=True,
            export_animations=True,
            export_nla_strips=False,
            export_materials="EXPORT",
            export_image_format="JPEG",
            export_image_quality=88,
        )

        debris_meta = []
        for item in debris_objs:
            if item["kind"] == "piece":
                o = item["obj"]
                debris_meta.append({
                    "name": o.name,
                    "layer": item["layer"],
                    "x": round(item["rest_loc"].x, 4),
                    "y": round(item["rest_loc"].y, 4),
                    "z": round(item["rest_loc"].z, 4),
                    "rx": round(item["rest_rot"].x, 4),
                    "ry": round(item["rest_rot"].y, 4),
                    "rz": round(item["rest_rot"].z, 4),
                })

        status = {
            "ok": True,
            "quality_tier": "AAA_PBR_V3",
            "blender_version": bpy.app.version_string,
            "engine": scene.render.engine,
            "blend_path": BLEND_PATH,
            "glb_path": GLB_PATH,
            "glb_bytes": os.path.getsize(GLB_PATH) if os.path.exists(GLB_PATH) else 0,
            "asset_objects": len(asset_col.objects),
            "debris_pieces": len(debris_meta),
            "renders": renders + [og_png],
        }
        with open(os.path.join(BLENDER_DIR, "debris_meta.json"), "w", encoding="utf-8") as f:
            json.dump(debris_meta, f, indent=2)

    except Exception as exc:
        status = {"ok": False, "error": str(exc), "traceback": traceback.format_exc()}

    with open(STATUS_PATH, "w", encoding="utf-8") as f:
        json.dump(status, f, indent=2)
    print("BUILD_STATUS:", json.dumps(status))


if __name__ == "__main__":
    main()
