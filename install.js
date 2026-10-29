// iPhone installation is a user action in Safari; no automatic-install promise.
export function installationState({userAgent='',platform='',touchPoints=0,standalone=false,dismissedAt=0,now=Date.now()}){
  const ios=/iPhone|iPad|iPod/i.test(userAgent)||(platform==='MacIntel'&&touchPoints>1);
  return {ios,installed:standalone,showNudge:ios&&!standalone&&(!dismissedAt||now-dismissedAt>=7*86400000)};
}

const dialog=document.querySelector('#install-dialog');
const nudge=document.querySelector('#install-nudge');
const launchers=[...document.querySelectorAll('[data-install-open]')];
const standaloneMedia=window.matchMedia('(display-mode: standalone)');
let nativePrompt=null;

function currentState(){let dismissedAt=0;try{dismissedAt=Number(localStorage.getItem('forge-install-dismissed'))||0;}catch{}return installationState({userAgent:navigator.userAgent,platform:navigator.platform,touchPoints:navigator.maxTouchPoints||0,standalone:standaloneMedia.matches||navigator.standalone===true,dismissedAt});}
function refresh(){const state=currentState();nudge.hidden=!state.showNudge;for(const button of launchers)button.hidden=state.installed;}
async function openInstructions(){
  if(nativePrompt&&!currentState().ios){const pending=nativePrompt;nativePrompt=null;await pending.prompt();await pending.userChoice;return;}
  if(!dialog.open)dialog.showModal();
}
for(const button of launchers)button.addEventListener('click',openInstructions);
document.querySelector('#install-close').addEventListener('click',()=>dialog.close());
document.querySelector('#install-dismiss').addEventListener('click',()=>{try{localStorage.setItem('forge-install-dismissed',String(Date.now()));}catch{}nudge.hidden=true;});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();nativePrompt=event;});
window.addEventListener('appinstalled',()=>{nativePrompt=null;nudge.hidden=true;for(const button of launchers)button.hidden=true;if(dialog.open)dialog.close();});
standaloneMedia.addEventListener('change',refresh);
window.addEventListener('pageshow',refresh);
refresh();
