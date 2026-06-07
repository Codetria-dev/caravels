const STORAGE_KEY = 'caravels_bookmarks';

export function getBookmarks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addBookmark(entry) {
  const bookmarks = getBookmarks();
  if (bookmarks.some((b) => b.name === entry.name)) return bookmarks;
  const next = [...bookmarks, entry];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeBookmark(name) {
  const bookmarks = getBookmarks().filter((b) => b.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  return bookmarks;
}

export function isBookmarked(name) {
  return getBookmarks().some((b) => b.name === name);
}
