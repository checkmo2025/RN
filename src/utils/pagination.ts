type CursorPage<Item> = {
  items: Item[];
  hasNext: boolean;
  nextCursor?: number | null | undefined;
};

type CollectOptions<Item> = {
  fetchPage: (cursor: number | undefined) => Promise<CursorPage<Item>>;
  dedupeId: (item: Item) => string | number;
  maxPages?: number;
};

export async function collectAllCursorPages<Item>(
  options: CollectOptions<Item>,
): Promise<Item[]> {
  const { fetchPage, dedupeId, maxPages = 100 } = options;
  const all: Item[] = [];
  const seen = new Set<string | number>();
  const visitedCursors = new Set<number>();
  let cursor: number | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const response = await fetchPage(cursor);

    response.items.forEach((item) => {
      const key = dedupeId(item);
      if (seen.has(key)) return;
      seen.add(key);
      all.push(item);
    });

    if (!response.hasNext || typeof response.nextCursor !== 'number') break;
    if (visitedCursors.has(response.nextCursor)) break;

    visitedCursors.add(response.nextCursor);
    cursor = response.nextCursor;
  }

  return all;
}
