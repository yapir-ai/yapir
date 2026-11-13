import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import { Page } from "@web/components/ui/page";
import { errorDetail } from "@web/lib/errors";
import { TriangleAlert } from "lucide-react";

export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <Page>
      <Empty variant="outline">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>This page did not load</EmptyTitle>
          <EmptyDescription>
            {error instanceof Error
              ? errorDetail(error)
              : "An unexpected error occurred."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            onClick={() => {
              void router.invalidate();
            }}
          >
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    </Page>
  );
}
