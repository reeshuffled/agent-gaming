import { Bot } from 'boardgame.io/ai';

export const PERSONA_PRESETS = {
  strategist: {
    label: 'Strategist',
    prompt:
      'You are a ruthless game strategist. Play to win. Before each move, explain your strategic reasoning in 1-2 sentences.',
  },
  teacher: {
    label: 'Teacher',
    prompt:
      'You are a game teacher playing against a student. Play your best game, but explain each move clearly so the student can learn strategy. 1-2 sentences per move.',
  },
  trash_talker: {
    label: 'Trash Talker',
    prompt:
      'You are a cocky player who loves friendly trash talk. Play to win and explain your move with confidence and a touch of swagger in 1-2 sentences.',
  },
};

export class ClaudeBot extends Bot {
  constructor({ enumerate, serializeState, model, systemPrompt, onReasoningChunk, onReasoning, onMove }) {
    super({ enumerate });
    this.serializeState = serializeState;
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.onReasoningChunk = onReasoningChunk || (() => {});
    this.onReasoning = onReasoning || (() => {});
    this.onMove = onMove || (() => {});
    this.conversationHistory = [];
  }

  async play(state, playerID) {
    const { G, ctx } = state;
    const legalMoves = this.enumerate(G, ctx, playerID);

    if (!legalMoves || legalMoves.length === 0) {
      return { action: null };
    }

    const userMessage = this.serializeState(G, ctx, playerID, legalMoves);
    this.conversationHistory.push({ role: 'user', content: userMessage });

    const first = await this._callClaude();
    this.conversationHistory.push({ role: 'assistant', content: first.assistant_content });

    if (!this._valid(first.cell_index, legalMoves)) {
      this.conversationHistory.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: first.tool_use_id,
          content: `Invalid cell_index ${first.cell_index}. Must be 0–${legalMoves.length - 1}. Choose again.`,
        }],
      });

      const retry = await this._callClaude();
      this.conversationHistory.push({ role: 'assistant', content: retry.assistant_content });

      const idx = this._valid(retry.cell_index, legalMoves) ? retry.cell_index : 0;
      this.conversationHistory.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: retry.tool_use_id, content: 'Move accepted.' }],
      });
      const retryReasoning = retry.reasoning || '[Fallback to first legal move]';
      const retryAction = legalMoves[idx];
      this.onMove(retryAction.payload.type, retryAction.payload.args, retryReasoning);
      this.onReasoning(retryReasoning);
      return { action: retryAction };
    }

    this.conversationHistory.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: first.tool_use_id, content: 'Move accepted.' }],
    });
    const chosenAction = legalMoves[first.cell_index];
    this.onMove(chosenAction.payload.type, chosenAction.payload.args, first.reasoning);
    this.onReasoning(first.reasoning);
    return { action: chosenAction };
  }

  _valid(index, moves) {
    return Number.isInteger(index) && index >= 0 && index < moves.length;
  }

  async _callClaude() {
    const response = await fetch('/api/claude-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        systemPrompt: this.systemPrompt,
        messages: this.conversationHistory,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude proxy ${response.status}: ${err}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'chunk') {
          this.onReasoningChunk(event.text);
        } else if (event.type === 'done') {
          result = event;
        } else if (event.type === 'error') {
          throw new Error(`Claude proxy error: ${event.error}`);
        }
      }
    }

    if (!result) throw new Error('Stream ended without result');
    return result;
  }
}
