# ADR 0002: Tool use for Claude move selection

## Status
Accepted

## Context
`ClaudeBot` needs Claude to return a structured move decision: a legal move index and a reasoning string. Three options were considered:

1. **Free-text + regex** — ask Claude to respond in a specific format, parse with regex. Fragile; Claude occasionally deviates from format instructions.
2. **JSON mode** — instruct Claude to return raw JSON. More reliable than regex but still requires a schema in the prompt and manual parsing.
3. **Tool use** — define a `make_move` tool with typed parameters; Claude is forced to emit a valid tool call or refuse entirely.

## Decision
Use the Anthropic tool use API. Define a single tool:

```json
{
  "name": "make_move",
  "description": "Select a move and explain your reasoning.",
  "input_schema": {
    "type": "object",
    "properties": {
      "cell_index": { "type": "integer", "description": "Index into the legal moves array." },
      "reasoning": { "type": "string", "description": "1-2 sentence explanation for the human opponent." }
    },
    "required": ["cell_index", "reasoning"]
  }
}
```

The server calls Claude with `tool_choice: { type: "any" }` to force a tool call on every turn.

## Consequences
- `cell_index` and `reasoning` are always typed and present — no parsing code needed.
- Invalid move detection is reduced to a bounds check on `cell_index` vs the legal moves array length.
- Tool use adds a small token overhead per call vs plain JSON (~50 tokens for the tool schema). Acceptable.
- Conversation history must include tool call/result turns in the Anthropic message format, which is slightly more verbose than plain user/assistant pairs.
