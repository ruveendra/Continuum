export async function requestAIEdit(text: string, instruction: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return `[${instruction}] ${text}`;
}