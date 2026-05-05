# Avengers Compound 3D Engine Spec

Purpose: 建築仕様を Blender / Unreal Engine / game background production に
落とし込む。対象は MCU のコンパウンドに着想を得た大型ヒーロー拠点。
必要に応じて「original hero operations campus」として差別化できる構成にする。

## 1. Production Targets

| Target | Primary Use | Fidelity | Constraint |
| --- | --- | --- | --- |
| Blender | modeling, layout, cinematic stills | high | editable source scene |
| Unreal Engine | walkable real-time environment | high to cinematic | streaming, collision, Lumen / Nanite |
| Game Background | playable mission map / hub area | medium to high | readable silhouettes, optimized modules |
| Browser / Lightweight Preview | web hero scene / concept viewer | medium | fast loading, limited interiors |

## 2. Scale Anchors

| Asset | Approx Scale |
| --- | ---: |
| Human | 1.8 m |
| Standard Door | 2.2 m high |
| Security Gate Lane | 4 m wide |
| Main Lobby Height | 6-9 m |
| Lab Bay Height | 5-7 m |
| Hangar Door | 18-28 m wide, 8-12 m high |
| Quinjet Placeholder | 24-30 m long |
| VTOL Apron | 60-100 m clear area |
| Main Building Length | 150-300 m |
| Full Campus Playable Area | 500 m to 1.5 km wide |

## 3. Master Layout

Use a campus layout with five readable zones:

| Zone | 3D Function |
| --- | --- |
| Arrival Court | establishes scale, security, glass facade |
| Command / Lab Building | main architectural icon, clean modern surfaces |
| Hangar / Apron | large gameplay space, vehicle staging, action access |
| Residence / Courtyard | quieter human zone, night lighting, narrative beats |
| Sublevel / Vault | bunker interiors, final mission or restricted exploration |

Recommended top-down arrangement:

```text
TREE LINE / SERVICE ROAD
        [Vehicle Bay] [Hangar] ---- [VTOL Apron]
             |           |
[Residence]--[Courtyard]--[Command / Lab Slab]--[Arrival Court]
             |           |
        [Medical]   [Sublevel Access / Vault Core]
WATER / LAWN / PERIMETER ROAD
```

## 4. Modular Kit

### Exterior Modules

| Module | Size Guide | Notes |
| --- | --- | --- |
| White Panel Wall A | 4 m x 4 m | flat opaque facade |
| White Panel Wall B | 8 m x 4 m | long horizontal runs |
| Curtain Wall A | 4 m x 4 m | clear glass, mullions |
| Curtain Wall Corner | 4 m x 4 m | black frame corner piece |
| Overhang Slab | 8 m x 2 m | roof / canopy edge |
| Roof Panel | 8 m x 8 m | serviceable flat roof |
| Skylight Strip | 2 m x 12 m | lab roof daylight |
| Logo Roof Tile | 12 m x 12 m | optional Avengers mark / generic hero insignia |
| Security Gate | 12 m wide | retractable bollards, guard booth |
| Service Door | 4 m x 4 m | loading / utility |
| Hangar Door Segment | 8 m x 10 m | repeatable sliding door |

### Interior Modules

| Module | Size Guide | Notes |
| --- | --- | --- |
| Corridor Straight | 4 m x 8 m | clean lab corridor |
| Corridor Corner | 4 m x 4 m | glass / metal |
| Lab Wall | 4 m x 4 m | panels, screens, shelving |
| Glass Partition | 4 m x 3 m | transparent room separation |
| Briefing Wall | 8 m x 4 m | giant tactical display |
| Raised Floor Tile | 2 m x 2 m | command / data rooms |
| Blast Door | 4 m x 3 m | vault / lockdown |
| Hangar Floor Tile | 8 m x 8 m | safety markings |
| Catwalk Segment | 2 m x 8 m | hangar vertical detail |
| Stair / Ramp Unit | variable | accessible circulation |

### Prop Modules

