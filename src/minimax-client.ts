import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveInside, validateAssetId } from './path-policy.ts'

export interface MiniMaxClientConfig {
  apiKey: string
  baseUrl?: string
  imageModel?: string
  musicModel?: string
  outputRoot: string
}

export interface GeneratedAsset {
  assetId: string
  kind: 'image' | 'music'
  model: string
  files: string[]
  traceId?: string
}

type FetchLike = typeof fetch

function assertApiKey(value: string): string {
  const key = value.trim()
  if (!key || /[\r\n]/.test(key)) throw new Error('MINIMAX_API_KEY is missing or invalid')
  return key
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json() as Record<string, unknown>
  if (!response.ok) {
    const message = typeof body.base_resp === 'object' ? JSON.stringify(body.base_resp) : response.statusText
    throw new Error(`MiniMax request failed (${response.status}): ${message}`)
  }
  return body
}

export class MiniMaxClient {
  readonly #apiKey: string
  readonly #baseUrl: string
  readonly #imageModel: string
  readonly #musicModel: string
  readonly #outputRoot: string
  readonly #fetch: FetchLike

  constructor(config: MiniMaxClientConfig, fetchImpl: FetchLike = fetch) {
    this.#apiKey = assertApiKey(config.apiKey)
    this.#baseUrl = (config.baseUrl ?? 'https://api.minimax.io').replace(/\/+$/, '')
    this.#imageModel = config.imageModel ?? 'image-01'
    this.#musicModel = config.musicModel ?? 'music-3.0'
    this.#outputRoot = path.resolve(config.outputRoot)
    this.#fetch = fetchImpl
  }

  async generateImage(input: {
    assetId: string
    prompt: string
    aspectRatio?: string
    count?: number
    seed?: number
  }): Promise<GeneratedAsset> {
    const assetId = validateAssetId(input.assetId)
    const count = input.count ?? 1
    if (!Number.isInteger(count) || count < 1 || count > 9) {
      throw new Error('image count must be an integer from 1 through 9')
    }
    const response = await this.#fetch(`${this.#baseUrl}/v1/image_generation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.#apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.#imageModel,
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio ?? '1:1',
        response_format: 'base64',
        n: count,
        prompt_optimizer: true,
        ...(input.seed === undefined ? {} : { seed: input.seed }),
      }),
    })
    const body = await responseJson(response)
    const data = body.data as { image_base64?: unknown } | undefined
    if (!Array.isArray(data?.image_base64) || data.image_base64.some(item => typeof item !== 'string')) {
      throw new Error('MiniMax image response did not contain base64 images')
    }
    const directory = resolveInside(this.#outputRoot, 'images', assetId)
    await mkdir(directory, { recursive: true })
    const files: string[] = []
    for (const [index, encoded] of (data.image_base64 as string[]).entries()) {
      const filename = resolveInside(directory, `${assetId}-${index + 1}.jpeg`)
      await writeFile(filename, Buffer.from(encoded, 'base64'))
      files.push(filename)
    }
    return { assetId, kind: 'image', model: this.#imageModel, files, ...(typeof body.id === 'string' ? { traceId: body.id } : {}) }
  }

  async generateMusic(input: {
    assetId: string
    prompt: string
    lyrics?: string
    instrumental?: boolean
    format?: 'mp3' | 'wav'
  }): Promise<GeneratedAsset> {
    const assetId = validateAssetId(input.assetId)
    const format = input.format ?? 'mp3'
    const response = await this.#fetch(`${this.#baseUrl}/v1/music_generation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.#apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.#musicModel,
        prompt: input.prompt,
        lyrics: input.lyrics ?? '',
        is_instrumental: input.instrumental ?? true,
        output_format: 'hex',
        audio_setting: { sample_rate: 44100, bitrate: 256000, format },
      }),
    })
    const body = await responseJson(response)
    const data = body.data as { audio?: unknown } | undefined
    if (typeof data?.audio !== 'string' || !/^[0-9a-fA-F]+$/.test(data.audio)) {
      throw new Error('MiniMax music response did not contain hex audio')
    }
    const directory = resolveInside(this.#outputRoot, 'music', assetId)
    await mkdir(directory, { recursive: true })
    const filename = resolveInside(directory, `${assetId}.${format}`)
    await writeFile(filename, Buffer.from(data.audio, 'hex'))
    return { assetId, kind: 'music', model: this.#musicModel, files: [filename], ...(typeof body.trace_id === 'string' ? { traceId: body.trace_id } : {}) }
  }
}

