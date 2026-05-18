export function getReadingTime(content: string): string {
  const chineseChars = (content.match(/[一-龥]/g) ?? []).length;
  const otherWords = content
    .replace(/[一-龥]/g, "")
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;
  const minutes = Math.ceil(chineseChars / 400 + otherWords / 200);
  return `${minutes} min read`;
}
