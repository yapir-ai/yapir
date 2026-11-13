UPDATE "preset" SET "capabilities" = "capabilities" || $seed$[
  {
    "name": "github.issues.read",
    "unscoped": true
  },
  {
    "name": "gitlab.issues.read",
    "unscoped": true
  }
]$seed$::jsonb
WHERE "id" IN ($seed$01a14014-ffff-77ca-8e7a-c72a01d58074$seed$, $seed$01a14015-0004-71f7-848b-c4015eaf3449$seed$);--> statement-breakpoint
UPDATE "preset" SET "prompt" = replace("prompt", $seed$its diff and its existing reviews$seed$, $seed$its diff, its existing reviews and the issues it references$seed$)
WHERE "id" = $seed$01a14014-ffff-77ca-8e7a-c72a01d58074$seed$;
