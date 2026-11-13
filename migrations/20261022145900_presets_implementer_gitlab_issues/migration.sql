UPDATE "preset" SET
  "triggers" = "triggers" || $seed$[
  {
    "type": "gitlab.issue.open",
    "expression": "event.object_attributes.labels.exists(label, label.title == \"yapir\")"
  }
]$seed$::jsonb,
  "capabilities" = "capabilities" || $seed$[
  {
    "name": "gitlab.issues.assign",
    "unscoped": false
  }
]$seed$::jsonb,
  "prompt" = replace("prompt", $seed$2. Acknowledge the issue in a short comment.$seed$, $seed$2. Assign the issue to yourself when your tools allow it, and acknowledge it in a short comment.$seed$)
WHERE "id" = $seed$01a14015-0004-71f7-848b-c4015eaf3449$seed$;
