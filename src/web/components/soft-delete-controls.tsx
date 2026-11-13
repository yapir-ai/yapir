import type { Collection } from "@tanstack/react-db";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { DangerZone, DangerZoneItem } from "@web/components/ui/danger-zone";
import type { SoftDeleteMetadata } from "@web/lib/db/collection";
import { toastFailure } from "@web/lib/errors";
import { useState, useTransition } from "react";

export function DeletedBadge({ deletedAt }: { deletedAt: string | null }) {
  return deletedAt && <Badge variant="secondary">Deleted</Badge>;
}

export function useSoftDelete<
  T extends { deletedAt: string | null },
  TKey extends string | number,
>(
  collection: Collection<T, TKey>,
  id: TKey,
  afterDelete: () => Promise<void>,
  { serverChangesOnDelete }: { serverChangesOnDelete?: Partial<T> } = {}
) {
  const [isPending, startMutation] = useTransition();

  function remove() {
    startMutation(async () => {
      void toastFailure(
        collection.update(
          id,
          { metadata: { intent: "delete" } satisfies SoftDeleteMetadata },
          (draft) => {
            Object.assign(draft, serverChangesOnDelete);
            draft.deletedAt = new Date().toISOString();
          }
        )
      );
      await afterDelete();
    });
  }

  function restore() {
    startMutation(async () => {
      await toastFailure(
        collection.update(
          id,
          { metadata: { intent: "restore" } satisfies SoftDeleteMetadata },
          (draft) => {
            draft.deletedAt = null;
          }
        )
      );
    });
  }

  return { isPending, remove, restore };
}

export function SoftDeleteZone({
  resource,
  consequence,
  deletedAt,
  canWrite,
  isPending,
  onDelete,
  onRestore,
}: {
  resource: string;
  consequence: string;
  deletedAt: string | null;
  canWrite: boolean;
  isPending: boolean;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!canWrite) {
    return null;
  }

  return (
    <DangerZone>
      {deletedAt ? (
        <DangerZoneItem
          title={`Restore ${resource}`}
          description="Restore it to edit it."
          action={
            <Button variant="outline" disabled={isPending} onClick={onRestore}>
              Restore {resource}
            </Button>
          }
        />
      ) : (
        <DangerZoneItem
          title={`Delete ${resource}`}
          description={consequence}
          action={
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (confirming) {
                  onDelete();
                }

                setConfirming(!confirming);
              }}
              onBlur={() => {
                setConfirming(false);
              }}
            >
              {confirming ? "Confirm deletion?" : `Delete ${resource}`}
            </Button>
          }
        />
      )}
    </DangerZone>
  );
}
