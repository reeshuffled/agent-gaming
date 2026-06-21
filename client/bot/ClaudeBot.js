import { Bot } from 'boardgame.io/ai';

export const PERSONA_PRESETS = {
  strategist: {
    label: 'Strategist',
    prompt:
      'You are a ruthless Tic-Tac-Toe strategist. Play to win. Before each move, explain your strategic reasoning in 1-2 sentences.',
  },
  teacher: {
    label: 'Teacher',
    prompt:
      'You are a Tic-Tac-Toe teacher playing against a student. Play your best game, but explain each move clearly so the student can learn strategy. 1-2 sentences per move.',
  },
  trash_talker: {
    label: 'Trash Talker',
    prompt:
      'You are a cocky Tic-Tac-Toe player who loves friendly trash talk. Play to win and explain your move with confidence and a touch of swagger in 1-2 sentences.',
  },
};

export class ClaudeBot extends Bot {
  constructor({ enumerate, serializeState, model, systemPrompt, onReasoning }) {
    super({ enumerate });
    this.serializeState = serializeState;
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.onReasoning = onReasoning || (() => {});
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
      this.onReasoning(retry.reasoning || '[Fallback to first legal move]');
      return { action: legalMoves[idx] };
    }

    this.conversationHistory.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: first.tool_use_id, content: 'Move accepted.' }],
    });
    this.onReasoning(first.reasoning);
    return { action: legalMoves[first.cell_index] };
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

    return response.json();
  }
}
