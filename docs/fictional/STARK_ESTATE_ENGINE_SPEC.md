# Cliffside AI Lab Residence Engine Spec

Purpose: convert the prompt pack into practical 3D production requirements for
Blender, Unreal Engine, and Three.js. The target is an original Stark-estate-like
cliffside AI lab residence, not an exact replica.

## Production Targets

| Target | Primary Use | Fidelity | Constraint |
| --- | --- | --- | --- |
| Blender | Modeling, lookdev, cinematic stills | High | Editable source scene |
| Unreal Engine | Walkable real-time environment | High to cinematic | Streaming, collision, Lumen |
| Three.js | Browser hero scene or interactive preview | Medium | Fast load, responsive framing |

## Shared Spatial Program

| Zone | Function | Notes |
| --- | --- | --- |
| Entry court | Arrival, security, car drop-off | Quiet luxury; no oversized signage |
| Main living gallery | Social space, kitchen, ocean view | Open glass wall; minimal furniture |
| Private suite band | Bedroom, study, wellness | Smaller, restrained, less visually dominant |
| AI systems core | Home control, server, security | Hidden near vertical circulation |
| Workshop garage | Main character space | Vehicles, robotics, fabrication, test area |
| Armor-scale vault | Circular lower storage | Generic mechanical display, no branded suits |
| Mechanical / power | HVAC, backup power, water, fire suppression | Believable support for a house-lab hybrid |
| Cliff terrace | Exterior path, maintenance edge, ocean framing | Keep guardrails plausible |

## Structural Logic

- Use reinforced concrete shear walls embedded into the cliff as the visual anchor.
- Express cantilevers with thicker slabs, backspan mass, or visible transfer beams.
- Place the heaviest program inside the cliff: workshop, garage, vault, services.
- Keep glass walls non-structural; use hidden steel mullions and perimeter frames.
- Add expansion joints or formwork seams to avoid toy-like concrete.
- Include drainage, retaining walls, and cliff stabilization where the house meets rock.

## Blender Specification

### Scene Organization

| Collection | Contents |
| --- | --- |
| `SITE_Cliff_Ocean` | Cliff mesh, ocean plane, driveway terrain, landscaping |
| `ARCH_Shell` | Concrete slabs, roof shell, walls, parapets |
| `ARCH_Glass_Frames` | Glass panels, mullions, doors, rails |
| `INT_Living` | Upper furniture, kitchen, stair, smart-home panels |
| `INT_Workshop` | Garage, robots, lifts, vault, tool walls |
| `SYS_Lighting` | Area lights, emissive strips, sun, HDRI controls |
| `CAM_Shots` | Establishing, driveway, living, workshop, cutaway cameras |

### Modeling Notes

- Start with meters, real-world scale, and human reference at 1.75 m.
- Block out with slabs and terraces first; lock silhouette before detailing.
- Use bevels on concrete edges: small radius for polished slabs, larger on curved roof.
- Use modifiers non-destructively for early roof curves and terrace iterations.
- Keep workshop props modular: lift, arm, workbench, tool wall, vault ring.
- For cutaway, model floor plates and cores as separate objects with clean section planes.

### Materials

- Concrete: Principled BSDF, off-white albedo, roughness 0.55-0.75, subtle noise bump.
- Glass: transmission or alpha blend, roughness 0.02-0.08, slight green-blue edge tint.
- Steel: dark gunmetal, roughness 0.25-0.45, anisotropic optional.
- Workshop floor: darker concrete, roughness 0.65, decals for tire and oil wear.
- Ocean: shader plane for stills; animated modifier only if needed for video.

### Recommended Outputs

- `cliffside_ai_lab_residence.blend`
- 4K exterior still.
- 4K workshop still.
- Orthographic cutaway still.
- Optional GLB export for real-time engines.

## Unreal Engine Specification

### Level Layout

| Level / Sublevel | Contents |
| --- | --- |
| `L_Persistent_Residence` | World settings, lighting, streaming setup |
| `L_Site_Cliff` | Nanite cliff, ocean, driveway, exterior terrain |
| `L_Architecture` | House shell, glass, frames, terraces |
| `L_Living` | Main interior social level |
| `L_Workshop` | Garage, fabrication, vault, mechanical props |
| `L_Cinematics` | Sequencer cameras, paths, lighting variants |

### Asset Rules

- Use Nanite for cliff rocks, concrete shell pieces, and high-poly static detail.
- Avoid Nanite for transparent glass and animated UI surfaces.
- Use modular concrete pieces: slab, curved roof segment, wall, parapet, stair, ramp.
- Author collision separately for walkable floors, ramps, railings, and stairs.
- Keep workshop hero props as independent Blueprints for easy iteration.

