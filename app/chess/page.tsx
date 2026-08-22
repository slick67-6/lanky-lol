"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { ParticlesBackground } from "@/components/particles-background";
import { useTheme } from "@/lib/theme-context";

// ─── Types ───────────────────────────────────────────────────────────────────
type PieceType  = "p"|"r"|"n"|"b"|"q"|"k";
type PieceColor = "w"|"b";
interface Piece  { type: PieceType; color: PieceColor; }
type Square      = Piece | null;
type Board       = Square[][];
type MatchStatus = "idle"|"searching"|"playing"|"finished";
type BoardTheme  = "classic"|"slate"|"walnut"|"ice"|"obsidian";
 
type PromoChoice = "q"|"r"|"b"|"n";
type TimeControl = 1|5|10;
interface CastlingRights { wK:boolean; wQ:boolean; bK:boolean; bQ:boolean; }
interface SlideAnim {
  piece:Piece; fromX:number; fromY:number; toX:number; toY:number;
  sqW:number; sqH:number; dur:number; id:string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const GLYPHS: Record<string,string> = {
  w_k:"\u265a",w_q:"\u265b",w_r:"\u265c",w_b:"\u265d",w_n:"\u265e",w_p:"\u265f",
  b_k:"\u265a",b_q:"\u265b",b_r:"\u265c",b_b:"\u265d",b_n:"\u265e",b_p:"\u265f",
};
const BOARD_SWATCHES: Record<BoardTheme,[string,string]> = {
  classic:["#f0d9b5","#b58863"],slate:["#8ea4c8","#4a6fa5"],
  walnut:["#d4b896","#7a4f3a"],ice:["#e8eef4","#8fa8c8"],obsidian:["#4a4a5a","#1e1e2e"],
};
const OPP: Record<PieceColor,PieceColor> = {w:"b",b:"w"};
const DIR: Record<PieceColor,number>  = {w:-1,b:1};
const SR:  Record<PieceColor,number>  = {w:6,b:1};
const PR:  Record<PieceColor,number>  = {w:0,b:7};
const TS:  Record<TimeControl,number> = {1:60,5:300,10:600};

// ─── Audio ───────────────────────────────────────────────────────────────────
let _ctx: AudioContext|null = null;
function getCtx(): AudioContext|null {
  if (typeof window==="undefined") return null;
  try {
    if (!_ctx) _ctx = new (window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext)();
    if (_ctx.state==="suspended") _ctx.resume();
    return _ctx;
  } catch { return null; }
}
type OD={f:number;eF?:number;t?:OscillatorType;g:number;d:number;at?:number};
function sy(defs:OD[],m=1){
  const c=getCtx();if(!c)return;const n=c.currentTime;
  defs.forEach(({f,eF,t="sine",g,d,at=0})=>{
    const s=n+at,o=c.createOscillator(),v=c.createGain(),l=c.createGain();
    l.gain.value=m;o.type=t;o.frequency.setValueAtTime(f,s);
    if(eF)o.frequency.exponentialRampToValueAtTime(eF,s+d);
    v.gain.setValueAtTime(g,s);v.gain.exponentialRampToValueAtTime(0.00001,s+d+0.01);
    o.connect(v);v.connect(l);l.connect(c.destination);o.start(s);o.stop(s+d+0.02);
  });
}
function sfxSel(){sy([{f:1400,eF:900,g:0.12,d:0.07},{f:2800,eF:1800,g:0.05,d:0.04}]);}
function sfxMov(){sy([{f:160,eF:70,t:"triangle",g:0.55,d:0.14},{f:80,eF:40,t:"triangle",g:0.30,d:0.18},{f:2400,eF:1200,g:0.06,d:0.04}]);}
function sfxCap(){sy([{f:130,eF:55,t:"sawtooth",g:0.65,d:0.18},{f:210,eF:90,t:"triangle",g:0.40,d:0.14},{f:420,eF:200,t:"triangle",g:0.18,d:0.09,at:0.02},{f:1600,eF:800,g:0.08,d:0.05}]);}
function sfxChk(){sy([{f:440,g:0.22,d:0.4},{f:554,g:0.16,d:0.38,at:0.04},{f:659,g:0.12,d:0.36,at:0.08}]);}
function sfxEnd(){sy([{f:220,eF:110,t:"triangle",g:0.35,d:0.4},{f:180,eF:90,t:"triangle",g:0.25,d:0.5,at:0.05}]);}

// ─── Chess Engine ─────────────────────────────────────────────────────────────
function freshBoard(): Board {
  const b:Board=Array.from({length:8},()=>Array(8).fill(null));
  const bk:PieceType[]=["r","n","b","q","k","b","n","r"];
  for(let c=0;c<8;c++){b[0][c]={type:bk[c],color:"b"};b[1][c]={type:"p",color:"b"};b[6][c]={type:"p",color:"w"};b[7][c]={type:bk[c],color:"w"};}
  return b;
}

function clrPath(b:Board,fr:number,fc:number,tr:number,tc:number):boolean{
  const dr=Math.sign(tr-fr),dc=Math.sign(tc-fc);let r=fr+dr,c=fc+dc;
  while(r!==tr||c!==tc){if(b[r][c])return false;r+=dr;c+=dc;}return true;
}

function isPseudo(b:Board,fr:number,fc:number,tr:number,tc:number,ep:[number,number]|null):boolean{
  if(tr<0||tr>7||tc<0||tc>7)return false;
  const p=b[fr][fc];if(!p)return false;if(fr===tr&&fc===tc)return false;
  const t=b[tr][tc];if(t?.color===p.color)return false;
  const dr=tr-fr,dc=tc-fc,adr=Math.abs(dr),adc=Math.abs(dc),d=DIR[p.color];
  switch(p.type){
    case"p":{
      if(dc===0){if(dr===d&&!t)return true;if(dr===2*d&&fr===SR[p.color]&&!t&&!b[fr+d][fc])return true;return false;}
      if(adc===1&&dr===d){if(t&&t.color!==p.color)return true;if(ep&&ep[0]===tr&&ep[1]===tc)return true;}
      return false;
    }
    case"n":return(adr===2&&adc===1)||(adr===1&&adc===2);
    case"r":return(dr===0||dc===0)&&clrPath(b,fr,fc,tr,tc);
    case"b":return adr===adc&&clrPath(b,fr,fc,tr,tc);
    case"q":return(dr===0||dc===0||adr===adc)&&clrPath(b,fr,fc,tr,tc);
    case"k":return adr<=1&&adc<=1;
    default:return false;
  }
}

function attacked(b:Board,r:number,c:number,by:PieceColor):boolean{
  for(let fr=0;fr<8;fr++)for(let fc=0;fc<8;fc++){
    const p=b[fr][fc];if(!p||p.color!==by)continue;
    if(p.type==="p"){const d=DIR[by];if(r===fr+d&&(c===fc+1||c===fc-1))return true;continue;}
    if(isPseudo(b,fr,fc,r,c,null))return true;
  }
  return false;
}

function kingPos(b:Board,color:PieceColor):[number,number]|null{
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]?.type==="k"&&b[r][c]?.color===color)return[r,c];
  return null;
}

