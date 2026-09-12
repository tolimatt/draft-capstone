export function percentage(part, total) {
  return total > 0 ? Math.round((Number(part || 0) / Number(total)) * 100) : 0;
}
