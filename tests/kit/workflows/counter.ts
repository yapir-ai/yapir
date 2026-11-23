import { inject, upsert, Workflow } from "@workflow";
import type { Child } from "@workflow";

import { Helper } from "./helper";
import { probeTable } from "./probe-tables";
import { probeActivities } from "./probe.activities";

export class Counter extends Workflow {
  count = 0;
  rounds = 0;
  expiresAt = this.now + 60_000;
  notes: string[] = [];
  helper?: Child<Helper>;

  private readonly announce = inject(probeActivities, "announce");

  async run(goal: number) {
    if (!(await this.reach(goal))) {
      this.announce(this.id, "expired");

      return { rounds: this.rounds };
    }

    this.announce(this.id, `reached ${this.count}`);
    this.helper = this.start(Helper, `round ${this.rounds}`);
    this.helper.greet("welcome");

    const { echoed } = await this.helper.result;

    this.helper = undefined;
    this.notes.push(`echoed ${echoed}`);
    this.rounds += 1;
    this.count = 0;

    return await this.continueAsNew();
  }

  add(amount: number) {
    this.count += amount;

    return { count: this.count };
  }

  extend(duration: number) {
    this.expiresAt = this.now + duration;
  }

  note(text: string) {
    this.notes.push(text);
  }

  report() {
    return { count: this.count, rounds: this.rounds, notes: this.notes };
  }

  override rows() {
    return [
      upsert(probeTable, {
        id: this.id,
        count: this.count,
        rounds: this.rounds,
      }),
    ];
  }

  private async reach(goal: number) {
    return await this.waitFor(goal);
  }

  private async waitFor(goal: number) {
    return await this.until(() => this.count >= goal, {
      deadline: () => this.expiresAt,
    });
  }
}