| Prop | Variants |
| --- | --- |
| Workbench | clean lab, dirty fabrication, quantum test |
| Robotic Arm | ceiling rail, floor mount, small precision arm |
| Holographic Table | command, engineering, medical |
| Server Rack | data center, field comms |
| Storage Locker | armor, weapons, emergency gear |
| Medical Bed | triage, rehab |
| Power Core | clean reactor, backup battery wall |
| Ground Vehicle | van, armored SUV, utility tug |
| Quinjet Proxy | hero aircraft placeholder, low-poly exterior, interior slice |

## 5. Blender Specification

### Scene Organization

```text
AvengersCompound.blend
  00_REFS
  01_BLOCKOUT
  02_ARCHITECTURE
    EXT_CommandLab
    EXT_Hangar
    EXT_Residence
    EXT_Gates
  03_INTERIORS
    INT_Briefing
    INT_Lab
    INT_Hangar
    INT_Residence
    INT_Sublevel
  04_PROPS
  05_LANDSCAPE
  06_LIGHTING
  07_CAMERAS
  08_EXPORT
```

### Modeling Notes

- Start with blockout at true scale in meters.
- Keep the hero silhouette low, long, and horizontal.
- Use bevels sparingly on exterior panels; edges should catch light, not feel rounded.
- Keep facade panels modular and instanced.
- Use separate collections for exterior shell and playable interiors.
- Model basement and quantum bay as heavier concrete volumes.

### Materials

| Material | Blender Setup |
| --- | --- |
| White Metal Panel | principled BSDF, roughness 0.35-0.55, subtle noise bump |
| Black Frame | dark anodized metal, roughness 0.25-0.4 |
| Glass | slight blue-gray tint, transmission / alpha as needed |
| Polished Concrete | procedural noise, low reflection, scale variation |
| Hangar Epoxy | gray surface with decal safety lines |
| Lab Screens | emissive planes with dim blue-white UI |
| Landscape Grass | particle or geometry nodes, low near-building trim |

### Outputs

| Output | Use |
| --- | --- |
| compound_blockout.blend | massing review |
| compound_exterior_high.blend | cinematic exterior |
| compound_modular_kit.blend | engine export source |
| compound_interiors.blend | briefing/lab/hangar sets |
| FBX / GLB exports | Unreal / web / DCC handoff |

## 6. Unreal Engine Specification

### Level Layout

| Level | Contents |
| --- | --- |
| L_Persistent | lighting, world partition, global managers |
| L_Exterior_Campus | terrain, main buildings, roads, water |
| L_CommandLab | lobby, briefing, labs |
| L_Hangar | hangar, vehicle bay, apron |
| L_Residence | suites, kitchen, courtyard |
| L_Sublevel | vault, data center, quantum bay |
| L_Damage_Endgame | ruined variant, debris, smoke, exposed cores |

### Asset Rules

- Use Nanite for architecture, debris, rocks, high-poly props.
- Use instanced static meshes for facade panels, roof panels, bollards, lights.
- Keep glass materials simple for playable spaces; avoid many overlapping transparent panes.
- Use trim sheets for lab walls, corridors, and hangar edges.
- Decals handle safety stripes, floor numbers, warning labels, scorch marks.
- Collision must be simplified: UCX meshes or auto-convex only where needed.

### Lighting

| Area | Lighting Direction |
| --- | --- |
| Exterior Day | soft overcast or late afternoon; white panels readable |
| Exterior Night | runway lights, interior glow, perimeter lamps |
| Lobby | clean daylight, high ceiling bounce |
| Briefing | low ambient, tactical screen key light |
| Lab | bright controlled white, glass reflections |
| Hangar | high bays, apron spill, floor reflections |
| Sublevel | cooler, denser, emergency amber / red states |

### Gameplay / Interaction Hooks

