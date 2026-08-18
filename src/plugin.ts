import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { MiniMaxClient } from './minimax-client.ts'
import { resolveInside, validateAssetId } from './path-policy.ts'

export const name = 'game-asset-tools'
export const inject = ['tools']

export interface Config {
  outputRoot?: string
  minimaxApiKeyEnv?: string
  minimaxBaseUrl?: string
  minimaxImageModel?: string
  minimaxMusicModel?: string
}

const fileListSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    assetId: { type: 'string' as const, required: true },
    kind: { type: 'string' as const, required: true, enum: ['image', 'music'] },
    model: { type: 'string' as const, required: true },
    files: { type: 'array' as const, required: true, items: { type: 'string' as const } },
    traceId: { type: 'string' as const },
  },
} as const

export function apply(ctx: Context, config: Config = {}): void {
  const outputRoot = path.resolve(config.outputRoot ?? process.env.GAME_ASSET_OUTPUT_ROOT ?? './output')
  const keyEnv = config.minimaxApiKeyEnv ?? 'MINIMAX_API_KEY'

  const client = (): MiniMaxClient => {
    const baseUrl = config.minimaxBaseUrl ?? process.env.MINIMAX_BASE_URL
    const imageModel = config.minimaxImageModel ?? process.env.MINIMAX_IMAGE_MODEL
    const musicModel = config.minimaxMusicModel ?? process.env.MINIMAX_MUSIC_MODEL
    return new MiniMaxClient({
      apiKey: process.env[keyEnv] ?? '',
      outputRoot,
      ...(baseUrl === undefined ? {} : { baseUrl }),
      ...(imageModel === undefined ? {} : { imageModel }),
      ...(musicModel === undefined ? {} : { musicModel }),
    })
  }

  ctx.tools.register(defineTool({
    name: 'game_asset_brief_write',
    description: 'Write a validated JSON production brief for one game asset before generation.',
    parameters: {
      assetId: { type: 'string', required: true, description: 'Stable lowercase asset id.' },
      kind: { type: 'string', required: true, enum: ['image', 'music'], description: 'Asset medium.' },
      purpose: { type: 'string', required: true, description: 'How the game uses this asset.' },
      prompt: { type: 'string', required: true, description: 'Provider-ready generation prompt.' },
      acceptanceCriteria: { type: 'array', required: true, items: { type: 'string' } },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { file: { type: 'string', required: true } } },
      render: (_args, value) => [{ type: 'text', text: `Wrote asset brief: ${value.file}` }],
    },
    async execute(args) {
      const assetId = validateAssetId(args.assetId)
      const directory = resolveInside(outputRoot, 'briefs')
      await mkdir(directory, { recursive: true })
      const file = resolveInside(directory, `${assetId}.json`)
      await writeFile(file, `${JSON.stringify({ ...args, assetId, createdAt: new Date().toISOString() }, null, 2)}\n`, 'utf8')
      return { file }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'minimax_generate_game_image',
    description: 'Generate one or more game concept images with MiniMax and save them inside the configured output root.',
    parameters: {
      assetId: { type: 'string', required: true },
      prompt: { type: 'string', required: true },
      aspectRatio: { type: 'string', enum: ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9'] },
      count: { type: 'integer', description: 'Number of images, from 1 through 9.' },
      seed: { type: 'integer' },
    },
    output: {
      schema: fileListSchema,
      render: (_args, value) => [{ type: 'text', text: `Generated ${value.files.length} image file(s) for ${value.assetId}.` }],
    },
    execute: args => client().generateImage(args),
  }))

  ctx.tools.register(defineTool({
    name: 'minimax_generate_game_music',
    description: 'Generate game music with MiniMax and save it inside the configured output root.',
    parameters: {
      assetId: { type: 'string', required: true },
      prompt: { type: 'string', required: true },
      lyrics: { type: 'string' },
      instrumental: { type: 'boolean' },
      format: { type: 'string', enum: ['mp3', 'wav'] },
    },
    output: {
      schema: fileListSchema,
      render: (_args, value) => [{ type: 'text', text: `Generated music file for ${value.assetId}: ${value.files[0]}` }],
    },
    execute: args => client().generateMusic(args),
  }))
}
