// This is a placeholder that FAKES an AI response so we can build and test
// the whole session/UI flow before wiring up a real API call. The function
// SIGNATURE (what goes in, what comes out) is what actually matters here —
// Step 4 will swap the implementation for a real fetch() to app/api/ai,
// but nothing that CALLS this function should need to change.
export async function requestAIEdit(text: string, instruction: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // simulate network delay
  return `[${instruction}] ${text}`;
}