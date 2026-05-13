export type TrainingQuestion = {
  id: string;
  type: "mcq" | "numeric" | "text" | "expression";
  prompt: string;
  choices?: string[];
  expected_answer?: string | number;
  validation?: {
    type: "exact" | "range" | "regex" | "expression";
    value: unknown;
  };
  guidance?: {
    hints: string[];
    feedback?: {
      correct?: string;
      incorrect?: string;
      almost?: string;
    };
  };
};

export type DocumentAsset = {
  id: string;
  type: "image" | "table" | "graph";
  render_mode: "image_first" | "table_first" | "image_only" | "table_only";
  label?: string;
  image?: {
    public_url: string;
    width?: number;
    height?: number;
  };
  table?: {
    headers: string[];
    rows: (string | number)[][];
  };
  usage?: "shared" | "question_specific";
  linked_question_id?: string;
  alt?: string;
};

