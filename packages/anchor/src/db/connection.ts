// In-memory storage for prototype - swap to better-sqlite3 for production

export interface CoopRow {
  id: string;
  name: string;
  description: string | null;
  share_code: string;
  created_at: string;
}

export interface MemberRow {
  id: string;
  coop_id: string;
  display_name: string;
  role: "admin" | "member" | "observer";
  joined_at: string;
}

export interface FeedItemRow {
  id: string;
  coop_id: string;
  type: string;
  content: string;
  created_at: string;
}

const coops = new Map<string, CoopRow>();
const members = new Map<string, MemberRow[]>();
const feedItems = new Map<string, FeedItemRow[]>();

type DbParam = string | null;
type DbGetResult = CoopRow | MemberRow | undefined;
type DbAllResult = MemberRow[] | FeedItemRow[];
type DbRunResult = { changes: number };

export const db = {
  prepare(sql: string) {
    return {
      get(...params: DbParam[]): DbGetResult {
        const [value] = params;
        if (sql.includes("FROM coops") && sql.includes("share_code")) {
          return Array.from(coops.values()).find((c) => c.share_code === value);
        }
        if (sql.includes("FROM coops")) {
          return coops.get(value);
        }
        if (sql.includes("FROM members")) {
          const coopId = params[0];
          const displayName = params[1];
          const coopMembers = members.get(coopId) || [];
          return coopMembers.find((m) => m.display_name === displayName);
        }
        return undefined;
      },
      all(...params: DbParam[]): DbAllResult {
        const [coopId] = params;
        if (sql.includes("FROM members")) {
          return members.get(coopId) || [];
        }
        if (sql.includes("FROM feed_items")) {
          return (feedItems.get(coopId) || []).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
        }
        return [];
      },
      run(...params: DbParam[]): DbRunResult {
        if (sql.includes("INSERT INTO coops")) {
          const [id, name, description, share_code, created_at] = params as [
            string,
            string,
            string | null,
            string,
            string,
          ];
          coops.set(id, { id, name, description, share_code, created_at });
        }
        if (sql.includes("INSERT INTO members")) {
          const [id, coop_id, display_name, role, joined_at] = params as [
            string,
            string,
            string,
            "admin" | "member" | "observer",
            string,
          ];
          const coopMembers = members.get(coop_id) || [];
          coopMembers.push({ id, coop_id, display_name, role, joined_at });
          members.set(coop_id, coopMembers);
        }
        if (sql.includes("INSERT INTO feed_items")) {
          const [id, coop_id, type, content, created_at] = params as [
            string,
            string,
            string,
            string,
            string,
          ];
          const items = feedItems.get(coop_id) || [];
          items.push({ id, coop_id, type, content, created_at });
          feedItems.set(coop_id, items);
        }
        return { changes: 1 };
      },
    };
  },
};
