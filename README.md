# Game Asset Harness

An open-source DeepSeek Harness extension for planning and generating game assets. The initial providers are:

- Z.AI through the Harness `llm-pi-ai` OpenAI-compatible adapter.
- MiniMax `image-01` for concept images.
- MiniMax `music-3.0` for game music.

Model IDs and endpoints are environment-driven so newer compatible models can be selected without changing source code.

## Security

Never place API keys in this repository. The overlay contains environment-variable references only, generated outputs are ignored, and the plugin constrains every generated path to `GAME_ASSET_OUTPUT_ROOT`.

Required variables:

```text
ZAI_API_KEY
MINIMAX_API_KEY
```

Optional overrides:

```text
ZAI_BASE_URL
ZAI_MODEL
MINIMAX_BASE_URL
MINIMAX_IMAGE_MODEL
MINIMAX_MUSIC_MODEL
GAME_ASSET_OUTPUT_ROOT
```

## Run

```powershell
npm install
npm run check
.\scripts\run-with-local-secrets.ps1
```

The wrapper reads the existing workspace-local secret file into process environment variables without copying keys into this repository. You may instead set the environment variables yourself and run `npm run dsh:web`.

The generated DeepSeek Harness overlay registers:

- `game_asset_brief_write`
- `minimax_generate_game_image`
- `minimax_generate_game_music`

DeepSeek Harness is an upstream MIT dependency. This project does not modify the upstream checkout.
