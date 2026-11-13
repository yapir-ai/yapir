export function harnessInbox() {
  const unread = new Map<string, string>();
  let idle = Promise.withResolvers<undefined>();

  return {
    add: (id: string, text: string) => {
      unread.set(id, text);
    },
    read: (id: string) => {
      const text = unread.get(id);
      unread.delete(id);

      return text;
    },
    turnEnded: () => {
      if (unread.size === 0) {
        idle.resolve();
        idle = Promise.withResolvers();
      }
    },
    idle: async () => await idle.promise,
  };
}
