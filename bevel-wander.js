// Viewport motion is independent of lesson rendering, so Bevel never jumps when a tab updates.
export function wanderBounds(width,height,size=92,navHeight=0){
  const margin=12;
  return {left:margin,right:Math.max(margin,width-size-margin),top:Math.min(110,Math.max(margin,height-size-navHeight-24)),bottom:Math.max(margin,height-size-navHeight-20)};
}
export function stepToward(position,target,distance){
  const dx=target.x-position.x,dy=target.y-position.y,length=Math.hypot(dx,dy);
  if(length<=distance||length===0)return {...target,arrived:true};
  return {x:position.x+dx/length*distance,y:position.y+dy/length*distance,arrived:false};
}
export function pinnedPosition(point,bounds){return {x:Math.max(bounds.left,Math.min(bounds.right,point.x)),y:Math.max(12,Math.min(bounds.bottom,point.y))};}
export function createBevelWanderer({panel,paused=false,savedPosition=null,onPauseChange=()=>{},onPositionChange=()=>{}}){
  const avatar=panel.querySelector('#bevel-hello'),bubble=panel.querySelector('#bevel-bubble');
  const close=panel.querySelector('#bevel-close'),pause=panel.querySelector('#bevel-pause');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const reasons=new Set();
  let drag=null,suppressClickUntil=0,pinned=savedPosition&&Number.isFinite(savedPosition.x)&&Number.isFinite(savedPosition.y)&&savedPosition.x>=0&&savedPosition.x<=1&&savedPosition.y>=0&&savedPosition.y<=1?savedPosition:null;
  let quiet=false,opened=false,userPaused=paused,destroyed=false,last=0,frame=0,corner=1,lastObstacleScan=0,obstacles=[];
  let bounds,position={x:12,y:12},target={x:12,y:12};
  const stateLabel=()=>quiet?'Quiet mode':reduced.matches?'Reduced motion':drag?.moved?'Place me anywhere':userPaused?(pinned?'Staying where you placed me':'Wandering paused'):opened?'Here to help':reasons.size?'Stopped for you':'Exploring the workshop';
  function paint(){panel.style.transform=`translate3d(${position.x}px,${position.y}px,0)`;panel.dataset.walking=String(!quiet&&!reduced.matches&&!userPaused&&!opened&&!reasons.size&&!document.hidden);panel.querySelector('#bevel-wander-status').textContent=stateLabel();pause.textContent=userPaused?'Resume wandering':'Pause wandering';pause.setAttribute('aria-pressed',String(userPaused));}
  function placeBubble(){if(!opened)return;const rect=bubble.getBoundingClientRect();const width=rect.width||280,height=rect.height||210;const x=Math.max(12,Math.min(window.innerWidth-width-12,position.x+46-width/2));const above=position.y-height-12;const y=above>=12?above:Math.min(window.innerHeight-height-12,position.y+92+10);bubble.style.left=`${x-position.x}px`;bubble.style.top=`${Math.max(12,y)-position.y}px`;}
  function nextCorner(){const points=[{x:bounds.left,y:bounds.bottom},{x:bounds.right,y:bounds.bottom},{x:bounds.right,y:bounds.top},{x:bounds.left,y:bounds.top}];target=points[corner%4];corner=(corner+1)%4;}
  function measure(){const nav=document.querySelector('.mobile-nav'),navHeight=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().height:0;bounds=wanderBounds(window.innerWidth,window.innerHeight,92,navHeight);if(pinned&&userPaused){position={x:bounds.left+pinned.x*(bounds.right-bounds.left),y:12+pinned.y*(bounds.bottom-12)};}else{position=pinnedPosition(position,bounds);}nextCorner();placeBubble();paint();}
  function scanObstacles(){obstacles=[...document.querySelectorAll('button,a,input,textarea,select,summary')].filter(el=>!panel.contains(el)&&el.getClientRects().length).map(el=>el.getBoundingClientRect());}
  function intersectsControl(point){return obstacles.some(r=>point.x<r.right+5&&point.x+92>r.left-5&&point.y<r.bottom+5&&point.y+92>r.top-5);}
  function loop(now){if(destroyed)return;const delta=last?Math.min((now-last)/1000,.05):0;last=now;
    if(!quiet&&!reduced.matches&&!userPaused&&!opened&&!reasons.size&&!document.hidden){
      if(now-lastObstacleScan>750){scanObstacles();lastObstacleScan=now;}
      const next=stepToward(position,target,delta*32);
      if(intersectsControl(next)){nextCorner();}else{panel.dataset.direction=target.x<position.x?'left':'right';position={x:next.x,y:next.y};if(next.arrived)nextCorner();}
    }
    paint();frame=requestAnimationFrame(loop);
  }
  function setOpen(value,{restoreFocus=false}={}){opened=value;bubble.hidden=!value;avatar.setAttribute('aria-expanded',String(value));if(value){placeBubble();}else if(restoreFocus)avatar.focus({preventScroll:true});paint();}
  const enter=e=>{if(e.pointerType==='mouse'||e.pointerType==='pen'){reasons.add('hover');paint();}};
  const leave=()=>{reasons.delete('hover');paint();};
  const focus=()=>{reasons.add('focus');paint();};
  const blur=e=>{if(!panel.contains(e.relatedTarget)){reasons.delete('focus');paint();}};
  function keepHere(){userPaused=true;pinned={x:(position.x-bounds.left)/Math.max(1,bounds.right-bounds.left),y:(position.y-12)/Math.max(1,bounds.bottom-12)};onPositionChange(pinned);onPauseChange(true);paint();}
  const pointerDown=e=>{if(e.button!==0||e.isPrimary===false)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,origin:{...position},moved:false};reasons.add('drag');avatar.setPointerCapture?.(e.pointerId);paint();};
  const pointerMove=e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;drag.moved=true;setOpen(false);position=pinnedPosition({x:drag.origin.x+e.clientX-drag.x,y:drag.origin.y+e.clientY-drag.y},bounds);panel.dataset.dragging='true';paint();e.preventDefault();};
  const pointerEnd=e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved,origin=drag.origin;drag=null;reasons.delete('drag');panel.dataset.dragging='false';if(e.type==='pointercancel'){position=origin;}else if(moved){suppressClickUntil=Date.now()+500;keepHere();}if(avatar.hasPointerCapture?.(e.pointerId))avatar.releasePointerCapture(e.pointerId);paint();};
  const keyboardMove=e=>{if(e.target!==avatar||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?30:12;position=pinnedPosition({x:position.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),y:position.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)},bounds);keepHere();};
  const clickAvatar=e=>{if(e.detail!==0&&Date.now()<suppressClickUntil){e.preventDefault();e.stopPropagation();return;}setOpen(!opened);};
  const closeClick=e=>{setOpen(false,{restoreFocus:e.detail===0});if(e.detail!==0&&panel.contains(document.activeElement))document.activeElement.blur();};
  const pauseClick=e=>{userPaused=!userPaused;onPauseChange(userPaused);if(!userPaused){setOpen(false,{restoreFocus:e.detail===0});if(e.detail!==0&&panel.contains(document.activeElement))document.activeElement.blur();}paint();};
  const escape=e=>{if(e.key==='Escape'&&opened){e.preventDefault();setOpen(false,{restoreFocus:true});}};
  const outside=e=>{if(opened&&!panel.contains(e.target))setOpen(false);};
  const visibility=()=>{last=0;paint();};
  panel.addEventListener('pointerenter',enter);panel.addEventListener('pointerleave',leave);panel.addEventListener('focusin',focus);panel.addEventListener('focusout',blur);
  avatar.addEventListener('pointerdown',pointerDown);avatar.addEventListener('pointermove',pointerMove);avatar.addEventListener('pointerup',pointerEnd);avatar.addEventListener('pointercancel',pointerEnd);avatar.addEventListener('keydown',keyboardMove);avatar.addEventListener('click',clickAvatar);close.addEventListener('click',closeClick);pause.addEventListener('click',pauseClick);panel.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside);document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',measure);reduced.addEventListener('change',measure);
  measure();if(!(pinned&&userPaused))position={x:bounds.left,y:bounds.bottom};paint();frame=requestAnimationFrame(loop);
  return {
    setQuiet(value){if(quiet!==value){quiet=value;paint();}},
    setPaused(value){if(userPaused!==value){userPaused=value;paint();}},
    open(){setOpen(true);},
    contextChanged(){const speech=panel.querySelector('#bevel-message');speech.dataset.tip='false';},
    destroy(){destroyed=true;cancelAnimationFrame(frame);panel.removeEventListener('pointerenter',enter);panel.removeEventListener('pointerleave',leave);panel.removeEventListener('focusin',focus);panel.removeEventListener('focusout',blur);avatar.removeEventListener('pointerdown',pointerDown);avatar.removeEventListener('pointermove',pointerMove);avatar.removeEventListener('pointerup',pointerEnd);avatar.removeEventListener('pointercancel',pointerEnd);avatar.removeEventListener('keydown',keyboardMove);avatar.removeEventListener('click',clickAvatar);close.removeEventListener('click',closeClick);pause.removeEventListener('click',pauseClick);panel.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',measure);reduced.removeEventListener('change',measure);}
  };
}
