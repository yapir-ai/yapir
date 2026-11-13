import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

const iconVariants = cva(
  "bg-muted inline-flex shrink-0 items-center justify-center rounded-md",
  {
    variants: {
      size: {
        xs: "size-5 p-0.5",
        default: "size-10 p-2",
      },
    },
    defaultVariants: { size: "default" },
  }
);

// models.dev serves a generic logo for providers it does not know.
export function ModelProviderIcon({
  catalogId,
  size,
}: {
  catalogId: string;
  size?: VariantProps<typeof iconVariants>["size"];
}) {
  return (
    <span className={iconVariants({ size })}>
      <img
        src={`https://models.dev/logos/${catalogId}.svg`}
        alt=""
        className="size-full"
      />
    </span>
  );
}
