'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import PPicon from '@/lib/PPicon.png';
import { usePPP } from '@/components/PPPContext';

/* =========================
TEAM LOGOS
========================= */

import PHI from '@/lib/nbateams/76ers.png';
import MIL from '@/lib/nbateams/BUCKS.png';
import CHI from '@/lib/nbateams/BULLS.png';
import CLE from '@/lib/nbateams/CAVS.png';
import BOS from '@/lib/nbateams/CELTICS.png';
import LAC from '@/lib/nbateams/CLIPPERS.png';
import MEM from '@/lib/nbateams/GRIZZLIES.png';
import ATL from '@/lib/nbateams/HAWKS.png';
import MIA from '@/lib/nbateams/HEAT.gif';
import CHA from '@/lib/nbateams/HORNETS.png';
import UTA from '@/lib/nbateams/JAZZ.png';
import SAC from '@/lib/nbateams/KINGS.png';
import NYK from '@/lib/nbateams/KNICKS.png';
import LAL from '@/lib/nbateams/LAKERS.png';
import ORL from '@/lib/nbateams/MAGIC.png';
import DAL from '@/lib/nbateams/MAVERICKS.png';
import BKN from '@/lib/nbateams/NETS.png';
import DEN from '@/lib/nbateams/NUGGETS.png';
import IND from '@/lib/nbateams/PACERS.png';
import NOP from '@/lib/nbateams/PELICANS.png';
import DET from '@/lib/nbateams/PISTONS.png';
import TOR from '@/lib/nbateams/RAPTORS.png';
import HOU from '@/lib/nbateams/ROCKETS.png';
import SAS from '@/lib/nbateams/SPURS.gif';
import PHX from '@/lib/nbateams/SUNS.png';
import OKC from '@/lib/nbateams/THUNDER.png';
import MIN from '@/lib/nbateams/TIMBERWOLVES.png';
import POR from '@/lib/nbateams/TRAILBLAZERS.png';
import GSW from '@/lib/nbateams/WARRIORS.png';
import WAS from '@/lib/nbateams/WIZARDS.png';

const TEAM_LOGOS: Record<string, any> = {
  PHI, MIL, CHI, CLE, BOS, MEM, ATL, MIA, CHA, UTA, SAC, NYK, LAL, ORL,
  DAL, BKN, DEN, IND, NOP, DET, TOR, HOU, SAS, PHX, OKC, MIN, POR, GSW, WAS,
  LAC,
  'LOS ANGELES CLIPPERS': LAC,
  'LA CLIPPERS': LAC,
};

function normalizeTeamKey(team: string) {
  return team.toUpperCase().trim();
}

function GameLogos({ game }: { game: string }) {
  const [awayRaw, homeRaw] = game.split('@');
  const AwayLogo = TEAM_LOGOS[normalizeTeamKey(awayRaw)];
  const HomeLogo = TEAM_LOGOS[normalizeTeamKey(homeRaw)];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {AwayLogo && <Image src={AwayLogo} alt={awayRaw} width={22} height={22} />}
      <span>@</span>
      {HomeLogo && <Image src={HomeLogo} alt={homeRaw} width={22} height={22} />}
    </div>
  );
}

/* =========================
TYPES
========================= */

type PPPRow = {
  game: string;
  player: string;
  market_name: string;
  line: number;
  bookmaker_title: string;
  over_price: number | null;
  under_price?: number | null;
};

type PPPPick = {
  game: string;
  player: string;
  spikeMarket: string;
  spikeLine: number;
  spikePrice: number | null;
  spikeKey: string;
  suggestedPlay: string;
  suggestedPrice: number | null;
  suggestedKey: string;
};

/* =========================
HELPERS
========================= */

