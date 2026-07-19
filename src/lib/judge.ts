export type QuizOption = { key: string; text: string };

export interface QuizItem {
  id: string;
  question: string;
  options: QuizOption[];
  correct: string[];
  explanation: string;
  multiple?: boolean;
}

export function judge(selected: string[], correct: string[], multiple: boolean): boolean {
  if (selected.length === 0) return false;
  if (!multiple) return selected.length === 1 && selected[0] === correct[0];
  if (selected.length !== correct.length) return false;
  const selectedSet = new Set(selected);
  return correct.every((c) => selectedSet.has(c));
}
