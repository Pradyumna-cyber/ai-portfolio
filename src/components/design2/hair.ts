import * as THREE from "three";

/**
 * Natural textured hair grown from the head scan itself, using "shell" texturing: the
 * scalp triangles are copied SHELLS times, each pushed further out. Each shell is offset
 * along the normal *and* a combing direction (up and back), so the strands lean like real
 * styled hair instead of standing straight out. A clumpy strand texture is cut away with a
 * rising alpha threshold, so strands group into locks and taper to their tips.
 */
export const SHELLS = 24;
const LENGTH = 0.085; // outermost shell distance (≈ 6–7 cm at head scale): a full, styled crop
const COMB = new THREE.Vector3(0, 0.35, -0.55).normalize(); // strands lean up and back

/**
 * Hairline in head-local units (head centre at origin, face looking +Z, head ≈ 1.1 tall):
 * a natural forehead line, tapered over the ears, down to the nape at the back.
 */
function hairlineY(x: number, z: number) {
  const zn = THREE.MathUtils.clamp(z / 0.5, -1, 1);
  const base = zn >= 0 ? 0.12 + 0.1 * zn : 0.12 + 0.44 * zn;
  // Slight widow's-peak curve: the line rises towards the temples.
  const temples = zn > 0.3 ? 0.06 * Math.min(1, Math.abs(x) / 0.25) : 0;
  // Leave the tops of the ears bare.
  const ear = Math.abs(x) > 0.36 && zn > -0.45 ? 0.05 : 0;
  return base + temples + ear;
}

/** Hair length per vertex: full on top, shorter (faded) on the sides and back. */
function lengthAt(x: number, y: number, z: number) {
  const top = THREE.MathUtils.smoothstep(y, 0.15, 0.45);
  const side = 1 - THREE.MathUtils.smoothstep(Math.abs(x), 0.25, 0.42) * 0.55;
  const back = z < -0.2 ? 0.55 + 0.45 * top : 1;
  return (0.35 + 0.65 * top) * side * back;
}

/** Scalp mask (1 = hair) per vertex, softened near the hairline. */
function scalpMask(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute("position");
  const mask = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const d = pos.getY(i) - hairlineY(pos.getX(i), pos.getZ(i));
    mask[i] = THREE.MathUtils.smoothstep(d, -0.01, 0.05);
  }
  return mask;
}

/** One shell per layer: scalp triangles only, offset outward and combed back. */
export function buildHairShells(head: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const src = head.index ? head.toNonIndexed() : head.clone();
  src.computeVertexNormals();
  const pos = src.getAttribute("position");
  const nrm = src.getAttribute("normal");
  const uv = src.getAttribute("uv");
  const mask = scalpMask(src);

  // Keep triangles whose three corners are all on the scalp.
  const keep: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    if (mask[i] > 0.02 && mask[i + 1] > 0.02 && mask[i + 2] > 0.02) keep.push(i, i + 1, i + 2);
  }

  const dir = new THREE.Vector3();
  const n = new THREE.Vector3();
  return Array.from({ length: SHELLS }, (_, s) => {
    const k = (s + 1) / SHELLS;
    const p = new Float32Array(keep.length * 3);
    const nn = new Float32Array(keep.length * 3);
    const t = new Float32Array(keep.length * 2);
    keep.forEach((v, j) => {
      const x = pos.getX(v);
      const y = pos.getY(v);
      const z = pos.getZ(v);
      n.set(nrm.getX(v), nrm.getY(v), nrm.getZ(v));
      // Lean grows with distance along the strand (a gentle curve, not a straight spike).
      dir
        .copy(n)
        .addScaledVector(COMB, 0.9 * k)
        .normalize();
      const off = 0.002 + LENGTH * k * mask[v] * lengthAt(x, y, z);
      p[j * 3] = x + dir.x * off;
      p[j * 3 + 1] = y + dir.y * off;
      p[j * 3 + 2] = z + dir.z * off;
      nn[j * 3] = n.x;
      nn[j * 3 + 1] = n.y;
      nn[j * 3 + 2] = n.z;
      t[j * 2] = uv.getX(v);
      t[j * 2 + 1] = uv.getY(v);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nn, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(t, 2));
    return g;
  });
}

/**
 * Strand texture: each texel is one strand whose brightness is its length. A coarse clump
 * noise is mixed in so neighbouring strands share length and read as locks of hair.
 */
export function strandTexture(size = 1024) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  let seed = 1234567;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const CELL = 6;
  const cells = Math.ceil(size / CELL) + 1;
  const clump = Array.from({ length: cells * cells }, () => rand());
  const clumpAt = (x: number, y: number) => {
    const cx = x / CELL;
    const cy = y / CELL;
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const fx = cx - x0;
    const fy = cy - y0;
    const at = (i: number, j: number) => clump[(j % cells) * cells + (i % cells)];
    const a = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
    const b = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
    return a * (1 - fy) + b * fy;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const strand = rand() < 0.92 ? 0.35 + 0.65 * rand() : 0;
      const v = strand === 0 ? 0 : Math.floor(255 * (0.5 * strand + 0.5 * clumpAt(x, y)));
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

/** Material for shell `s`: near-black at the root, warm dark brown at the tips. */
export function shellMaterial(s: number, strands: THREE.Texture) {
  const k = (s + 1) / SHELLS;
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#020101").lerp(new THREE.Color("#1c130d"), k * k),
    roughness: 0.92,
    envMapIntensity: 0.05,
    metalness: 0,
    alphaMap: k <= 0.2 ? null : strands,
    // Inner fifth is solid (dense hair, no scalp showing); strands thin out above it.
    alphaTest: k <= 0.2 ? 0 : 0.12 + 0.8 * ((k - 0.2) / 0.8),
    transparent: false,
  });
}