function inChk(b:Board,color:PieceColor):boolean{
  const k=kingPos(b,color);if(!k)return false;return attacked(b,k[0],k[1],OPP[color]);
}

function applyMov(b:Board,fr:number,fc:number,tr:number,tc:number,ep:[number,number]|null,promo:PieceType="q"):Board{
  const nb=b.map(row=>[...row]);const p=nb[fr][fc]!;
  if(p.type==="p"&&ep&&tr===ep[0]&&tc===ep[1])nb[fr][tc]=null;
  if(p.type==="k"&&Math.abs(tc-fc)===2){
    if(tc>fc){nb[fr][5]=nb[fr][7];nb[fr][7]=null;}else{nb[fr][3]=nb[fr][0];nb[fr][0]=null;}
  }
  nb[tr][tc]=nb[fr][fc];nb[fr][fc]=null;
  if(nb[tr][tc]?.type==="p"&&(tr===0||tr===7))nb[tr][tc]={type:promo,color:p.color};
  return nb;
}

function legalDests(b:Board,r:number,c:number,cr:CastlingRights,ep:[number,number]|null):[number,number][]{
  const p=b[r][c];if(!p)return[];const col=p.color;const mv:[number,number][]=[];
  for(let tr=0;tr<8;tr++)for(let tc=0;tc<8;tc++){
    if(!isPseudo(b,r,c,tr,tc,ep))continue;
    const nb=applyMov(b,r,c,tr,tc,ep);if(!inChk(nb,col))mv.push([tr,tc]);
  }
  if(p.type==="k"&&!inChk(b,col)){
    const row=col==="w"?7:0;
    if(r===row&&c===4){
      const kr=b[row][7],qr=b[row][0];
      if((col==="w"?cr.wK:cr.bK)&&kr?.type==="r"&&kr.color===col&&!b[row][5]&&!b[row][6]&&!attacked(b,row,5,OPP[col])&&!attacked(b,row,6,OPP[col])){
        const nb=applyMov(b,r,c,row,6,ep);if(!inChk(nb,col))mv.push([row,6]);
      }
      if((col==="w"?cr.wQ:cr.bQ)&&qr?.type==="r"&&qr.color===col&&!b[row][1]&&!b[row][2]&&!b[row][3]&&!attacked(b,row,2,OPP[col])&&!attacked(b,row,3,OPP[col])){
        const nb=applyMov(b,r,c,row,2,ep);if(!inChk(nb,col))mv.push([row,2]);
      }
    }
  }
  return mv;
}

function anyLegal(b:Board,col:PieceColor,cr:CastlingRights,ep:[number,number]|null):boolean{
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]?.color===col&&legalDests(b,r,c,cr,ep).length>0)return true;
  return false;
}

function updCR(cr:CastlingRights,fr:number,fc:number,tr:number,tc:number,p:Piece):CastlingRights{
  const n={...cr};
  if(p.type==="k"){if(p.color==="w"){n.wK=false;n.wQ=false;}else{n.bK=false;n.bQ=false;}}
  if(fr===7&&fc===7)n.wK=false;if(fr===7&&fc===0)n.wQ=false;
  if(fr===0&&fc===7)n.bK=false;if(fr===0&&fc===0)n.bQ=false;
  if(tr===7&&tc===7)n.wK=false;if(tr===7&&tc===0)n.wQ=false;
  if(tr===0&&tc===7)n.bK=false;if(tr===0&&tc===0)n.bQ=false;
  return n;
}

function calcEP(p:Piece,fr:number,fc:number,tr:number):[number,number]|null{
  if(p.type==="p"&&Math.abs(tr-fr)===2)return[(fr+tr)/2,fc];return null;
}

function insuffMat(b:Board):boolean{
  const ps:Piece[]=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c])ps.push(b[r][c]!);
  if(ps.length===2)return true;
  if(ps.length===3){const nk=ps.filter(p=>p.type!=="k");if(nk.length===1&&(nk[0].type==="n"||nk[0].type==="b"))return true;}
  return false;
}

