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

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [MAKE_MOVE_TOOL],
      tool_choice: { type: 'any' },
      messages,
    });

    const toolUse = response.content.find((c) => c.type === 'tool_use');

    if (!toolUse) {
      ctx.status = 500;
      ctx.body = { error: 'No tool call in Claude response' };
      return;
    }

    ctx.body = {
      cell_index: toolUse.input.cell_index,
      reasoning: toolUse.input.reasoning,
      tool_use_id: toolUse.id,
      assistant_content: response.content,
    };
  } catch (err) {
    console.error('Claude API error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

server.run(8000, () => {
  const mode = isDev ? 'dev' : 'prod';
  console.log(`boardgame.io server [${mode}] running on port 8000`);
  if (!isDev) console.log('serving React build at http://localhost:8000');
});
