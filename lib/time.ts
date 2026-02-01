export function isWithinUserLocalToday(utcTime: string): boolean {
  const eventDate = new Date(utcTime);
  if (Number.isNaN(eventDate.getTime())) return false;

  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  return eventDate >= startOfToday && eventDate <= endOfToday;
}
