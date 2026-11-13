import type { UserSelect } from "@server/lib/db/schema";

export const toResponseDto = (user: UserSelect) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
});
