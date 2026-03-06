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
PHI,MIL,CHI,CLE,BOS,MEM,ATL,MIA,CHA,UTA,SAC,NYK,LAL,ORL,
DAL,BKN,DEN,IND,NOP,DET,TOR,HOU,SAS,PHX,OKC,MIN,POR,GSW,WAS,LAC
};

function normalizeTeamKey(team: string){
return team.toUpperCase().trim();
}

function GameLogos({game}:{game:string}){

const [awayRaw,homeRaw] = game.split('@');

const AwayLogo = TEAM_LOGOS[normalizeTeamKey(awayRaw)];
const HomeLogo = TEAM_LOGOS[normalizeTeamKey(homeRaw)];

return(
<div style={{display:'flex',alignItems:'center',gap:6}}>
{AwayLogo && <Image src={AwayLogo} alt={awayRaw} width={22} height={22}/>}
<span>@</span>
{HomeLogo && <Image src={HomeLogo} alt={homeRaw} width={22} height={22}/>}
</div>
);

}

/* ========================= */

type PPPRow = {
game:string
player:string
market_name:string
line:number
bookmaker_title:string
over_price:number
under_price:number
}

/* =========================
SPIKE ENGINE
========================= */

const SIGNAL_MIN = -130
const SIGNAL_MAX = -105
const LADDER_GAP = 40

function detectSpikes(rows:PPPRow[]){

const signals:any[] = []

const playerMap = new Map<string,PPPRow[]>()

rows.forEach(r=>{
const key = `${r.player}_${r.market_name}`
if(!playerMap.has(key)) playerMap.set(key,[])
playerMap.get(key)!.push(r)
})

playerMap.forEach((lines,key)=>{

lines.sort((a,b)=>a.line-b.line)

const cluster = lines.filter(l=>{
return l.over_price>=SIGNAL_MIN && l.over_price<=SIGNAL_MAX
})

if(cluster.length>=2){

signals.push({
type:'cluster',
row:cluster[0],
note:`${cluster[0].line}+`
})

return

}

for(let i=0;i<lines.length-1;i++){

const a = lines[i]
const b = lines[i+1]

if(
a.over_price>=SIGNAL_MIN &&
a.over_price<=SIGNAL_MAX &&
Math.abs(a.over_price-b.over_price)>=LADDER_GAP
){

signals.push({
type:'ladder',
row:a,
note:`${a.line}+`
})

return

}

}

})

/* MARKET DIVERGENCE */

const playerMarkets = new Map<string,PPPRow[]>()

rows.forEach(r=>{
if(!playerMarkets.has(r.player)) playerMarkets.set(r.player,[])
playerMarkets.get(r.player)!.push(r)
})

playerMarkets.forEach(list=>{

const spike = list.find(l=>l.over_price>=SIGNAL_MIN && l.over_price<=SIGNAL_MAX)

if(!spike) return

const alt = list.find(l=>l.over_price>=100)

if(alt){

signals.push({
type:'divergence',
row:alt,
note:`${alt.line}+`
})

}

})

return signals

}

/* ========================= */

export default function ClientHeader(){

const [showPPP,setShowPPP] = useState(false)
const [pppRows,setPppRows] = useState<any[]>([])
const [loadingPPP,setLoadingPPP] = useState(false)

const {
setPppKeys,
pppCount,
setPppCount,
scrollToKey
} = usePPP()

const modalRef = useRef<HTMLDivElement|null>(null)

const dragOffset = useRef({x:0,y:0})

const [position,setPosition] = useState<{x:number,y:number}|null>(null)

const onMouseMove = (e:MouseEvent)=>{

setPosition({
x:e.clientX-dragOffset.current.x,
y:e.clientY-dragOffset.current.y
})

}

const onMouseUp = ()=>{

window.removeEventListener('mousemove',onMouseMove)
window.removeEventListener('mouseup',onMouseUp)

}

const onMouseDown = (e:React.MouseEvent)=>{

if(!modalRef.current) return

const rect = modalRef.current.getBoundingClientRect()

dragOffset.current={
x:e.clientX-rect.left,
y:e.clientY-rect.top
}

window.addEventListener('mousemove',onMouseMove)
window.addEventListener('mouseup',onMouseUp)

}

/* =========================
FETCH SPIKES
========================= */

useEffect(()=>{

if(!showPPP) return

setLoadingPPP(true)

fetch('/api/odds/latest')
.then(r=>r.json())
.then(data=>{

const rows = data.rows||[]

const signals = detectSpikes(rows)

setPppRows(signals)

setPppCount(signals.length)

setPppKeys(new Set(signals.map((s:any)=>
`${s.row.game}|${s.row.player}|${s.row.market_name}|${s.row.line}|${s.row.bookmaker_title}`
)))

})
.finally(()=>setLoadingPPP(false))

},[showPPP,setPppKeys,setPppCount])

return(

<>

<header className="header">

<div style={{display:'flex',alignItems:'center',gap:12}}>

<Image src={PPicon} alt="PlayerParty" width={36} height={36}/>

<div>
<div className="title">NBA Dashboard | PlayerParty</div>
<div className="subtitle">Real-time alt prop scanner</div>
</div>

</div>

<div style={{display:'flex',gap:10}}>

<button
className="pill"
style={{
background:'linear-gradient(135deg,#f5c542,#d4a017)',
color:'#000',
fontWeight:700,
display:'inline-flex',
alignItems:'center',
gap:8
}}
onClick={()=>setShowPPP(true)}
>

<span>👑 PPP</span>

<span style={{
background:'rgba(0,0,0,.15)',
padding:'2px 8px',
borderRadius:999,
fontWeight:800
}}>
{pppCount}
</span>

</button>

</div>

</header>

{showPPP && (

<div
style={{
position:'fixed',
inset:0,
background:'rgba(0,0,0,.55)',
zIndex:1000
}}
onClick={()=>setShowPPP(false)}
>

<div
ref={modalRef}
className="panel"
onClick={e=>e.stopPropagation()}
style={{
position:'absolute',
top:position?position.y:'10%',
left:position?position.x:'10%',
minWidth:520,
maxHeight:'85vh',
resize:'both',
overflow:'auto'
}}
>

<div
className="panelHeader"
style={{cursor:'move'}}
onMouseDown={onMouseDown}
>

<div className="panelTitle">👑 PlayerPartyPicks</div>

</div>

<button
onClick={()=>setShowPPP(false)}
style={{
position:'absolute',
top:10,
right:12,
fontSize:18,
background:'transparent',
border:'none'
}}
>

✕

</button>

<div className="panelBody">

{loadingPPP && <div>Loading…</div>}

{!loadingPPP && pppRows.length===0 && <div>No PlayerPartyPicks found.</div>}

{!loadingPPP && pppRows.length>0 && (

<table className="table">

<thead>

<tr>
<th>Game</th>
<th>Player</th>
<th>Market</th>
<th>Spike</th>
<th>Type</th>
</tr>

</thead>

<tbody>

{pppRows.map((s:any,i:number)=>{

const r = s.row

const key = `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`

return(

<tr
key={i}
style={{cursor:'pointer'}}
onClick={()=>scrollToKey(key)}
>

<td><GameLogos game={r.game}/></td>
<td>{r.player}</td>
<td>{r.market_name}</td>
<td>{s.note}</td>
<td>{s.type}</td>

</tr>

)

})}

</tbody>

</table>

)}

</div>

</div>

</div>

)}

</>

)

}
