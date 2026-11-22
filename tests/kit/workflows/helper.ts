import { update } from "@server/lib/workflows/projection";
import { Workflow } from "@server/lib/workflows/workflow";

import type { Counter } from "./counter";
import { probeTable } from "./probe-tables";

export class Helper extends Workflow<Counter> {
  inbox: string[] = [];
  echoed = 0;
  done = false;

  async run(label: string) {
    this.parent.note(`${label} started`);

    while (!this.done) {
      await this.until(() => this.inbox.length > 0 || this.done);
      this.echo();
    }

    return { echoed: this.echoed };
  }

  greet(text: string) {
    this.inbox.push(text);
  }

  finish() {
    this.done = true;
  }

  override rows() {
    return [update(probeTable, { id: this.parent.id, echoed: this.echoed })];
  }

  private echo() {
    for (const text of this.inbox) {
      this.parent.note(text);
    }

    this.echoed += this.inbox.length;
    this.inbox = [];
  }
}
