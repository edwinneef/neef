import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Bounded fallback when the shared preview cannot capture. One isolated browser,
// localhost prototypes only; never attaches to the user's browser/profile.
const root=path.resolve(process.argv[2]||'.test-artifacts/ribbon-showcase/four-20261102');
await mkdir(root,{recursive:true});
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--no-first-run','--remote-debugging-port=9446',
  `--user-data-dir=${path.join(root,'capture-profile')}`,'about:blank'
],{windowsHide:true,stdio:'ignore'});
let socket;
try{
  let pages;
  for(let i=0;i<80;i++){
    try{pages=await fetch('http://127.0.0.1:9446/json').then(r=>r.json());if(pages.some(p=>p.type==='page'))break;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const target=pages?.find(p=>p.type==='page');if(!target)throw new Error('Isolated capture browser did not start');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0;const pending=new Map();
  socket.onmessage=e=>{const data=JSON.parse(e.data);if(data.id){const job=pending.get(data.id);pending.delete(data.id);data.error?job.reject(new Error(data.error.message)):job.resolve(data.result);}};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:'http://127.0.0.1:4389/#contact'});
  for(let i=0;i<50;i++){
    const r=await call('Runtime.evaluate',{expression:"typeof setMode==='function' && document.readyState==='complete'",returnByValue:true});
    if(r.result.value)break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const manifest=[];
  for(const mode of ['contact','projection','atlas','proof']){
    await call('Runtime.evaluate',{expression:`location.hash='${mode}';setMode();document.body.style.zoom='.85';new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,awaitPromise:true});
    const state=await call('Runtime.evaluate',{expression:"({title:document.title,mode:document.body.className,loaded:[...document.images].every(i=>i.complete)})",returnByValue:true});
    if(state.result.value.mode!==mode||!state.result.value.loaded)throw new Error('Prototype not ready: '+mode);
    const png=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(path.join(root,mode+'.png'),Buffer.from(png.data,'base64'));
    manifest.push({...state.result.value,path:mode+'.png',url:'http://127.0.0.1:4389/#'+mode});
  }
  await writeFile(path.join(root,'capture-manifest.json'),JSON.stringify(manifest,null,2));
  await call('Browser.close');
  console.log('Captured all four existing prototype directions.');
}finally{socket?.close();if(chrome.exitCode===null)chrome.kill();}