| Hook | Usage |
| --- | --- |
| Security Checkpoint | start point, NPC scan, locked gate |
| Mission Table | hub menu or briefing trigger |
| Hangar Door | cinematic opening / mission launch |
| Quinjet Boarding | level transition |
| Lab Terminal | research UI, crafting, narrative logs |
| Vault Door | restricted objective |
| Lockdown State | red lights, sealed doors, enemy encounter |
| Damage Variant | post-attack mission state |

### Performance Budget

| Target | Budget |
| --- | --- |
| Desktop Cinematic | 60 fps, high materials, Lumen allowed |
| Playable PC | 60 fps, streamed interiors, optimized glass |
| Console-like | 60 fps, 2-4 loaded zones max |
| Web / Low-end | exterior shell only, baked lighting, no deep interiors |

## 7. Game Background Specification

### Readability

- Main building silhouette must read from 300 m away.
- Hangar door should be the largest single recognizable element.
- Arrival court needs strong navigational symmetry.
- Residence wing should be visually calmer: warmer lights, smaller windows.
- Sublevel entrances should use heavy doors, ramps, and security markings.

### Gameplay Collision

| Surface | Rule |
| --- | --- |
| Glass Facade | mostly non-breakable unless mission-specific |
| Roof | playable only if designed with barriers and collision |
| Hangar Floor | flat, combat-safe, broad movement lanes |
| Catwalks | 1.5-2 m wide minimum for third-person play |
| Ramps | use gentle slopes for vehicles |
| Debris Variant | collision proxies separate from visual debris |

### LOD Strategy

| Distance | Detail |
| --- | --- |
| 0-20 m | bevels, decals, props, readable labels |
| 20-100 m | modular facade, reduced prop density |
| 100-500 m | simplified shell, major glass/panel shapes |
| 500 m+ | proxy mesh, baked color and window patterns |

## 8. Variant Sets

| Variant | Description |
| --- | --- |
| Clean Facility | Age of Ultron / Civil War style intact campus |
| Active Operations | vehicles, runway lights, staff props, open hangar |
| Night Watch | low-key security, glowing interiors, wet pavement option |
| Quantum Buildout | Endgame-era lab modifications, cables, improvised heavy equipment |
| Battle Damage | crater, collapsed roof slabs, exposed rebar, broken glass |
| Overgrown Future | abandoned lawn, water damage, faded markings |

## 9. Naming Convention

```text
SM_AC_EXT_PanelWall_A_4x4
SM_AC_EXT_CurtainWall_A_4x4
SM_AC_EXT_HangarDoor_A_8x10
SM_AC_INT_BriefingWall_A
SM_AC_INT_LabBench_A
SM_AC_PRP_RoboticArm_Floor_A
M_AC_WhitePanel
M_AC_BlackFrame
M_AC_GlassBlueGrey
MI_AC_Screen_Tactical_A
BP_AC_HangarDoor
BP_AC_LockdownDoor
L_AC_Exterior_Campus
```

## 10. Deliverable Milestones

| Milestone | Deliverable |
| --- | --- |
| M1 Blockout | campus layout, scale anchors, camera checks |
| M2 Exterior Kit | facade, roof, gate, hangar modules |
| M3 Interior Kit | briefing, lab, hangar, residence, sublevel pieces |
| M4 Material Pass | white metal, glass, concrete, emissive UI, landscape |
| M5 Engine Import | Unreal levels, collision, lighting, LODs |
| M6 Set Dressing | props, decals, vehicles, screens |
| M7 Variants | clean, night, quantum, damaged |
| M8 QA | scale, navigation, performance, screenshot review |

## 11. QA Checklist

- Main silhouette reads as low, wide, advanced campus.
- Hangar has believable aircraft scale.
- Command room, lab, residence, and vault feel like separate access levels.
- Exterior does not become a flat white box; panel rhythm and glass depth visible.
- Interior navigation is understandable without explanatory text.
- Collision matches visual floor and stairs.
- Glass, emissive screens, and polished floors do not dominate performance.
- Damaged variant exposes structure rather than random rubble only.
