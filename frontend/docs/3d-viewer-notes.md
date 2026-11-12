# 3D viewer optimizations

Phase 1 (lazy mount, off-screen render suspension, DPR caps, shadow tuning, local HDR) and
Phase 2 (meshopt-compressed v2 GLB model variants selected via `lib/modelAssets.ts`) are included
in this change.

## Pending

- Scroll over the 3D canvas: OrbitControls no longer traps the wheel (`enableZoom={false}`)
  and the canvas uses `touch-action: pan-y`. Drag-to-rotate is kept. **Browser testing on
  desktop and mobile is still pending.**
- The pump model in the About preview still reads flatter than the equipment model.

## Model selection

Originals stay in `public/models` untouched. Set `NEXT_PUBLIC_USE_OPTIMIZED_MODELS=false`
and rebuild to serve them again.
