import { useEffect, useState } from "react";
import { z } from "zod";

const recentLimit = 5;
const recentProjectsKey = "yapir-recent-projects";

export function readRecentIds(storageKey: string) {
  return z
    .array(z.string())
    .parse(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
}

export function addRecentId(ids: string[], id: string) {
  return [id, ...ids.filter((recentId) => recentId !== id)].slice(
    0,
    recentLimit
  );
}

export function useRecentProjectIds(projectId: string | undefined) {
  const [recentIds, setRecentIds] = useState(() =>
    readRecentIds(recentProjectsKey)
  );

  if (projectId && recentIds[0] !== projectId) {
    setRecentIds(addRecentId(recentIds, projectId));
  }

  useEffect(() => {
    localStorage.setItem(recentProjectsKey, JSON.stringify(recentIds));
  }, [recentIds]);

  return recentIds;
}
