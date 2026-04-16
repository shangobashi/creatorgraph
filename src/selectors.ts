export const USER_CELL_SELECTORS = [
  '[data-testid="UserCell"]',
  "article"
];

export const PROFILE_LINK_SELECTOR = 'a[href^="/"]';

export const BIO_SELECTORS = [
  '[data-testid="UserCell"] [dir="auto"]',
  '[data-testid="UserCell"] [data-testid="userBio"]',
  '[data-testid="UserCell"] > div > div > div:nth-child(2) span[dir="auto"]'
];

export const SKIP_USERNAMES = new Set([
  "i", "settings", "home", "explore", "notifications",
  "messages", "compose", "search", "lists", "bookmarks",
  "following", "followers", "verified_followers"
]);

export function isProbablyHandle(s: string): boolean {
  return /^[A-Za-z0-9_]{1,15}$/.test(s);
}
