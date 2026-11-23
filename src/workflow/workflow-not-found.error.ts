export class WorkflowNotFoundError extends Error {
  override name = "WorkflowNotFoundError";

  constructor(type: string, id: string) {
    super(`Workflow ${type} ${id} could not be found`);
  }
}
