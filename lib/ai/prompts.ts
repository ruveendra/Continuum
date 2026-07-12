// Turns the user's selected text + instruction into a single prompt string
// for the AI. Kept separate from the route handler so prompt wording can
// be tuned independently of request/response plumbing.
export function buildRewritePrompt(text: string, instruction: string): string {
  return `You are a writing assistant embedded in a rich text editor.

The user selected the following text:
"""
${text}
"""

Their instruction: "${instruction}"

Rewrite the selected text according to the instruction. Return ONLY the
rewritten text — no explanations, no preamble, no quotation marks around
the output, no markdown formatting.`;
}