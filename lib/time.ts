export function isTodayInUserTimezone(utcTime: string): boolean {
  const eventDate = new Date(utcTime);
  const now = new Date();

  return (
    eventDate.getFullYear() === now.getFullYear() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getDate() === now.getDate()
  );
}
