import { Workflow } from "@server/lib/workflows/workflow";

export class Witness extends Workflow {
  items: string[] = [];

  async run() {
    const held = this.items;

    await this.until(() => this.items.length > 0);

    return { held: held.length };
  }

  add(item: string) {
    this.items.push(item);
  }
}
