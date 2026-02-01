import { ColumnDef } from "@tanstack/react-table";

export type OddsRow = {
  game: string;
  player: string;
  market: string;
  bookmaker: string;
  line: number;
  over: number;
  under: number;
  commence_time: string;
};

export const columns: ColumnDef<OddsRow>[] = [
  { accessorKey: "game", header: "Game" },
  { accessorKey: "player", header: "Player" },
  { accessorKey: "market", header: "Market" },
  { accessorKey: "bookmaker", header: "Book" },
  {
    accessorKey: "line",
    header: "Line",
    sortingFn: "basic"
  },
  {
    accessorKey: "over",
    header: "Over",
    sortingFn: "basic"
  },
  {
    accessorKey: "under",
    header: "Under",
    sortingFn: "basic"
  }
];
