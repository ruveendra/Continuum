export type EditorDocument = {
  id: string;
};

export type EditorSelection = {
  from: number;
  to: number;
  text: string;
  isEmpty: boolean;
};