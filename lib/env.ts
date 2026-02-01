function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export const env = {
  SUPABASE_URL: must('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: must('SUPABASE_SERVICE_ROLE_KEY'),
  ODDS_API_KEY: must('ODDS_API_KEY'),
  CRON_SECRET: must('CRON_SECRET'),

  // Optional tuning
  ODDS_API_REGIONS: process.env.ODDS_API_REGIONS ?? 'us',
  ODDS_API_BOOKMAKERS: process.env.ODDS_API_BOOKMAKERS ?? '',
  EVENTS_LOOKAHEAD_HOURS: Number(process.env.EVENTS_LOOKAHEAD_HOURS ?? '48'),
  MAX_EVENTS_PER_RUN: Number(process.env.MAX_EVENTS_PER_RUN ?? '30')
};
