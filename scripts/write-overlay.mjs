import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generatedDirectory = path.join(projectRoot, '.generated')
const pluginPath = pathToFileURL(path.join(projectRoot, 'src', 'plugin.ts')).href
const outputRoot = path.join(projectRoot, 'output').replaceAll('\\', '/')

const yaml = `- id: llm-pi-ai
  config:
    providers:
      zai:
        displayName: Z.AI Coding Plan
        apiKeyEnv: ZAI_API_KEY
        api: openai-completions
        baseURL: !!js process.env.ZAI_BASE_URL ?? 'https://api.z.ai/api/coding/paas/v4'
        models:
          - id: !!js process.env.ZAI_MODEL ?? 'glm-5.1'
            name: !!js process.env.ZAI_MODEL ?? 'GLM-5.1'
            contextWindow: 200000
            maxTokens: 128000
            input:
              - text
- insert:
    - id: game-asset-tools
      name: '${pluginPath}'
      config:
        outputRoot: !!js process.env.GAME_ASSET_OUTPUT_ROOT ?? '${outputRoot}'
        minimaxApiKeyEnv: MINIMAX_API_KEY
        minimaxBaseUrl: !!js process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io'
        minimaxImageModel: !!js process.env.MINIMAX_IMAGE_MODEL ?? 'image-01'
        minimaxMusicModel: !!js process.env.MINIMAX_MUSIC_MODEL ?? 'music-3.0'
`

await mkdir(generatedDirectory, { recursive: true })
await writeFile(path.join(generatedDirectory, 'overlay.cordis.yml'), yaml, 'utf8')
console.log('Generated .generated/overlay.cordis.yml (contains references only; no secrets).')
