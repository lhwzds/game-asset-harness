import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { resolveInside, validateAssetId } from '../src/path-policy.js'

test('normalizes and validates an asset id', () => {
  assert.equal(validateAssetId(' Zombie_Basic '), 'zombie_basic')
  assert.throws(() => validateAssetId('../escape'))
})

test('keeps resolved files under the output root', () => {
  const root = path.resolve('output')
  assert.equal(resolveInside(root, 'images', 'player'), path.join(root, 'images', 'player'))
  assert.throws(() => resolveInside(root, '..', 'outside'))
})
