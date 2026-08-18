import path from 'node:path'

const ASSET_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/

export function validateAssetId(assetId: string): string {
  const normalized = assetId.trim().toLowerCase()
  if (!ASSET_ID.test(normalized)) {
    throw new Error('assetId must be 1-64 lowercase letters, numbers, hyphens, or underscores')
  }
  return normalized
}

export function resolveInside(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root)
  const candidate = path.resolve(resolvedRoot, ...segments)
  const relative = path.relative(resolvedRoot, candidate)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('resolved output path escapes outputRoot')
  }
  return candidate
}
