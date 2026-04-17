import type { RawUser } from "./types";
import { PROFILE_LINK_SELECTOR, SKIP_USERNAMES, USER_CELL_SELECTORS, isProbablyHandle } from "./selectors";

function cleanText(s?: string | null): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function extractUsernameFromHref(href: string): string | null {
  const m = href.match(/^\/([^/?]+)(?:\?.*)?$/);
  return m ? m[1] : null;
}

function pickDisplayName(root: Element): string {
  const spans = Array.from(root.querySelectorAll('div[dir="ltr"] span, span'));
  const texts = spans.map((s) => cleanText(s.textContent)).filter(Boolean);
  const nonHandle = texts.find((t) => !t.startsWith("@") && t.length >= 2);
  if (nonHandle) return nonHandle;
  const first = texts[0] || "";
  return first.startsWith("@") ? first.slice(1) : first;
}

function extractBio(root: Element, username: string): string {
  // Try to find bio text — X bios are typically in short divs/spans
  // Narrow selector: only leaf text containers, skip deeply nested structures
  const allSpans = Array.from(root.querySelectorAll('div[lang] span, div[dir="auto"] span, span[lang]'));
  const candidates: string[] = [];

  for (const el of allSpans) {
    const text = cleanText(el.textContent);
    if (
      text.length > 10 &&
      text.length < 300 &&
      !text.startsWith("@") &&
      !text.includes("Follow") &&
      !text.toLowerCase().includes(username.toLowerCase()) &&
      (el.children.length === 0 || el.children.length <= 3)
    ) {
      candidates.push(text);
    }
  }

  // Prefer medium-length text (likely a bio)
  const sorted = candidates.sort((a, b) => {
    const aDist = Math.abs(a.length - 80);
    const bDist = Math.abs(b.length - 80);
    return aDist - bDist;
  });

  return sorted[0] || "";
}

function findProfile(root: Element): { username: string | null; href: string | null } {
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>(PROFILE_LINK_SELECTOR));
  for (const a of links) {
    const href = a.getAttribute("href") || "";
    const u = extractUsernameFromHref(href);
    if (!u) continue;
    if (href.includes("/status/")) continue;
    if (SKIP_USERNAMES.has(u)) continue;
    if (!isProbablyHandle(u)) continue;
    return { username: u, href };
  }
  return { username: null, href: null };
}

function getVisibleCards(): Element[] {
  for (const sel of USER_CELL_SELECTORS) {
    const nodes = Array.from(document.querySelectorAll(sel));
    if (nodes.length > 0) return nodes;
  }
  return [];
}

export function parseVisibleUsers(): RawUser[] {
  const cards = getVisibleCards();
  const out: RawUser[] = [];

  for (const card of cards) {
    const { username, href } = findProfile(card);
    if (!username) continue;

    const displayName = pickDisplayName(card);
    const profileUrl = new URL(href || `/${username}`, location.origin).toString();
    const bio = extractBio(card, username);

    out.push({ username, displayName, profileUrl, bio });
  }

  return out;
}
