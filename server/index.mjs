import { Server } from 'boardgame.io/dist/cjs/server.js';
import { createRequire } from 'module';
import { TicTacToe } from '../client/games/tictactoe/Game.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const require = createRequire(import.meta.url);
const koaStatic = require('koa-static');
const koaBody = require('koa-body');

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== 'production';

const server = Server({
  games: [TicTacToe],
  origins: isDev ? ['http://localhost:3000'] : false,
});

if (!isDev) {
  const buildPath = join(__dirname, '..', 'build');
  server.app.use(koaStatic(buildPath));
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAKE_MOVE_TOOL = {
  name: 'make_move',
  description: 'Select a move from the available options and explain your reasoning to the human opponent.',
  input_schema: {
    type: 'object',
    properties: {
      cell_index: {
        type: 'integer',
        description: 'Index into the available moves list (the number before the colon).',
      },
      reasoning: {
        type: 'string',
        description: '1-2 sentence explanation of your move for the human opponent.',
      },
    },
    required: ['cell_index', 'reasoning'],
  },
};

server.router.post('/api/claude-move', koaBody(), async (ctx) => {
  const { model, systemPrompt, messages } = ctx.request.body;

  ctx.respond = false;
  ctx.res.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  });

  const write = (obj) => ctx.res.write(JSON.stringify(obj) + '\n');

  try {
    let accumulatedJson = '';
    let lastReasoningLength = 0;

    const stream = anthropic.messages.stream({
      model,
      max_tokens: 1024,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      tools: [MAKE_MOVE_TOOL],
      tool_choice: { type: 'any' },
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
        accumulatedJson += event.delta.partial_json;

        // Extract reasoning as it streams (handles partial string with no closing quote)
        const match = accumulatedJson.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
        if (match) {
          const raw = match[1]
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t');
          if (raw.length > lastReasoningLength) {
            write({ type: 'chunk', text: raw.slice(lastReasoningLength) });
            lastReasoningLength = raw.length;
          }
        }
      }
    }

    const response = await stream.finalMessage();
    const { cache_read_input_tokens, cache_creation_input_tokens } = response.usage;
    console.log(`cache: read=${cache_read_input_tokens} write=${cache_creation_input_tokens}`);

    const toolUse = response.content.find((c) => c.type === 'tool_use');
    if (!toolUse) {
      write({ type: 'error', error: 'No tool call in Claude response' });
      ctx.res.end();
      return;
    }

    write({
      type: 'done',
      cell_index: toolUse.input.cell_index,
      reasoning: toolUse.input.reasoning,
      tool_use_id: toolUse.id,
      assistant_content: response.content,
    });
    ctx.res.end();
  } catch (err) {
    console.error('Claude API error:', err.message);
    try { write({ type: 'error', error: err.message }); } catch (_) {}
    ctx.res.end();
  }
});

server.run(8000, () => {
  const mode = isDev ? 'dev' : 'prod';
  console.log(`boardgame.io server [${mode}] running on port 8000`);
  if (!isDev) console.log('serving React build at http://localhost:8000');
});
