import { YapirApi } from "@server/lib/api/api";
import { CurrentUser } from "@server/lib/api/current-user";
import { Database } from "@server/lib/api/database";
import { canWriteSkill } from "@server/lib/auth/access";
import { AppClock } from "@server/lib/clock/clock";
import type { SkillSelect } from "@server/lib/db/schema";
import { skillTable } from "@server/lib/db/schema";
import { hasAnyChange } from "@server/lib/dto/change-checker";
import { and, eq, isNull, EmptyFilter } from "drizzle-orm";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { SkillAuthorRequired, SkillDeleted, SkillNotFound } from "./skill.api";

const toResponse = (skill: SkillSelect) => ({
  id: skill.id,
  deletedAt: skill.deletedAt?.toISOString() ?? null,
  name: skill.name,
  description: skill.description,
  instructions: skill.instructions,
  authorId: skill.authorId,
});

const findSkill = Effect.fn("findSkill")(function* findSkill(skillId: string) {
  const db = yield* Database;

  return yield* db.query.skillTable
    .findFirst({ where: { id: skillId } })
    .pipe(Effect.orDie);
});

const requireAuthor = Effect.fn("requireAuthor")(function* requireAuthor(
  skill: SkillSelect
) {
  const user = yield* CurrentUser;

  if (!canWriteSkill(user, skill)) {
    return yield* new SkillAuthorRequired();
  }
});

const requireWritableSkill = Effect.fn("requireWritableSkill")(
  function* requireWritableSkill(skillId: string) {
    const skill = yield* findSkill(skillId);

    if (!skill) {
      return yield* new SkillNotFound();
    }

    yield* requireAuthor(skill);

    return skill;
  }
);

export const SkillsHandlers = HttpApiBuilder.group(
  YapirApi,
  "skills",
  Effect.fn(function* skillsHandlers(handlers) {
    const clock = yield* AppClock;

    return handlers
      .handle("list", ({ query: { offset, limit, id, order } }) =>
        Effect.gen(function* listSkills() {
          const db = yield* Database;

          const skills = yield* db.query.skillTable
            .findMany({
              where: { id: id ? { in: [id].flat() } : EmptyFilter },
              orderBy: { id: order },
              offset,
              limit,
            })
            .pipe(Effect.orDie);

          return { items: skills.map(toResponse) };
        })
      )
      .handle("info", ({ params: { skillId } }) =>
        Effect.gen(function* getSkill() {
          const skill = yield* findSkill(skillId);

          if (!skill) {
            return yield* new SkillNotFound();
          }

          return toResponse(skill);
        })
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* createSkill() {
          const db = yield* Database;
          const user = yield* CurrentUser;

          const [skill] = yield* db
            .insert(skillTable)
            .values({ ...payload, authorId: user.id })
            .returning()
            .pipe(Effect.orDie);

          return toResponse(skill!);
        })
      )
      .handle("update", ({ params: { skillId }, payload }) =>
        Effect.gen(function* updateSkill() {
          const db = yield* Database;
          const current = yield* requireWritableSkill(skillId);

          if (current.deletedAt) {
            return yield* new SkillDeleted();
          }

          if (!hasAnyChange(payload)) {
            return toResponse(current);
          }

          const [skill] = yield* db
            .update(skillTable)
            .set(payload)
            .where(eq(skillTable.id, skillId))
            .returning()
            .pipe(Effect.orDie);

          return toResponse(skill!);
        })
      )
      .handle("delete", ({ params: { skillId } }) =>
        Effect.gen(function* deleteSkill() {
          const db = yield* Database;
          const skill = yield* findSkill(skillId);

          if (!skill) {
            return;
          }

          yield* requireAuthor(skill);
          yield* db
            .update(skillTable)
            .set({ deletedAt: clock.now })
            .where(
              and(eq(skillTable.id, skillId), isNull(skillTable.deletedAt))
            )
            .pipe(Effect.orDie);
        })
      )
      .handle("restore", ({ params: { skillId } }) =>
        Effect.gen(function* restoreSkill() {
          const db = yield* Database;
          yield* requireWritableSkill(skillId);

          const [skill] = yield* db
            .update(skillTable)
            .set({ deletedAt: null })
            .where(eq(skillTable.id, skillId))
            .returning()
            .pipe(Effect.orDie);

          return toResponse(skill!);
        })
      );
  })
);
