import { TaskStateSchema } from "@server/lib/tasks/task.dto";
import { ListRouteSearch } from "@web/lib/lists/list.route";
import { z } from "zod";

export const TasksRouteSearch = ListRouteSearch.extend({
  state: TaskStateSchema.optional(),
  automationId: z.uuid().optional(),
});

export type TaskListFilters = z.infer<typeof TasksRouteSearch>;
