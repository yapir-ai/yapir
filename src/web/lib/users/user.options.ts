import { OrganizationRoleSchema } from "@server/lib/auth/role.dto";

export const organizationRoleOptions = Object.entries(
  OrganizationRoleSchema.enum
).map(([label, value]) => ({ label, value }));
