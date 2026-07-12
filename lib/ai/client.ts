// Calls our own /api/ai route handler, which in turn calls Gemini.
// Signature is unchanged from the stub version — anything calling
// requestAIEdit() doesn't need to know or care that this now hits a
// real network endpoint instead of faking a response.
export async function requestAIEdit(text: string, instruction: string): Promise<string> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, instruction }),
  });

  if (!response.ok) {
    throw new Error("AI request failed");
  }

  const data = await response.json();
  return data.resultText;
}