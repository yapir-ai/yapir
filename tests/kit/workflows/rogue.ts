import { Workflow } from "@workflow";

export class Rogue extends Workflow {
  async run(fault: string) {
    if (fault === "two waits") {
      await Promise.all([this.until(() => false), this.until(() => false)]);
    }

    await Promise.withResolvers<never>().promise;

    return {};
  }

  poke() {
    return this.id;
  }
}
