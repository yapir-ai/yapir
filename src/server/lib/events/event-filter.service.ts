import { Environment, EvaluationError } from "@marcbachmann/cel-js";
import type { Trigger } from "@server/lib/automations/automation.dto";

import type { PreparedEvent, TriggerFilter } from "./event-definition";

export function eventFilterService() {
  // Described for the Assistant by celContextDescription in event-filter.context.ts.
  const environment = new Environment()
    .registerVariable("event", "map<string, dyn>")
    .registerVariable("yapir", { schema: { task: "dyn", author: "dyn" } });

  function check(trigger: Trigger) {
    if (!("expression" in trigger)) {
      return "This event type needs a CEL expression";
    }

    const { valid, type, error } = environment.check(trigger.expression);

    if (!valid) {
      return String(error);
    }

    if (type !== "bool") {
      return `The expression returns ${type}, not bool`;
    }
  }

  function matches(
    trigger: Trigger,
    event: PreparedEvent,
    task: { id: string } | null
  ) {
    if (!("expression" in trigger)) {
      return false;
    }

    try {
      return (
        environment.evaluate(trigger.expression, {
          event: event.data,
          yapir: { task, author: event.author },
        }) === true
      );
    } catch (error) {
      if (!(error instanceof EvaluationError)) {
        throw error;
      }

      console.error("Trigger evaluation failed", {
        eventId: event.id,
        expression: trigger.expression,
        error: error.message,
      });

      return false;
    }
  }

  return { check, matches } satisfies TriggerFilter;
}

export type EventFilterService = ReturnType<typeof eventFilterService>;
