export const ALT_NBA_PLAYER_PROP_MARKETS = [
  'player_points_alternate',
  'player_rebounds_alternate',
  'player_assists_alternate',
  'player_blocks_alternate',
  'player_steals_alternate',
  'player_turnovers_alternate',
  'player_threes_alternate',
  'player_points_assists_alternate',
  'player_points_rebounds_alternate',
  'player_rebounds_assists_alternate',
  'player_points_rebounds_assists_alternate',
] as const;

export type AltMarketKey = (typeof ALT_NBA_PLAYER_PROP_MARKETS)[number];

export const ALT_MARKET_LABELS: Record<AltMarketKey, string> = {
  player_points_alternate: 'Alternate Points (O/U)',
  player_rebounds_alternate: 'Alternate Rebounds (O/U)',
  player_assists_alternate: 'Alternate Assists (O/U)',
  player_blocks_alternate: 'Alternate Blocks (O/U)',
  player_steals_alternate: 'Alternate Steals (O/U)',
  player_turnovers_alternate: 'Alternate Turnovers (O/U)',
  player_threes_alternate: 'Alternate Threes (O/U)',
  player_points_assists_alternate: 'Alternate Points + Assists (O/U)',
  player_points_rebounds_alternate: 'Alternate Points + Rebounds (O/U)',
  player_rebounds_assists_alternate: 'Alternate Rebounds + Assists (O/U)',
  player_points_rebounds_assists_alternate: 'Alternate Points + Rebounds + Assists (O/U)',
};
