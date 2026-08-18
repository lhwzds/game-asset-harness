import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bin = path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
const child = spawn(process.execPath, [
  bin,
  '--profile', 'web',
  '--patch', path.join(projectRoot, '.generated', 'overlay.cordis.yml'),
  '--port', '0',
], {
  cwd: projectRoot,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
})

let output = ''
let ready = false
let settled = false
const timeout = setTimeout(() => {
  if (settled) return
  settled = true
  child.kill()
  console.error(`DSH smoke test timed out.\n${output}`)
  process.exitCode = 1
}, 20_000)

function inspect(chunk) {
  output += chunk.toString()
  const match = output.match(/dsh web:\s+(http:\/\/127\.0\.0\.1:\d+)/i)
  if (!ready && match) {
    ready = true
    console.log(`DSH_SMOKE_OK: ${match[1]}`)
    child.kill()
  }
}

child.stdout.on('data', inspect)
child.stderr.on('data', inspect)
child.on('error', (error) => {
  clearTimeout(timeout)
  if (!settled) {
    settled = true
    console.error(error)
    process.exitCode = 1
  }
})
child.on('exit', (code) => {
  clearTimeout(timeout)
  if (settled) return
  settled = true
  if (!ready) {
    console.error(`DSH exited before listening (code ${code}).\n${output}`)
    process.exitCode = 1
  }
})
