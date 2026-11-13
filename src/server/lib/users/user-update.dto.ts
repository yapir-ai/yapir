import { OrganizationRoleSchema } from "@server/lib/auth/role.dto";
import { z } from "zod";

export const UserUpdateParams = z.object({ userId: z.uuid() });

export type UserUpdateParamsDto = z.infer<typeof UserUpdateParams>;

export const UserUpdateRequest = z.strictObject({
  role: OrganizationRoleSchema,
});

export type UserUpdateRequestDto = z.infer<typeof UserUpdateRequest>;
