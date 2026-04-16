import type { RawUser } from "./types";

export class UserStore {
  private map = new Map<string, RawUser>();

  add(users: RawUser[]): void {
    for (const u of users) {
      if (!this.map.has(u.username)) {
        this.map.set(u.username, u);
      } else {
        // Update bio if we got more info
        const existing = this.map.get(u.username)!;
        if (!existing.bio && u.bio) {
          this.map.set(u.username, { ...existing, bio: u.bio });
        }
      }
    }
  }

  size(): number {
    return this.map.size;
  }

  values(): RawUser[] {
    return Array.from(this.map.values());
  }
}
