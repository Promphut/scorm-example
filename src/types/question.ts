export type QuestionType =
  | "QUESTION_TYPE_CHOICE"
  | "QUESTION_TYPE_NUMERIC"
  | "QUESTION_TYPE_TF";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  choices?: string[] | null;
  correctAnswer: string | number | boolean;
  objective: string;
}

export interface QuestionResponse {
  questionId: string;
  userAnswer: string | number | boolean;
  isCorrect: boolean;
  timestamp: Date;
}

export interface QuestionProps {
  question: Question;
  onAnswer: (response: QuestionResponse) => void;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
  userAnswer?: string | number | boolean;
}