### Lighting

- Lumen global illumination enabled.
- Directional sun plus sky atmosphere for exterior.
- Rect lights or emissive strips for interior concrete ceilings.
- Cooler task lights in workshop; warmer lines in living areas.
- Create day, sunset, and night lighting scenarios.

### Interaction Pass

- Walkable route: driveway -> entry -> living gallery -> elevator/stair -> workshop.
- Doors can be static unless interaction is needed.
- Add simple diegetic UI panels for AI home control, but keep them non-branded.
- Add collision and blocking volumes to protect cliff edges.

### Performance Budget

| System | Target |
| --- | --- |
| Desktop cinematic | 60 fps at 1440p on high-end GPU |
| Exploration build | 60 fps at 1080p on mid-range GPU |
| Texture sets | 2K default, 4K hero concrete/glass/rock |
| Draw calls | Keep modular repetition instanced where possible |

## Three.js Specification

### Scope

Use Three.js for a lightweight interactive architectural preview, not the full
production environment. Prioritize recognizable silhouette, responsive camera,
and fast loading.

### Scene Components

| Component | Implementation |
| --- | --- |
| Cliff | Simplified GLB mesh or generated BufferGeometry |
| House slabs | BoxGeometry / extruded shapes / GLB modules |
| Curved roof | Low-segment custom mesh or exported GLB |
| Glass | MeshPhysicalMaterial with transmission or transparent material fallback |
| Ocean | Large plane with animated normal map or simple vertex wave |
| Interior glow | Emissive strips and warm point/area light approximation |
| Camera | OrbitControls with constrained polar angle and min/max distance |

### Loading Strategy

- Export one optimized GLB for architecture and one for site if practical.
- Draco or Meshopt compress geometry.
- KTX2 compress textures when texture count grows.
- Lazy-load workshop detail only when camera enters lower-level view.
- Provide a static poster fallback for low-end or WebGL failure.

### Browser Budget

| Item | Target |
| --- | --- |
| Initial payload | Under 8-12 MB compressed |
| Triangles | 80k-180k for hero scene |
| Texture size | 1K default, 2K for cliff/concrete if needed |
| Frame rate | 60 fps desktop, 30 fps mobile acceptable |
| Mobile | Disable heavy transmission; use transparent rough glass fallback |

### Responsive Framing

- Desktop: camera starts ocean-side, house filling 60-70% of viewport width.
- Mobile: camera starts higher and farther back; avoid clipping the cantilever.
- Clamp orbit so users cannot go under terrain or inside unmodeled spaces.
- Keep UI minimal: orbit, reset camera, day/night toggle.

## Asset Checklist

| Asset | Blender | Unreal | Three.js |
| --- | --- | --- | --- |
| Cliff mesh | High detail sculpt or displaced mesh | Nanite static mesh | Decimated GLB |
| Concrete shell | Editable modular objects | Modular static meshes | Merged optimized GLB |
| Glass facade | Separate panes | Non-Nanite translucent meshes | Simplified panes |
| Workshop props | Detailed hero models | Blueprint groups | Optional simplified set |
| Lighting strips | Emissive mesh + lights | Emissive + Lumen support | Emissive material |
| Vault ring | Modeled circular floor system | Blueprint or static mesh | Optional hero prop |

## Naming Convention

- Prefix architecture assets with `ARCH_`.
- Prefix site assets with `SITE_`.
- Prefix workshop assets with `SHOP_`.
- Prefix smart-home and UI assets with `AI_`.
- Prefix materials with `M_`.
- Prefix textures with `T_`.
- Prefix collision meshes with `UCX_` for Unreal imports.

## Deliverable Milestones

1. Blockout: cliff, slabs, glass wall, workshop void, driveway, camera anchors.
2. Structural pass: slab thickness, shear walls, transfer beams, retaining walls.
3. Program pass: living gallery, private band, AI core, workshop, vault.
4. Material pass: concrete, glass, steel, cliff, ocean, lighting.
5. Engine pass: Blender stills, Unreal walkable level, Three.js optimized preview.
6. QA pass: scale check, collision check, mobile/browser framing, night/day lighting.

## QA Checklist

- Cantilever looks supported by backspan, beams, or cliff-embedded mass.
- Glass panels have believable thickness and mullion spacing.
- Workshop can physically fit vehicles, lifts, robotic arms, and vertical clearance.
- Living level does not feel like the main lab; lower level owns the technical identity.
- No copyrighted logos, exact film layout, or branded superhero elements.
- Three.js scene is nonblank, framed on desktop and mobile, and keeps text/UI clear.
- Unreal route is walkable without clipping or falling through edges.
- Blender cameras render with consistent scale and material identity.
