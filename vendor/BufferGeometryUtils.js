/**
 * Merge helper matching THREE.BufferGeometryUtils.mergeGeometries (r170),
 * without morph targets. Geometries must share the same attribute set.
 */
import { BufferAttribute, BufferGeometry } from "./three.module.js";

function mergeAttributes(attributes) {
  let TypedArray;
  let itemSize;
  let normalized;
  let arrayLength = 0;
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    if (TypedArray === undefined) TypedArray = attribute.array.constructor;
    else if (TypedArray !== attribute.array.constructor) return null;
    if (itemSize === undefined) itemSize = attribute.itemSize;
    else if (itemSize !== attribute.itemSize) return null;
    if (normalized === undefined) normalized = attribute.normalized;
    else if (normalized !== attribute.normalized) return null;
    arrayLength += attribute.array.length;
  }
  const array = new TypedArray(arrayLength);
  let offset = 0;
  for (let i = 0; i < attributes.length; i++) {
    array.set(attributes[i].array, offset);
    offset += attributes[i].array.length;
  }
  return new BufferAttribute(array, itemSize, normalized);
}

// Weld by position only. Drop uv before calling so a lathe seam (u=0 and u=1) can merge.
export function mergeVertices(geometry, tolerance = 1e-4) {
  const tol = Math.max(tolerance, 1e-8);
  const shift = Math.round(1 / tol);
  const pos = geometry.getAttribute("position");
  const map = new Map();
  const changes = new Array(pos.count);
  const unique = [];
  for (let i = 0; i < pos.count; i++) {
    const key = Math.round(pos.getX(i) * shift) + "_" + Math.round(pos.getY(i) * shift) + "_" + Math.round(pos.getZ(i) * shift);
    let id = map.get(key);
    if (id === undefined) {
      id = unique.length;
      unique.push(i);
      map.set(key, id);
    }
    changes[i] = id;
  }
  const out = new BufferGeometry();
  for (const name in geometry.attributes) {
    const attr = geometry.getAttribute(name);
    const itemSize = attr.itemSize;
    const arr = new attr.array.constructor(unique.length * itemSize);
    for (let i = 0; i < unique.length; i++) {
      const s = unique[i] * itemSize;
      const d = i * itemSize;
      for (let k = 0; k < itemSize; k++) arr[d + k] = attr.array[s + k];
    }
    out.setAttribute(name, new BufferAttribute(arr, itemSize, attr.normalized));
  }
  const index = geometry.getIndex();
  const src = index ? index.array : null;
  const count = index ? index.count : pos.count;
  const idx = [];
  for (let i = 0; i < count; i += 3) {
    const a = changes[src ? src[i] : i];
    const b = changes[src ? src[i + 1] : i + 1];
    const c = changes[src ? src[i + 2] : i + 2];
    if (a === b || b === c || c === a) continue;
    idx.push(a, b, c);
  }
  out.setIndex(idx);
  return out;
}

export function mergeGeometries(geometries, useGroups = false) {
  if (!geometries || !geometries.length) return null;
  const isIndexed = geometries[0].index !== null;
  const attributesUsed = new Set(Object.keys(geometries[0].attributes));
  const attributes = {};
  const mergedGeometry = new BufferGeometry();
  let offset = 0;

  for (let i = 0; i < geometries.length; i++) {
    const geometry = geometries[i];
    let attributesCount = 0;
    for (const name in geometry.attributes) {
      if (!attributesUsed.has(name)) return null;
      if (attributes[name] === undefined) attributes[name] = [];
      attributes[name].push(geometry.attributes[name]);
      attributesCount++;
    }
    if (attributesCount !== attributesUsed.size) return null;
    if (isIndexed !== (geometry.index !== null)) return null;
    if (useGroups) {
      const count = isIndexed ? geometry.index.count : geometry.attributes.position.count;
      mergedGeometry.addGroup(offset, count, i);
      offset += count;
    }
  }

  if (isIndexed) {
    let indexOffset = 0;
    const mergedIndex = [];
    for (let i = 0; i < geometries.length; i++) {
      const index = geometries[i].index;
      for (let j = 0; j < index.count; j++) mergedIndex.push(index.getX(j) + indexOffset);
      indexOffset += geometries[i].attributes.position.count;
    }
    mergedGeometry.setIndex(mergedIndex);
  }

  for (const name in attributes) {
    const mergedAttribute = mergeAttributes(attributes[name]);
    if (!mergedAttribute) return null;
    mergedGeometry.setAttribute(name, mergedAttribute);
  }
  return mergedGeometry;
}
