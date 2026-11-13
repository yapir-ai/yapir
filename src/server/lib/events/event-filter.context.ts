// The variables of a trigger's CEL expression, as declared by the environment of the event filter service.
// Pure, so descriptions can use it without loading the CEL engine.
export const celContextDescription =
  "`event` is the provider's webhook payload, reduced to the fields of its type's schema in the event catalog: the provider's webhook documentation describes them. `yapir.task` is the task of this automation already associated with a resource the event names, or null. `yapir.author` is the Yapir agent whose action the event reports ({agentId, agentName, automationId, taskId}), or null.";
