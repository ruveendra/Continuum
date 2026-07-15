// One message in the always-visible chat panel. We keep both user and
// assistant messages in the same list/shape so rendering the conversation
// is just one .map() over a single array.
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};