import { Avatar, AvatarFallback, AvatarImage } from "@web/components/ui/avatar";
import { avatarColors } from "@web/lib/avatars/avatar-colors";
import BoringAvatar from "boring-avatars";
import type { ComponentProps } from "react";

export function UserAvatar({
  seed,
  image,
  ...props
}: ComponentProps<typeof Avatar> & { seed: string; image?: string | null }) {
  return (
    <Avatar {...props}>
      <AvatarImage src={image ?? undefined} alt="" />
      <AvatarFallback>
        <BoringAvatar
          name={seed}
          className="size-full!"
          aria-hidden="true"
          colors={avatarColors}
        />
      </AvatarFallback>
    </Avatar>
  );
}