function rowKey(r: PPPRow) {
  return `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isFanDuel(r: PPPRow) {
  return r.bookmaker_title === 'FanDuel';
}

function isAllowedSpikeMarket(market: string) {
  return ['Alt Points', 'Alt Rebounds', 'Alt Assists', 'Alt Threes'].includes(market);
}

function isSpikeRow(r: PPPRow) {
  if (!isFanDuel(r)) return false;
  if (!isAllowedSpikeMarket(r.market_name)) return false;
  if (!isFiniteNumber(r.over_price)) return false;

  return r.over_price >= -118 && r.over_price <= -110;
}

function marketShort(market: string) {
  if (market === 'Alt Points') return 'PTS';
  if (market === 'Alt Rebounds') return 'REB';
  if (market === 'Alt Assists') return 'AST';
  if (market === 'Alt Threes') return '3PM';
  return market;
}

function displayAltLine(line: number) {
  return `${Math.ceil(line)}+`;
}

function preferredTargetMarkets(spikeMarket: string) {
  if (spikeMarket === 'Alt Points') return ['Alt Assists', 'Alt Threes', 'Alt Rebounds'];
  if (spikeMarket === 'Alt Assists') return ['Alt Points', 'Alt Threes'];
  if (spikeMarket === 'Alt Rebounds') return ['Alt Points', 'Alt Threes'];
  if (spikeMarket === 'Alt Threes') return ['Alt Points', 'Alt Assists'];
  return [];
}

function realisticTargetBand(targetMarket: string) {
  if (targetMarket === 'Alt Assists') return { min: +100, max: +220, ideal: +140 };
  if (targetMarket === 'Alt Threes') return { min: +100, max: +230, ideal: +145 };
  if (targetMarket === 'Alt Points') return { min: +100, max: +240, ideal: +150 };
  if (targetMarket === 'Alt Rebounds') return { min: +100, max: +220, ideal: +140 };
  return { min: +100, max: +250, ideal: +145 };
}

function fallbackBand(targetMarket: string) {
  if (targetMarket === 'Alt Assists') return { min: -105, max: +320, ideal: +140 };
  if (targetMarket === 'Alt Threes') return { min: -105, max: +320, ideal: +145 };
  if (targetMarket === 'Alt Points') return { min: -105, max: +350, ideal: +150 };
  if (targetMarket === 'Alt Rebounds') return { min: -105, max: +300, ideal: +140 };
  return { min: -105, max: +350, ideal: +145 };
}

function chooseBestTarget(rows: PPPRow[], targetMarket: string): PPPRow | null {
  const band = realisticTargetBand(targetMarket);
  const fallback = fallbackBand(targetMarket);

  const candidates = rows.filter(
    (r) =>
      isFanDuel(r) &&
      r.market_name === targetMarket &&
      isFiniteNumber(r.over_price)
  );

  if (candidates.length === 0) return null;

  const inBand = candidates
    .filter((r) => isFiniteNumber(r.over_price) && r.over_price >= band.min && r.over_price <= band.max)
    .sort((a, b) => {
      const aDiff = Math.abs((a.over_price as number) - band.ideal);
      const bDiff = Math.abs((b.over_price as number) - band.ideal);
      if (aDiff !== bDiff) return aDiff - bDiff;
      return a.line - b.line;
    });

  if (inBand.length > 0) return inBand[0];

  const inFallback = candidates
    .filter(
      (r) =>
        isFiniteNumber(r.over_price) &&
        r.over_price >= fallback.min &&
        r.over_price <= fallback.max
    )
    .sort((a, b) => {
      const aDiff = Math.abs((a.over_price as number) - fallback.ideal);
      const bDiff = Math.abs((b.over_price as number) - fallback.ideal);
      if (aDiff !== bDiff) return aDiff - bDiff;
      return a.line - b.line;
    });

  return inFallback[0] ?? null;
}

function chooseBestSpike(rows: PPPRow[]): PPPRow | null {
  const spikes = rows.filter(isSpikeRow);

  if (spikes.length === 0) return null;

  const marketPriority: Record<string, number> = {
    'Alt Points': 1,
    'Alt Assists': 2,
    'Alt Rebounds': 3,
    'Alt Threes': 4,
  };

  return [...spikes].sort((a, b) => {
    const aDiff = Math.abs((a.over_price as number) - -114);
    const bDiff = Math.abs((b.over_price as number) - -114);
    if (aDiff !== bDiff) return aDiff - bDiff;

    const aPriority = marketPriority[a.market_name] ?? 99;
    const bPriority = marketPriority[b.market_name] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;

    return a.line - b.line;
  })[0];
}

function buildSuggestedText(target: PPPRow | null) {
  if (!target) return 'No correlated alt found';
  return `${displayAltLine(target.line)} ${marketShort(target.market_name)}`;
}

function buildPPPPicks(rows: PPPRow[]): PPPPick[] {
  const fanDuelRows = rows.filter(isFanDuel);

  const groups = new Map<string, PPPRow[]>();

  for (const row of fanDuelRows) {
    const key = `${row.game}|${row.player}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const picks: PPPPick[] = [];

  for (const [groupKey, playerRows] of groups.entries()) {
    const spike = chooseBestSpike(playerRows);
    if (!spike) continue;

    const targetMarkets = preferredTargetMarkets(spike.market_name);

    let target: PPPRow | null = null;
    for (const targetMarket of targetMarkets) {
      target = chooseBestTarget(playerRows, targetMarket);
      if (target) break;
    }

    const [game, player] = groupKey.split('|');

    picks.push({
      game,
      player,
      spikeMarket: spike.market_name,
      spikeLine: spike.line,
      spikePrice: spike.over_price ?? null,
      spikeKey: rowKey(spike),
      suggestedPlay: buildSuggestedText(target),
      suggestedPrice: target?.over_price ?? null,
      suggestedKey: target ? rowKey(target) : rowKey(spike),
    });
  }

  return picks.sort((a, b) => a.game.localeCompare(b.game));
}

/* =========================
COMPONENT
========================= */

export default function ClientHeader() {
  const [showPPP, setShowPPP] = useState(false);
  const [pppRows, setPppRows] = useState<PPPPick[]>([]);
  const [loadingPPP, setLoadingPPP] = useState(false);

  const {
    setPppKeys,
    pppCount,
    setPppCount,
    scrollToKey,
  } = usePPP();

  const modalRef = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const onMouseMove = (e: MouseEvent) => {
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouse
