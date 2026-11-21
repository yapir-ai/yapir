import { apiError } from "@server/lib/api/api-error";
import { Authentication } from "@server/lib/api/authentication.middleware";
import { DatabaseAccess } from "@server/lib/api/database-access.middleware";
import { paginationMaxLimit } from "@server/lib/pagination/pagination.dto";
import { Effect, Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

const SkillId = Schema.String.check(Schema.isUUID());

const SkillName = Schema.String.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, {
    message: "Use lowercase letters, digits and single hyphens",
  })
).annotate({
  description:
    "The SKILL.md name: lowercase letters, digits and single hyphens, up to 64 characters. Other skills can have the same name",
});

const SkillDescription = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(1024)
).pipe(
  Schema.annotateEncoded({
    description:
      "The SKILL.md description: what the skill does and when to use it",
  })
);

const SkillInstructions = Schema.Trim.check(Schema.isMinLength(1)).pipe(
  Schema.annotateEncoded({ description: "The SKILL.md body, in Markdown" })
);

const SkillFields = {
  name: SkillName,
  description: SkillDescription,
  instructions: SkillInstructions,
};

export const SkillFormSchema = Schema.Struct(SkillFields);

export const SkillCreateRequest = Schema.Struct({
  id: Schema.optionalKey(SkillId.check(Schema.isUUID(7))),
  ...SkillFields,
});

export const SkillUpdateRequest = Schema.Struct({
  name: Schema.optional(SkillName),
  description: Schema.optional(SkillDescription),
  instructions: Schema.optional(SkillInstructions),
});

export const SkillResponse = Schema.Struct({
  id: Schema.String,
  deletedAt: Schema.NullOr(Schema.String),
  name: Schema.String,
  description: Schema.String,
  instructions: Schema.String,
  authorId: Schema.String,
});

const IdFilter = Schema.Union([
  Schema.Array(SkillId).check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  SkillId,
]).annotate({
  description: "One or more IDs: repeat the parameter for several",
});

const SkillListRequest = {
  offset: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(0))
  ),
  limit: Schema.Int.check(
    Schema.isBetween({ minimum: 1, maximum: paginationMaxLimit })
  ).pipe(Schema.withDecodingDefaultKey(Effect.succeed(10))),
  id: Schema.optionalKey(IdFilter),
  order: Schema.Literals(["asc", "desc"]).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("desc" as const))
  ),
};

export const SkillNotFound = apiError("SKILL_NOT_FOUND", 404);

export const SkillDeleted = apiError("SKILL_DELETED", 409);

export const SkillAuthorRequired = apiError("SKILL_AUTHOR_REQUIRED", 403);

export const SkillParams = Schema.Struct({ skillId: SkillId });

export const SkillsApiGroup = HttpApiGroup.make("skills")
  .add(
    HttpApiEndpoint.get("list", "/", {
      query: SkillListRequest,
      success: Schema.Struct({ items: Schema.Array(SkillResponse) }),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "skillList",
        summary:
          "List skills: instructions shared with the organization, which users install in their own harness",
      })
    ),
    HttpApiEndpoint.get("info", "/:skillId", {
      params: SkillParams,
      success: SkillResponse,
      error: SkillNotFound,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "skillInfo",
        summary:
          "Read a skill: the name and description of its SKILL.md frontmatter, and its instructions, the SKILL.md body",
      })
    ),
    HttpApiEndpoint.post("restore", "/:skillId/restore", {
      params: SkillParams,
      success: SkillResponse,
      error: [SkillNotFound, SkillAuthorRequired],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "skillRestore",
        summary:
          "Restore a deleted skill. Only its author or an Organization Admin can do this",
      })
    ),
    HttpApiEndpoint.patch("update", "/:skillId", {
      params: SkillParams,
      payload: SkillUpdateRequest,
      success: SkillResponse,
      error: [SkillNotFound, SkillAuthorRequired, SkillDeleted],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "skillUpdate",
        summary:
          "Update a skill. Only its author or an Organization Admin can do this",
      })
    ),
    HttpApiEndpoint.delete("delete", "/:skillId", {
      params: SkillParams,
      error: SkillAuthorRequired,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "skillDelete",
        summary:
          "Delete a skill. Only its author or an Organization Admin can do this",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      payload: SkillCreateRequest,
      success: SkillResponse.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "skillCreate",
        summary: "Create a skill, with the current user as its author",
      })
    )
  )
  .middleware(DatabaseAccess)
  .middleware(Authentication)
  .prefix("/skills")
  .annotate(HttpApi.PayloadParseOptions, { onExcessProperty: "error" });
