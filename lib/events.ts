export function isSameUTCDay(dateA: string, dateB: Date) {
  const dA = new Date(dateA);
  return (
    dA.getUTCFullYear() === dateB.getUTCFullYear() &&
    dA.getUTCMonth() === dateB.getUTCMonth() &&
    dA.getUTCDate() === dateB.getUTCDate()
  );
}
