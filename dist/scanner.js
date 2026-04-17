"use strict";(()=>{var N=['[data-testid="UserCell"]',"article"],H='a[href^="/"]';var O=new Set(["i","settings","home","explore","notifications","messages","compose","search","lists","bookmarks","following","followers","verified_followers"]);function k(e){return/^[A-Za-z0-9_]{1,15}$/.test(e)}function G(e){return(e||"").replace(/\s+/g," ").trim()}function F(e){let t=e.match(/^\/([^/?]+)(?:\?.*)?$/);return t?t[1]:null}function $(e){let n=Array.from(e.querySelectorAll('div[dir="ltr"] span, span')).map(o=>G(o.textContent)).filter(Boolean),r=n.find(o=>!o.startsWith("@")&&o.length>=2);if(r)return r;let s=n[0]||"";return s.startsWith("@")?s.slice(1):s}function W(e,t){let n=Array.from(e.querySelectorAll('div[lang] span, div[dir="auto"] span, span[lang]')),r=[];for(let o of n){let a=G(o.textContent);a.length>10&&a.length<300&&!a.startsWith("@")&&!a.includes("Follow")&&!a.toLowerCase().includes(t.toLowerCase())&&(o.children.length===0||o.children.length<=3)&&r.push(a)}return r.sort((o,a)=>{let i=Math.abs(o.length-80),d=Math.abs(a.length-80);return i-d})[0]||""}function V(e){let t=Array.from(e.querySelectorAll(H));for(let n of t){let r=n.getAttribute("href")||"",s=F(r);if(s&&!r.includes("/status/")&&!O.has(s)&&k(s))return{username:s,href:r}}return{username:null,href:null}}function j(){for(let e of N){let t=Array.from(document.querySelectorAll(e));if(t.length>0)return t}return[]}function D(){let e=j(),t=[];for(let n of e){let{username:r,href:s}=V(n);if(!r)continue;let o=$(n),a=new URL(s||`/${r}`,location.origin).toString(),i=W(n,r);t.push({username:r,displayName:o,profileUrl:a,bio:i})}return t}var h=class{constructor(){this.map=new Map}add(t){for(let n of t)if(!this.map.has(n.username))this.map.set(n.username,n);else{let r=this.map.get(n.username);!r.bio&&n.bio&&this.map.set(n.username,{...r,bio:n.bio})}}size(){return this.map.size}values(){return Array.from(this.map.values())}};function C(e){return new Promise(t=>setTimeout(t,e))}function w(e,t,n){return Math.max(t,Math.min(n,e))}function Z(){let e=document.querySelector('div[role="main"]');if(!e)return document;let t=e;for(;t;){let r=window.getComputedStyle(t).overflowY;if((r==="auto"||r==="scroll")&&t.scrollHeight>t.clientHeight+50)return t;t=t.parentElement}return document}function y(){let e=document.querySelectorAll('[data-testid="UserCell"]').length;return e>0?e:document.querySelectorAll("article").length}async function B(e){let t=e.scrollStepPx??1400,n=e.maxIdleRounds??7,r=e.hardCapRounds??2e3,s=e.maxUsers??1e4,o=e.pauseEveryN??55,a=e.pauseDurationMs??1800,i=380,d=1600,m=w(e.settleMsInitial??900,i,d),P=Z(),p=0,l=0,T=y(),b=!1,M=performance.now(),I=new MutationObserver(x=>{for(let v of x)for(let u of Array.from(v.addedNodes))if(u instanceof HTMLElement&&(u.matches?.('[data-testid="UserCell"]')||u.querySelector?.('[data-testid="UserCell"]'))){b=!0;return}});I.observe(document.body,{childList:!0,subtree:!0});try{for(await C(400);p<n&&l<r;){let u=performance.now()-M;l++,b=!1;let E=y();if(E>=s)return e.onTick({rounds:l,idleRounds:p,visibleCells:E,progressed:!1,delayMs:m,elapsedMs:u}),{reason:"maxUsers",rounds:l,elapsedMs:u,visibleCells:E};P===document?window.scrollBy(0,t):P.scrollBy({top:t,left:0,behavior:"instant"});let K=m+(Math.random()*260-130);await C(w(K,i,d)),o>0&&l%o===0&&await C(a);let S=y(),_=b||S>T;m=w(_?m-60:m+120,i,d),_?(p=0,T=S):p++,e.onTick({rounds:l,idleRounds:p,visibleCells:S,progressed:_,delayMs:m,elapsedMs:u})}let x=performance.now()-M,v=y();return{reason:l>=r?"hardCap":"idle",rounds:l,elapsedMs:x,visibleCells:v}}finally{I.disconnect()}}var J="creatorgraph_raw_users";async function z(e){await chrome.storage.local.set({[J]:e})}var R=null,A=null,U=null,L=null,Y="creatorgraph-overlay";function g(){if(document.getElementById(Y))return;let e=document.createElement("style");e.textContent=`
    #creatorgraph-overlay {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: rgba(7, 17, 29, 0.96);
      border: 1px solid rgba(124, 242, 211, 0.25);
      border-radius: 16px;
      padding: 18px 22px;
      min-width: 280px;
      max-width: 340px;
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
      backdrop-filter: blur(12px);
    }
    #creatorgraph-overlay .cg-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    #creatorgraph-overlay .cg-logo {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7cf2d3, #78a6ff);
    }
    #creatorgraph-overlay .cg-name {
      color: #eef6ff;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.02em;
    }
    #creatorgraph-overlay .cg-status {
      color: rgba(238, 246, 255, 0.7);
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 10px;
    }
    #creatorgraph-overlay .cg-count {
      color: #7cf2d3;
      font-size: 22px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      margin-bottom: 4px;
    }
    #creatorgraph-overlay .cg-progress {
      width: 100%;
      height: 3px;
      background: rgba(124, 242, 211, 0.15);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 12px;
    }
    #creatorgraph-overlay .cg-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #7cf2d3, #78a6ff);
      border-radius: 2px;
      width: 0%;
      transition: width 0.3s ease;
      animation: cg-pulse 1.5s ease-in-out infinite;
    }
    @keyframes cg-pulse {
      0%, 100% { opacity: 0.9; }
      50% { opacity: 0.5; }
    }
  `,document.head.appendChild(e),R=document.createElement("div"),R.id=Y,R.innerHTML=`
    <div class="cg-header">
      <div class="cg-logo"></div>
      <div class="cg-name">CreatorGraph</div>
    </div>
    <div class="cg-count" id="cg-count">0</div>
    <div class="cg-status" id="cg-status">Initializing\u2026</div>
    <div class="cg-progress"><div class="cg-progress-bar" id="cg-bar"></div></div>
  `,document.body.appendChild(R),A=document.getElementById("cg-status"),U=document.getElementById("cg-bar"),L=document.getElementById("cg-count")}function c(e){A&&(A.textContent=e)}function q(e){L&&(L.textContent=e.toLocaleString())}function f(e){U&&(U.style.width=`${Math.min(100,e)}%`)}function Q(){let e=["x.com","www.x.com","twitter.com","www.twitter.com"].includes(location.hostname),t=location.pathname.includes("/following");return e&&t}async function X(){if(!Q()){g(),c("Navigate to your /following page first.");return}g(),c("Scanning your following list\u2026"),f(5);let e=new h,t=await B({onTick:r=>{let s=D();e.add(s),q(e.size()),c(r.progressed?"Scanning\u2026":"Scanning (waiting for content)\u2026");let o=Math.min(85,5+r.rounds/400*80);f(o)}});c(`Scan complete \u2014 ${e.size().toLocaleString()} accounts found. Building graph\u2026`),f(90);let n=e.values();await z(n),c(`Done. ${n.length.toLocaleString()} accounts saved. Opening CreatorGraph\u2026`),f(100),await chrome.runtime.sendMessage({action:"CREATORGRAPH_OPEN_RESULTS",count:n.length,stopReason:t.reason})}function ee(){window.__CREATORGRAPH_LISTENER_READY__||(window.__CREATORGRAPH_LISTENER_READY__=!0,chrome.runtime.onMessage.addListener((e,t,n)=>{if(e?.action==="CREATORGRAPH_START")return window.__CREATORGRAPH_RUNNING__?(g(),c("Already scanning."),n({ok:!1}),!0):(window.__CREATORGRAPH_RUNNING__=!0,n({ok:!0}),X().catch(r=>{console.error("[CreatorGraph]",r),g(),c("Error \u2014 see console.")}).finally(()=>{window.__CREATORGRAPH_RUNNING__=!1}),!0)}))}ee();})();
