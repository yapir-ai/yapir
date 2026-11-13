import { z } from "zod";

export const ProjectRepositoryCreateRequest = z.strictObject({
  repositoryId: z
    .uuid()
    .describe(
      "From the repository list. All the repositories of a project belong to one Git host"
    ),
});

export type ProjectRepositoryCreateRequestDto = z.infer<
  typeof ProjectRepositoryCreateRequest
>;
