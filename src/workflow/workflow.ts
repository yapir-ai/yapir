import { handle } from "./handle";
import type { Row } from "./projection";
import {
  constructing,
  continueAsNew,
  parentParts,
  start,
  until,
} from "./runtime";
import type { Json, JsonObject } from "./storage.types";
import type { Child, ParentHandle } from "./workflow.types";

export abstract class Workflow<Parent = never> {
  readonly #runtime = constructing();

  get id(): string {
    return this.#runtime.id;
  }

  get now(): number {
    return this.#runtime.now;
  }

  get parent(): ParentHandle<Parent> {
    return handle(...parentParts(this.#runtime));
  }

  abstract run(...args: Json[]): Promise<JsonObject>;

  rows(): Row[] {
    return [];
  }

  protected async until(
    condition: () => boolean,
    options?: { deadline: () => number }
  ): Promise<boolean> {
    return await until(this.#runtime, condition, options?.deadline);
  }

  protected start<W extends Workflow<unknown>>(
    workflow: new () => W,
    ...args: Parameters<W["run"]>
  ): Child<W> {
    return start(this.#runtime, workflow, args);
  }

  protected async continueAsNew(): Promise<never> {
    return await continueAsNew(this.#runtime);
  }
}
