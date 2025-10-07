// Fix: Create full type definitions for the application.
export interface DatasetMeta {
  filename: string;
  n_rows: number;
  n_cols: number;
  columns: string[];
}

export interface Dataset {
  meta: DatasetMeta;
  sample: Record<string, string | number>[];
  headers: string[];
}

export type ChartContent = {
  type: 'chart';
  spec: any; // Vega-Lite spec object
  data: Record<string, any>[];
};

export type TextContent = {
  type: 'text';
  text: string;
};

export type ErrorContent = {
  type: 'error';
  text: string;
};

export type ChatContent = TextContent | ChartContent | ErrorContent;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: ChatContent[];
}