const LT:Record<PieceType,string>={p:"p",r:"r",n:"n",b:"b",q:"q",k:"k"};
function posKey(b:Board,t:PieceColor,c:CastlingRights,ep:[number,number]|null):string{
  let s=t+(c.wK?"K":"")+(c.wQ?"Q":"")+(c.bK?"k":"")+(c.bQ?"q":"")+"|";
  for(let r=0;r<8;r++)for(let cc=0;cc<8;cc++){const p=b[r][cc];s+=p?(p.color==="w"?LT[p.type].toUpperCase():LT[p.type]):".";}
  return s+"|"+(ep?`${ep[0]}${ep[1]}`:"-");
}

function fmt(s:number):string{const m=Math.floor(s/60),sc=s%60;return`${m}:${sc.toString().padStart(2,"0")}`;}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ChessPage() {
  const {settings} = useTheme();
  const animEnabled = settings.chessAnimations;

  const [board,   setBoard]   = useState<Board>(freshBoard);
  const [turn,    setTurn]    = useState<PieceColor>("w");
  const [sel,     setSel]     = useState<[number,number]|null>(null);
  const [hints,   setHints]   = useState<[number,number][]>([]);
  const [lastMov, setLastMov] = useState<{from:[number,number];to:[number,number]}|null>(null);
  const [hideSq,  setHideSq]  = useState<string|null>(null);
  const [slide,   setSlide]   = useState<SlideAnim|null>(null);
  const [cr,      setCR]      = useState<CastlingRights>({wK:true,wQ:true,bK:true,bQ:true});
  const [ep,      setEP]      = useState<[number,number]|null>(null);
  const [promo,   setPromo]   = useState<{fr:number;fc:number;tr:number;tc:number;piece:Piece}|null>(null);
  const [chkCol,  setChkCol]  = useState<PieceColor|null>(null);
  const [theme,   setTheme]   = useState<BoardTheme>(()=>(typeof window!=="undefined"?(localStorage.getItem("chess_bt") as BoardTheme)||"classic":"classic"));
  const [snd,     setSnd]     = useState(()=>typeof window!=="undefined"?localStorage.getItem("chess_snd")!=="false":true);
  const [status,  setStatus]  = useState<MatchStatus>("idle");
  const [roomId,  setRoomId]  = useState("");
  const [myCol,   setMyCol]   = useState<PieceColor>("w");
  const [capW,    setCapW]    = useState<PieceType[]>([]);
  const [capB,    setCapB]    = useState<PieceType[]>([]);
  const [winner,  setWinner]  = useState<string|null>(null);
  const [movN,    setMovN]    = useState(0);
  const [toast,   setToast]   = useState<{msg:string;type:"ok"|"err"|"info"}|null>(null);
  const [tc,      setTC]      = useState<TimeControl>(5);
  const [wtSec,   setWtSec]   = useState(300);
  const [btSec,   setBtSec]   = useState(300);
  const [movLk,   setMovLk]   = useState(false);
  const [half,    setHalf]    = useState(0);
  const [posHist, setPosHist] = useState<string[]>([]);

  const boardRef   = useRef<HTMLDivElement>(null);
  const myId       = useRef("");
  const pollR      = useRef<ReturnType<typeof setInterval>|null>(null);
  const syncRef    = useRef("");
  const statRef    = useRef<MatchStatus>("idle");
  const sndRef     = useRef(snd);
  const movLkRef   = useRef(false);
  const lkTmrRef   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval>|null>(null);
  const turnRef    = useRef<PieceColor>("w");
  const playRef    = useRef(false);

  useEffect(()=>{sndRef.current=snd;},[snd]);
  useEffect(()=>{statRef.current=status;playRef.current=status==="playing";},[status]);
  useEffect(()=>{turnRef.current=turn;},[turn]);
  useEffect(()=>{if(!myId.current)myId.current=typeof crypto!=="undefined"?crypto.randomUUID():Date.now().toString(36);},[]);

  // Clock
  useEffect(()=>{
    if(timerRef.current)clearInterval(timerRef.current);
    if(status!=="playing")return;
    timerRef.current=setInterval(()=>{
      if(!playRef.current)return;
      if(turnRef.current==="w")setWtSec(t=>{if(t<=1){clearInterval(timerRef.current!);toTimeout("b");return 0;}return t-1;});
      else setBtSec(t=>{if(t<=1){clearInterval(timerRef.current!);toTimeout("w");return 0;}return t-1;});
    },1000);
    return()=>{if(timerRef.current)clearInterval(timerRef.current);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[turn,status]);

  function toTimeout(w:PieceColor){
    if(!playRef.current)return;
    setWinner(`${w==="w"?"White":"Black"} (on time)`);setStatus("finished");relLk();
    playSfx(sfxEnd);showToast(`${OPP[w]==="w"?"White":"Black"} ran out of time!`,"info");
  }

  function playSfx(fn:()=>void){if(!sndRef.current)return;getCtx();fn();}
  function showToast(msg:string,type:"ok"|"err"|"info"="info"){setToast({msg,type});setTimeout(()=>setToast(null),3000);}
  function acqLk(){movLkRef.current=true;setMovLk(true);if(lkTmrRef.current)clearTimeout(lkTmrRef.current);lkTmrRef.current=setTimeout(()=>{movLkRef.current=false;setMovLk(false);},30000);}
  function relLk(){if(lkTmrRef.current)clearTimeout(lkTmrRef.current);movLkRef.current=false;setMovLk(false);}
  function chgTheme(t:BoardTheme){setTheme(t);localStorage.setItem("chess_bt",t);}
  function togSnd(){const n=!snd;setSnd(n);localStorage.setItem("chess_snd",n.toString());}

  function trigSlide(fr:number,fc:number,tr:number,tc:number,piece:Piece){
    if(!animEnabled||!boardRef.current)return;
    const fe=boardRef.current.querySelector<HTMLElement>(`[data-sq="${fr}-${fc}"]`);
    const te=boardRef.current.querySelector<HTMLElement>(`[data-sq="${tr}-${tc}"]`);
    if(!fe||!te)return;
    const fb=fe.getBoundingClientRect(),tb=te.getBoundingClientRect();
    const dist=Math.hypot(tr-fr,tc-fc),dur=Math.round(180+dist*16);
    setHideSq(`${fr}-${fc}`);
    setSlide({piece,id:Math.random().toString(36).slice(2),fromX:fb.left,fromY:fb.top,toX:tb.left,toY:tb.top,sqW:fb.width,sqH:fb.height,dur});
    setTimeout(()=>{setSlide(null);setHideSq(null);},dur+30);
  }

  const poll=useCallback(async()=>{
    if(!roomId)return;
    try{
      const res=await fetch("/api/chess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get",roomId})});
      const data=await res.json();
      if(statRef.current==="searching"&&data.playerCount>=2){setStatus("playing");showToast("Opponent connected — game on!","ok");}
      const s=data.state;
      if(s?.board&&s.sig&&s.sig!==syncRef.current&&s.lastPlayer!==myId.current){
        syncRef.current=s.sig;relLk();
        setBoard(s.board);setTurn(s.turn);setLastMov(s.lastMove||null);setMovN((n:number)=>n+1);
        if(s.castlingRights)setCR(s.castlingRights);
        if(s.enPassant!==undefined)setEP(s.enPassant);
        if(s.capturedW)setCapW(s.capturedW);if(s.capturedB)setCapB(s.capturedB);
        if(s.whiteTimeSec!=null)setWtSec(s.whiteTimeSec);if(s.blackTimeSec!=null)setBtSec(s.blackTimeSec);
        if(s.half!=null)setHalf(s.half);if(s.posHist)setPosHist(s.posHist);
        setChkCol(inChk(s.board,s.turn)?s.turn:null);
        if(s.winner){setWinner(s.winner);setStatus("finished");relLk();playSfx(sfxChk);}else playSfx(sfxMov);
      }
    }catch{}
   
  },[roomId]);

  useEffect(()=>{if(roomId){pollR.current=setInterval(poll,800);return()=>{if(pollR.current)clearInterval(pollR.current);};}},[ roomId,poll]);

  const pushMov=useCallback(async(nb:Board,nt:PieceColor,nl:{from:[number,number];to:[number,number]},nw:PieceType[],nb2:PieceType[],gw:string|null,mc:number,ncr:CastlingRights,nep:[number,number]|null,wt:number,bt:number,nh:number,nhist:string[])=>{
    const sig=mc.toString(36)+nt;syncRef.current=sig;
    try{await fetch("/api/chess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"move",roomId,playerId:myId.current,state:{board:nb,turn:nt,lastMove:nl,capturedW:nw,capturedB:nb2,winner:gw,lastPlayer:myId.current,sig,castlingRights:ncr,enPassant:nep,whiteTimeSec:wt,blackTimeSec:bt,half:nh,posHist:nhist}})});}catch{}
  },[roomId]);

  async function findMatch(){
    relLk();const secs=TS[tc];
    setStatus("searching");setBoard(freshBoard());setTurn("w");
    setSel(null);setHints([]);setLastMov(null);setSlide(null);setHideSq(null);setPromo(null);
    setCapW([]);setCapB([]);setWinner(null);setMovN(0);
    setCR({wK:true,wQ:true,bK:true,bQ:true});setEP(null);
    setWtSec(secs);setBtSec(secs);setChkCol(null);syncRef.current="";
    setHalf(0);setPosHist([]);
    try{
      const res=await fetch("/api/chess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"matchmake",playerId:myId.current})});
      const data=await res.json();setRoomId(data.roomId);setMyCol(data.color);
      if(data.status==="matched"){setStatus("playing");showToast(`Matched! You play ${data.color==="w"?"White":"Black"}.`,"ok");}
      else showToast("Waiting for an opponent\u2026","info");
    }catch{showToast("Connection error. Try again.","err");setStatus("idle");}
  }

  async function cancelSearch(){
    if(pollR.current)clearInterval(pollR.current);
    try{await fetch("/api/chess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"cancel",roomId,playerId:myId.current})});}catch{}
    setStatus("idle");setRoomId("");
  }

  function commitMov(fr:number,fc:number,tr:number,tc:number,prm:PieceType="q"){
    const b=board,piece=b[fr][fc]!;
    const ncr=updCR(cr,fr,fc,tr,tc,piece);const nep=calcEP(piece,fr,fc,tr);
    const nb=applyMov(b,fr,fc,tr,tc,ep,prm);
    const cap=(ep&&tr===ep[0]&&tc===ep[1])?{type:"p" as PieceType,color:OPP[myCol]}:b[tr][tc];
    const nw=[...capW],nb2=[...capB];
    if(cap){if(cap.color==="w")nw.push(cap.type);else nb2.push(cap.type);playSfx(sfxCap);}else playSfx(sfxMov);
    const nt:PieceColor=myCol==="w"?"b":"w";const nl={from:[fr,fc] as [number,number],to:[tr,tc] as [number,number]};
    const mc=movN+1;let gw:string|null=null;
    const nh=(piece.type==="p"||cap)?0:half+1;
    const pk=posKey(nb,nt,ncr,nep);
    const nhist=[...posHist,pk];
    const oic=inChk(nb,nt),ohal=anyLegal(nb,nt,ncr,nep);
    if(oic&&!ohal){gw=myCol==="w"?"White":"Black";setWinner(gw);setStatus("finished");relLk();playSfx(sfxChk);showToast("Checkmate! \uD83C\uDFC6","ok");}
    else if(!oic&&!ohal){gw="Draw (stalemate)";setWinner(gw);setStatus("finished");relLk();playSfx(sfxEnd);showToast("Stalemate \u2014 draw!","info");}
    else if(insuffMat(nb)){gw="Draw (material)";setWinner(gw);setStatus("finished");relLk();playSfx(sfxEnd);showToast("Draw \u2014 insufficient material","info");}
    else if(nh>=100){gw="Draw (50-move rule)";setWinner(gw);setStatus("finished");relLk();playSfx(sfxEnd);showToast("Draw \u2014 50-move rule","info");}
    else if(nhist.filter(k=>k===pk).length>=3){gw="Draw (repetition)";setWinner(gw);setStatus("finished");relLk();playSfx(sfxEnd);showToast("Draw \u2014 threefold repetition","info");}
    else if(oic){setChkCol(nt);playSfx(sfxChk);}else setChkCol(null);
    setBoard(nb);setTurn(nt);setLastMov(nl);setCapW(nw);setCapB(nb2);
    setMovN(mc);setSel(null);setHints([]);setCR(ncr);setEP(nep);
    setHalf(nh);setPosHist(nhist);
    pushMov(nb,nt,nl,nw,nb2,gw,mc,ncr,nep,wtSec,btSec,nh,nhist);
  }

  const handleSq=useCallback((r:number,c:number)=>{
    if(status!=="playing"||turn!==myCol)return;
    if(!sel){
      const p=board[r][c];
      if(p?.color===myCol){setSel([r,c]);setHints(legalDests(board,r,c,cr,ep));playSfx(sfxSel);}
      return;
    }
    const[fr,fc]=sel;
    if(fr===r&&fc===c){setSel(null);setHints([]);return;}
    const cp=board[r][c];
    if(cp?.color===myCol&&!hints.some(([hr,hc])=>hr===r&&hc===c)){setSel([r,c]);setHints(legalDests(board,r,c,cr,ep));playSfx(sfxSel);return;}
    if(movLkRef.current)return;
    if(!hints.some(([hr,hc])=>hr===r&&hc===c)){setSel(null);setHints([]);return;}
    acqLk();
    const piece=board[fr][fc]!;
    trigSlide(fr,fc,r,c,piece);
    if(piece.type==="p"&&r===PR[myCol]){setSel(null);setHints([]);setPromo({fr,fc,tr:r,tc:c,piece});return;}
    commitMov(fr,fc,r,c);setSel(null);setHints([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[board,sel,hints,myCol,status,turn,cr,ep,capW,capB,movN,pushMov,wtSec,btSec]);

  function handlePromo(p:PromoChoice){
    if(!promo)return;const{fr,fc,tr,tc}=promo;setPromo(null);commitMov(fr,fc,tr,tc,p);
  }

  const ranks=useMemo(()=>myCol==="b"?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7],[myCol]);
  const files=useMemo(()=>myCol==="b"?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7],[myCol]);
  const fLbl=useMemo(()=>["a","b","c","d","e","f","g","h"],[]);

  const squares=useMemo(()=>{
    const canAct=status==="playing"&&turn===myCol;
    const kp=chkCol?kingPos(board,chkCol):null;
    return ranks.flatMap((r,ri)=>files.map((c,ci)=>{
      const p=board[r][c],il=(ri+ci)%2===0;
      const isSel=sel?.[0]===r&&sel?.[1]===c;
      const isHint=hints.some(([hr,hc])=>hr===r&&hc===c);
      const isFrom=lastMov?.from[0]===r&&lastMov?.from[1]===c;
      const isTo=lastMov?.to[0]===r&&lastMov?.to[1]===c;
      const isCap=isHint&&!!p,isHide=hideSq===`${r}-${c}`;
      const isChk=kp&&kp[0]===r&&kp[1]===c;
      let cls=`cs${il?" cl":" cd"}`;
      if(isSel)cls+=" csel";
      if(isFrom||isTo)cls+=il?" cll":" cld";
      if(isChk)cls+=" cchk";
      return(
        <button key={`${r}-${c}`} data-sq={`${r}-${c}`} className={cls}
          onClick={()=>handleSq(r,c)} disabled={!canAct}
          aria-label={`${fLbl[c]}${8-r}${p?` ${p.color==="w"?"white":"black"} ${p.type}`:""}`}>
          {ci===0&&<span className="rl">{8-r}</span>}
          {ri===7&&<span className="fl">{fLbl[c]}</span>}
          {isHint&&!isCap&&<span className="hdot"/>}
          {isCap&&<span className="hrng"/>}
          {p&&!isHide&&<span className={`cp cp-${p.color}${isSel?" cpl":""}`}>{GLYPHS[`${p.color}_${p.type}`]}</span>}
        </button>
      );
    }));
  },[board,sel,hints,lastMov,status,turn,myCol,ranks,files,fLbl,handleSq,hideSq,chkCol]);

  const isMT=status==="playing"&&turn===myCol;

  return(
    <>
      <ParticlesBackground/>
      <div className="pg">
        {slide&&(
          <div key={slide.id} className={`slov cp cp-${slide.piece.color}`}
            style={{left:slide.fromX,top:slide.fromY,width:slide.sqW,height:slide.sqH,
              "--dx":`${slide.toX-slide.fromX}px`,"--dy":`${slide.toY-slide.fromY}px`,
              "--dur":`${slide.dur}ms`} as React.CSSProperties}>
            {GLYPHS[`${slide.piece.color}_${slide.piece.type}`]}
          </div>
        )}
        {promo&&(
          <div className="prbd">
            <div className="prm">
              <p className="prt">Promote pawn</p>
              <div className="prc">
                {(["q","r","b","n"] as PromoChoice[]).map(p=>(
                  <button key={p} className="prb" onClick={()=>handlePromo(p)}>
                    <span className={`cp cp-${promo.piece.color}`}>{GLYPHS[`${promo.piece.color}_${p}`]}</span>
                    <span className="prl">{{q:"Queen",r:"Rook",b:"Bishop",n:"Knight"}[p]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {toast&&<div className={`tst tst-${toast.type}`}>{toast.msg}</div>}
        <header className="hdr">
          <Link href="/" className="brand"><span className="bdt">L</span><span>lanky.lol</span></Link>
          <div className="hc"><span className="htitle">\u265f Lanky Chess</span></div>
          <Link href="/analyser/image" className="bkl">AI Tools \u2192</Link>
        </header>
        <main className="mn">
          <div className="sbar">
            {status==="idle"&&(
              <div className="idl">
                <div className="tcr">
                  {([1,5,10] as TimeControl[]).map(t=>(
                    <button key={t} className={`tcb${tc===t?" tca":""}`} onClick={()=>setTC(t)}>{t} min</button>
                  ))}
                </div>
                <button className="pbtn" onClick={findMatch}>Find a Match</button>
              </div>
            )}
            {status==="searching"&&(
              <div className="srch">
                <span className="pd"/>
                <span>Finding opponent\u2026</span>
                <button className="gbtn" onClick={cancelSearch}>Cancel</button>
              </div>
            )}
            {status==="playing"&&(
              <div className="gbar">
                <div className="cbdg"><span className={`cdot cdot-${myCol}`}/><span>{myCol==="w"?"White":"Black"}</span></div>
                <div className={`trn${isMT?" tra":movLk?" trs":""}`}>
                  {isMT?"Your move":movLk?<><span className="pd pds"/>Sent\u2026</>:"Opponent"}
                </div>
                <div className="mn2">Move {movN+1}</div>
              </div>
            )}
            {status==="finished"&&(
              <div className="gbar">
                <span className="wnr">\uD83C\uDFC6 {winner}</span>
                <button className="pbtn" onClick={findMatch}>Play again</button>
              </div>
            )}
          </div>
          {status==="playing"&&(
            <div className="clks">
              <div className={`clk${myCol==="b"?" opp":" mine"}${turn==="w"&&status==="playing"?" tick":""}`}>
                <span className="clkl">\u2654 White</span><span className="clkt">{fmt(wtSec)}</span>
              </div>
              <div className={`clk${myCol==="w"?" opp":" mine"}${turn==="b"&&status==="playing"?" tick":""}`}>
                <span className="clkl">\u265a Black</span><span className="clkt">{fmt(btSec)}</span>
              </div>
            </div>
          )}
          <div className="bwp"><div ref={boardRef} className="bd" data-theme={theme}>{squares}</div></div>
          {status!=="idle"&&(
            <div className="cap">
              <div className="capr"><span className="capl">W captured</span><span className="caps">{capB.map((t,i)=><span key={i} className="cp cp-w" style={{fontSize:"1rem"}}>{GLYPHS[`w_${t}`]}</span>)}</span></div>
              <div className="capr"><span className="capl">B captured</span><span className="caps">{capW.map((t,i)=><span key={i} className="cp cp-b" style={{fontSize:"1rem"}}>{GLYPHS[`b_${t}`]}</span>)}</span></div>
            </div>
          )}
          <div className="ctrls">
            <div className="thr">
              {(Object.keys(BOARD_SWATCHES) as BoardTheme[]).map(t=>{
                const[l,d]=BOARD_SWATCHES[t];
                return(
                  <button key={t} onClick={()=>chgTheme(t)} title={t} className={`thb${theme===t?" thon":""}`}>
                    <span className="ths" style={{background:`linear-gradient(135deg,${l} 50%,${d} 50%)`}}/>
                    <span className="thl">{t}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={togSnd} className="sndb" title={snd?"Mute":"Sound on"}>{snd?"\uD83D\uDD0A":"\uD83D\uDD07"}</button>
          </div>
        </main>
        <style>{`
.pg{min-height:100dvh;background:#080b12;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased;position:relative;z-index:1;}
.slov{position:fixed;pointer-events:none;z-index:9999;display:flex;align-items:center;justify-content:center;animation:psl var(--dur,240ms) cubic-bezier(0.22,1.15,0.36,1) forwards;will-change:transform;}
@keyframes psl{0%{transform:translate(0,0) scale(1.08);}85%{transform:translate(calc(var(--dx)*1.03),calc(var(--dy)*1.03)) scale(1);}100%{transform:translate(var(--dx),var(--dy)) scale(1);}}
.prbd{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;}
.prm{background:rgba(18,22,30,0.98);border:1px solid rgba(255,255,255,0.14);border-radius:20px;padding:1.5rem;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.8);}
.prt{font-size:0.85rem;font-weight:700;color:rgba(255,255,255,0.6);margin-bottom:1rem;}
.prc{display:flex;gap:0.75rem;}
.prb{display:flex;flex-direction:column;align-items:center;gap:0.35rem;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:0.85rem 1rem;cursor:pointer;transition:all 0.15s;}
.prb:hover{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.3);transform:translateY(-2px);}
.prb .cp{font-size:2.2rem;}
.prl{font-size:0.65rem;font-weight:600;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.06em;}
.tst{position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:200;padding:0.55rem 1.1rem;border-radius:999px;font-size:0.8rem;font-weight:600;backdrop-filter:blur(16px);box-shadow:0 4px 24px rgba(0,0,0,0.5);white-space:nowrap;animation:tin 0.22s cubic-bezier(.16,1,.3,1) forwards;}
.tst-ok{background:rgba(16,185,129,0.18);border:1px solid rgba(16,185,129,0.35);color:#6ee7b7;}
.tst-err{background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.35);color:#fca5a5;}
.tst-info{background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.14);color:#e2e8f0;}
@keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(-8px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
.hdr{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0.7rem 1.2rem;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(8,11,18,0.9);backdrop-filter:blur(16px);position:sticky;top:0;z-index:50;}
.brand{display:flex;align-items:center;gap:0.45rem;font-size:0.8rem;font-weight:600;color:rgba(255,255,255,0.4);text-decoration:none;transition:color 0.15s;}
.brand:hover{color:#fff;}
.bdt{background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.12);width:1.4rem;height:1.4rem;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:800;color:#fff;}
.hc{display:flex;justify-content:center;}
.htitle{font-size:0.85rem;font-weight:700;color:rgba(255,255,255,0.85);letter-spacing:0.01em;}
.bkl{font-size:0.76rem;font-weight:600;color:rgba(255,255,255,0.28);text-decoration:none;transition:color 0.15s;text-align:right;}
.bkl:hover{color:#fff;}
.mn{flex:1;display:flex;flex-direction:column;align-items:center;gap:0.55rem;padding:0.65rem 0.5rem max(1rem,env(safe-area-inset-bottom));}
.idl{display:flex;flex-direction:column;align-items:center;gap:0.75rem;}
.tcr{display:flex;gap:0.4rem;}
.tcb{padding:0.3rem 0.9rem;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.4);font-size:0.75rem;font-weight:600;cursor:pointer;transition:all 0.15s;}
.tca{border-color:rgba(255,255,255,0.45);background:rgba(255,255,255,0.08);color:#fff;}
.tcb:hover:not(.tca){border-color:rgba(255,255,255,0.25);color:rgba(255,255,255,0.7);}
.sbar{width:100%;max-width:580px;min-height:42px;display:flex;align-items:center;justify-content:center;}
.pbtn{background:#fff;color:#080b12;border:none;border-radius:12px;padding:0.6rem 2rem;font-size:0.88rem;font-weight:700;cursor:pointer;transition:all 0.18s;box-shadow:0 2px 18px rgba(255,255,255,0.18);}
.pbtn:hover{background:#e8ecf0;transform:translateY(-1px);}
.gbtn{background:transparent;color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.14);border-radius:8px;padding:0.3rem 0.8rem;font-size:0.74rem;font-weight:600;cursor:pointer;transition:all 0.15s;}
.gbtn:hover{color:#fff;border-color:rgba(255,255,255,0.32);}
.srch{display:flex;align-items:center;gap:0.6rem;font-size:0.84rem;color:rgba(255,255,255,0.5);}
.pd{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.65);animation:pd 1.2s ease-in-out infinite;flex-shrink:0;}
.pds{width:5px;height:5px;background:rgba(255,255,255,0.5);animation:pd 1s ease-in-out infinite;display:inline-block;border-radius:50%;}
@keyframes pd{0%,100%{opacity:1;}50%{opacity:0.2;}}
.gbar{display:flex;align-items:center;gap:0.65rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:0.45rem 0.9rem;width:100%;max-width:580px;justify-content:space-between;backdrop-filter:blur(12px);}
.cbdg{display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;font-weight:600;color:rgba(255,255,255,0.65);}
.cdot{width:9px;height:9px;border-radius:50%;}
.cdot-w{background:#fff;box-shadow:0 0 0 2px rgba(255,255,255,0.15),0 0 8px rgba(255,255,255,0.3);}
.cdot-b{background:#111;box-shadow:0 0 0 2px rgba(255,255,255,0.25);}
.trn{display:flex;align-items:center;gap:0.35rem;font-size:0.78rem;font-weight:600;color:rgba(255,255,255,0.28);border-radius:999px;padding:0.18rem 0.7rem;border:1px solid transparent;transition:all 0.25s;}
.tra{color:#fff;background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.18);}
.trs{color:rgba(255,255,255,0.45);background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);}
.mn2{font-size:0.74rem;color:rgba(255,255,255,0.24);font-variant-numeric:tabular-nums;}
.wnr{font-size:0.88rem;font-weight:700;color:#fff;}
.clks{display:flex;gap:0.5rem;width:100%;max-width:580px;}
.clk{flex:1;display:flex;align-items:center;justify-content:space-between;padding:0.35rem 0.75rem;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);transition:all 0.3s;}
.tick{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.18);}
.mine.tick{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.25);}
.clkl{font-size:0.65rem;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.06em;}
.clkt{font-size:0.95rem;font-weight:700;font-variant-numeric:tabular-nums;color:rgba(255,255,255,0.85);}
.tick .clkt{color:#fff;}
.cap{display:flex;flex-direction:column;gap:0.15rem;font-size:0.72rem;color:rgba(255,255,255,0.28);width:100%;max-width:580px;}
.capr{display:flex;align-items:center;gap:0.3rem;}
.capl{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;min-width:5rem;}
.caps{display:flex;flex-wrap:wrap;gap:1px;}
.bwp{user-select:none;display:flex;align-items:center;justify-content:center;width:100%;}
.bd{display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);width:min(calc(100svw - 12px),calc(100svh - 200px),560px);height:min(calc(100svw - 12px),calc(100svh - 200px),560px);border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,0.1),0 0 0 5px rgba(255,255,255,0.04),0 32px 100px rgba(0,0,0,0.8);container-type:inline-size;}
.cs{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;padding:0;outline:none;transition:filter 0.07s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.cs:disabled{cursor:default;}
.cs:not(:disabled):hover{filter:brightness(1.13);}
.bd[data-theme="classic"] .cl{background:#f0d9b5;}.bd[data-theme="classic"] .cd{background:#b58863;}
.bd[data-theme="slate"] .cl{background:#8ea4c8;}.bd[data-theme="slate"] .cd{background:#4a6fa5;}
.bd[data-theme="walnut"] .cl{background:#d4b896;}.bd[data-theme="walnut"] .cd{background:#7a4f3a;}
.bd[data-theme="ice"] .cl{background:#e8eef4;}.bd[data-theme="ice"] .cd{background:#8fa8c8;}
.bd[data-theme="obsidian"] .cl{background:#4a4a5a;}.bd[data-theme="obsidian"] .cd{background:#1e1e2e;}
.csel{background:rgba(106,153,85,0.92)!important;}
.cll{background:rgba(205,210,106,0.80)!important;}
.cld{background:rgba(170,162,58,0.70)!important;}
.cchk{background:rgba(220,38,38,0.65)!important;animation:ckp 0.8s ease-in-out infinite alternate;}
@keyframes ckp{0%{background:rgba(220,38,38,0.55);}100%{background:rgba(220,38,38,0.82);}}
.rl,.fl{position:absolute;font-weight:700;line-height:1;pointer-events:none;z-index:1;font-size:clamp(0.34rem,1.1vw,0.52rem);opacity:0.7;}
.rl{top:2px;left:3px;}.fl{bottom:2px;right:3px;}
.cl .rl,.cl .fl{color:#b58863;}.cd .rl,.cd .fl{color:#f0d9b5;}
.bd[data-theme="slate"] .rl,.bd[data-theme="slate"] .fl,.bd[data-theme="obsidian"] .rl,.bd[data-theme="obsidian"] .fl{color:rgba(255,255,255,0.45);}
.hdot{position:absolute;width:30%;height:30%;border-radius:50%;background:rgba(0,0,0,0.22);pointer-events:none;z-index:2;animation:hpop 0.18s cubic-bezier(0.34,1.8,0.64,1) both;}
.hrng{position:absolute;inset:0;border-radius:50%;border:min(5px,1.5vw) solid rgba(0,0,0,0.22);pointer-events:none;z-index:2;animation:hpop 0.18s cubic-bezier(0.34,1.8,0.64,1) both,hpls 1.6s ease-in-out 0.2s infinite;}
@keyframes hpop{0%{transform:scale(0);opacity:0;}60%{transform:scale(1.12);opacity:1;}100%{transform:scale(1);opacity:1;}}
@keyframes hpls{0%,100%{opacity:1;}50%{opacity:0.6;}}
.cp{font-size:min(9.6cqi,3.6rem);line-height:1;z-index:3;position:relative;display:block;will-change:transform;transition:transform 0.14s cubic-bezier(0.34,1.56,0.64,1),filter 0.1s;font-family:'Segoe UI Symbol','Noto Chess','DejaVu Sans',serif;}
.cs:hover:not(:disabled) .cp{transform:scale(1.1);}
.cpl{transform:scale(1.25)!important;filter:drop-shadow(0 4px 14px rgba(0,0,0,0.75)) drop-shadow(0 0 18px rgba(255,255,255,0.2));z-index:10;}
.cp-w{color:#fff;-webkit-text-stroke:1.5px #2a2a2a;paint-order:stroke fill;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));}
.cp-b{color:#1a1a1a;-webkit-text-stroke:1.2px rgba(255,255,255,0.35);paint-order:stroke fill;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));}
.ctrls{display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;justify-content:center;}
.thr{display:flex;gap:0.35rem;flex-wrap:wrap;justify-content:center;}
.thb{display:flex;align-items:center;gap:0.3rem;padding:0.25rem 0.65rem;border-radius:8px;font-size:0.68rem;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.35);transition:all 0.15s;}
.thb:hover{border-color:rgba(255,255,255,0.25);color:rgba(255,255,255,0.7);}
.thon{border-color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.07);color:#fff;}
.ths{width:10px;height:10px;border-radius:2px;outline:1px solid rgba(255,255,255,0.1);flex-shrink:0;}
.thl{font-size:0.68rem;}
.sndb{background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:0.25rem 0.5rem;font-size:0.88rem;cursor:pointer;transition:all 0.15s;color:rgba(255,255,255,0.5);}
.sndb:hover{border-color:rgba(255,255,255,0.28);color:#fff;}
@media (min-width:1024px){.bd{width:min(calc(100svh - 230px),600px);height:min(calc(100svh - 230px),600px);}}
@media (orientation:landscape) and (max-height:520px){
  .mn{flex-direction:row;flex-wrap:wrap;align-items:flex-start;padding:0.4rem;gap:0.4rem;}
  .bd{width:min(calc(100svh - 80px),calc(60svw - 10px),430px);height:min(calc(100svh - 80px),calc(60svw - 10px),430px);}
  .sbar,.clks,.cap,.ctrls{max-width:calc(40svw - 10px);}
}
@media (max-width:360px){.bd{width:calc(100svw - 8px);height:calc(100svw - 8px);}.thl{display:none;}}
        `}</style>
      </div>
    </>
  );
}
