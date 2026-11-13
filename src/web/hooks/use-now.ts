import { useEffect, useState } from "react";

export function useNow(live: boolean) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!live) {
      return;
    }

    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [live]);

  return now;
}
