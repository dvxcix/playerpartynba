export const ALT_PLAYER_MARKETS = [
  "player_points_alternate",
  "player_rebounds_alternate",
  "player_assists_alternate",
  "player_blocks_alternate",
  "player_steals_alternate",
  "player_turnovers_alternate",
  "player_threes_alternate",
  "player_points_assists_alternate",
  "player_points_rebounds_alternate",
  "player_rebounds_assists_alternate",
  "player_points_rebounds_assists_alternate"
] as const;

export type AltPlayerMarket = typeof ALT_PLAYER_MARKETS[number];
