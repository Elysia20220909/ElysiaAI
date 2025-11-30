import { Elysia } from 'elysia'
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

const app = new Elysia()

app.get('/', () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8')
  return new Response(file, { headers: { 'content-type': 'text/html; charset=utf-8' } })
})

app.post('/ai', async (c) => {
  const req = c.request
  const ct = (req.headers.get('content-type') || '').toLowerCase()

  let messages: Array<{ role?: string; content?: string }> = []

  try {
    if (ct.includes('application/json')) {
      const j = await req.json()
      messages = j.messages ?? j
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const txt = await req.text()
      const params = new URLSearchParams(txt)
      const m = params.get('messages')
      if (m) {
        try {
          messages = JSON.parse(m)
        } catch {
          messages = [{ role: 'user', content: m }]
        }
      }
    } else {
      // fallback: try parse body as JSON, otherwise treat whole body as user content
      const txt = await req.text()
      try {
        const parsed = JSON.parse(txt)
        messages = parsed.messages ?? parsed
      } catch {
        if (txt) messages = [{ role: 'user', content: txt }]
      }
    }
  } catch (e) {
    return app.json({ error: 'invalid request body' }, 400)
  }

  const lastUser = (messages.filter(m => m.role === 'user').pop() ?? messages.pop()) || { content: '' }
  const prompt = (lastUser.content || '').toString()

  if (!prompt.trim()) return app.json({ error: 'empty prompt' }, 400)

  // Ensure ollama CLI is available
  try {
    const v = spawnSync('ollama', ['--version'], { encoding: 'utf8' })
    if (v.error) throw v.error
  } catch (err) {
    return new Response('Ollama CLI not found on server. Install Ollama and pull a model (e.g. `ollama pull llama3.2`).', { status: 500 })
  }

  // Run Ollama synchronously and return full output (non-streaming)
  try {
    // Pass prompt as an argument to `ollama run`. This assumes the CLI supports: `ollama run <model> <prompt>`.
    const run = spawnSync('ollama', ['run', 'llama3.2', prompt], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })

    if (run.error) {
      return new Response(`Failed to execute ollama: ${run.error.message}`, { status: 500 })
    }

    if (run.status !== 0) {
      const stderr = run.stderr || String(run.status)
      return new Response(`Ollama returned non-zero status: ${stderr}`, { status: 500 })
    }

    const out = run.stdout ?? ''
    return new Response(out, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
  } catch (e: any) {
    return new Response(`Unexpected error running ollama: ${String(e?.message ?? e)}`, { status: 500 })
  }
})

const port = Number(process.env.PORT) || 3000
app.listen(port)

export default app
import { Elysia, t } from 'elysia'
import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'
// Dynamically load ollama provider (handle different export shapes)
let provider: any = null
try {
  const _mod = await import('ollama').catch(() => null)
  if (_mod) {
    // try named export, default, or module itself
    const maker = _mod.ollama ?? _mod.default ?? _mod.createOllama ?? _mod
    if (typeof maker === 'function') {
      provider = maker('llama3.2')
    } else {
      provider = maker
    }
  }
} catch (e) {
  console.warn('Could not load ollama provider:', e)
}

import { streamText } from 'ai'

const app = new Elysia()
  .use(html())
  .use(staticPlugin())

  // エリシアが踊るトップページ
  .get('/', () => Bun.file('public/index.html'))

  // AIチャットAPI（ストリーミング対応）
  .post('/ai', async ({ body }) => {
    const { messages } = body

    const result = await streamText({
      model: provider,
      system: `あなたは「Elysiaちゃん」という超絶可愛い女の子です。\n               語尾に「〜♪」「にゃ」「だよっ」を多用して、めちゃくちゃ甘えた感じで話してください。\n               絶対に真面目な口調にならないで！`,
      messages,
    })

    return result.toDataStreamResponse()
  }, {
    body: t.Object({
      messages: t.Array(t.Object({
        role: t.Union([t.Literal('user'), t.Literal('assistant')]),
        content: t.String()
      }))
    })
  })

  .listen(3000)

console.log(`エリシアちゃんAIが起動したよ〜♪ http://localhost:3000`)

export default app
