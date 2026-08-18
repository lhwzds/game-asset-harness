import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { MiniMaxClient } from '../src/minimax-client.js'

test('saves a base64 image response under the bounded root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'game-asset-harness-'))
  const fakeFetch: typeof fetch = async (_input, init) => {
    assert.match(String(init?.headers && JSON.stringify(init.headers)), /Bearer test-key/)
    return new Response(JSON.stringify({ id: 'trace-1', data: { image_base64: [Buffer.from('image').toString('base64')] } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  const client = new MiniMaxClient({ apiKey: 'test-key', outputRoot: root }, fakeFetch)
  const result = await client.generateImage({ assetId: 'player', prompt: 'top-down player sprite' })
  assert.equal((await readFile(result.files[0]!)).toString(), 'image')
  assert.equal(result.traceId, 'trace-1')
})

test('saves a hex music response under the bounded root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'game-asset-harness-'))
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ trace_id: 'trace-2', data: { audio: Buffer.from('music').toString('hex') } }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
  const client = new MiniMaxClient({ apiKey: 'test-key', outputRoot: root }, fakeFetch)
  const result = await client.generateMusic({ assetId: 'arena_theme', prompt: 'dark arcade loop' })
  assert.equal((await readFile(result.files[0]!)).toString(), 'music')
  assert.equal(result.traceId, 'trace-2')
})


test('rejects an out-of-range image count before making a request', async () => {
  const client = new MiniMaxClient({ apiKey: 'test-key', outputRoot: os.tmpdir() }, async () => {
    throw new Error('fetch should not run')
  })
  await assert.rejects(() => client.generateImage({ assetId: 'player', prompt: 'sprite', count: 10 }), /1 through 9/)
})
