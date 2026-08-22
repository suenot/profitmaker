import type { ModuleListing } from '../shared/types';

export interface ListingRing {
  add(listing: ModuleListing): boolean;
  recent(limit?: number): ModuleListing[];
  has(id: number): boolean;
  size(): number;
}

/** New-to-old in-memory list of recent listings with id dedup and size cap. */
export function createListingRing(max = 100): ListingRing {
  const items: ModuleListing[] = [];
  const ids = new Set<number>();
  return {
    add(listing) {
      if (ids.has(listing.id)) return false;
      items.unshift(listing);
      ids.add(listing.id);
      if (items.length > max) {
        const evicted = items.pop();
        if (evicted) ids.delete(evicted.id);
      }
      return true;
    },
    recent(limit) {
      return limit == null ? [...items] : items.slice(0, limit);
    },
    has: (id) => ids.has(id),
    size: () => items.length,
  };
}
