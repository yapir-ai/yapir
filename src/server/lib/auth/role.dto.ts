import { z } from "zod";

export const OrganizationRoleSchema = z
  .enum({ Admin: "admin", User: "user" })
  .describe(
    "admin: Organization Admin, administers Yapir and every project. user: Organization User, accesses only the projects they are a member of"
  );

export const ProjectRoleSchema = z
  .enum({ Admin: "admin", User: "user" })
  .describe(
    "admin: Project Admin, administers the project's instructions and automations. user: Project User, read-only access"
  );
