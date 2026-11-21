import type { Deps } from "../contract";
import { Execution } from "./lifecycle";
import { durable } from "./platform";
import type { Platform } from "./platform";

const { Entity, Workflow } = durable<Deps>();

class Parent extends Entity<Parent> {
  child?: Child;

  begin() {
    // @ts-expect-error start takes the constructor arguments of the workflow
    this.child = this.start(Child, 42);
    // @ts-expect-error a workflow starts only from the class of its parent
    this.start(Execution, []);
  }

  async slow() {}
}

class Child extends Workflow<Child, Parent, "done"> {
  label: string;

  constructor(label: string) {
    super();
    this.label = label;
    // @ts-expect-error onError names a handler that takes the error message
    this.outside.dispatch(this.id).onError("finish");
    // @ts-expect-error after names a handler
    this.after(1000).missing();
    // @ts-expect-error after takes the arguments of the handler
    this.after(1000).fail(42);
  }

  fail(error: string) {
    this.label = error;

    return this.end("done");
  }

  finish() {
    return this.end("done");
  }
}

export async function routes(platform: Platform) {
  // @ts-expect-error ask names a handler
  await platform.ask(Execution, "e").missing();
  // @ts-expect-error an async method is not a handler
  await platform.ask(Parent, "p").slow();
  const reply = await platform.ask(Execution, "e").pull();
  // @ts-expect-error the answer exists only when the workflow did not end
  void reply.answer;
  const { ended } = await platform.ask(Execution, "e").fail("crashed");
  // @ts-expect-error a handler that only ends its workflow has no answer
  void (await platform.ask(Execution, "e").stop("user-1")).answer;

  return ended;
}
