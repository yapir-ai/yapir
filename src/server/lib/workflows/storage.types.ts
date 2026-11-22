export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export interface JsonObject {
  [key: string]: Json;
}

export type Value = Json | undefined;

export type Field = { value?: Json } | { child: string };

export type Fields = Record<string, Field>;

export interface RunStep {
  kind: "run";
  args: Json[];
  fields: Fields;
  at: number;
}

export interface StartStep {
  kind: "start";
  command: number;
  child: string;
}

export interface ResolveStep {
  kind: "resolve";
  command: number;
  of: "until" | "result";
  outcome: Json;
  fields: Fields;
  at: number;
}

export type Step = RunStep | StartStep | ResolveStep;
