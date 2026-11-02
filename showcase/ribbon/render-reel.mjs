import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

// A distinct edit: the original walkthrough and raw recordings stay untouched.
const source=path.resolve(process.argv[2]||'.test-artifacts/ribbon-showcase/final-20261102');
const root=path.resolve(process.argv[3]||'.test-artifacts/ribbon-showcase/reel-20261102');
const four=process.argv[4]==='four';
const terminal=four||process.argv[4]==='terminal';
const story=JSON.parse(await readFile(new URL(four?'terminal-four.json':terminal?'terminal.json':'reel.json',import.meta.url),'utf8'));
const outputName=four?'NEEF-Four-60s':terminal?'NEEF-Terminal-60s':'NEEF-Ribbon-Reel-60s';
await mkdir(root,{recursive:true});
const fonts={sans:'segoeui.ttf',serif:'georgia.ttf',mono:'consola.ttf'};
const phases=['Navigate','Execute','Evaluate','Follow-up'];
const shots=story.shots||[
  {d:3,title:'One screenshot.',sub:'A whole new theme.',card:true,p:-1},
  {d:4,clip:'heroClip.mp4',title:'Move the divider. Change the whole view.',p:-1,close:true},
  {d:4,title:'Your coding agent,',sub:'with a clear loop.',card:true,p:-1,loop:true},
  {d:2,title:'Navigate',sub:'Make the idea visible.',card:true,p:0},
  {d:5,clip:'nativeUploadClip.mp4',title:'Prototype the idea.',prompt:'$neef-prototype build a screenshot-to-theme demo',p:0},
  {d:3,clip:'refinedPrototypeClip.mp4',title:'Stronger colors. A fully themeable preview.',p:0,close:true},
  {d:2,title:'Execute',sub:'Build the chosen direction.',card:true,p:1},
  {d:4,clip:'appColorClip.mp4',title:'From prototype to working app.',prompt:'$neef implement the approved Ribbon app',p:1},
  {d:4,clip:'heroClip.mp4',offset:2,title:'Local colors. Immediate feedback.',p:1,close:true},
  {d:2,title:'Evaluate',sub:'Prove the result works.',card:true,p:2},
  {d:3,clip:'exportClip.mp4',title:'Copy. Download. Use it.',p:2},
  {d:3,clip:'proofClip.mp4',title:'Actual CSS. Another interface.',p:2},
  {d:2,title:'Follow-up',sub:'The next improvement starts here.',card:true,p:3},
  {d:3,title:'What about typography?',sub:'Prototype a section. Keep the app moving.',card:true,p:3,prompt:'$neef-prototype add three font pairings'},
  {d:5,clip:'typographyPrototypeClip.mp4',title:'Clear. Editorial. Compact.',p:3},
  {d:4,clip:'appTypographyClip.mp4',title:'Choose it. Bring it into the app.',prompt:'$neef apply the chosen typography section',p:3},
  {d:7,title:'Your idea,',sub:'carried through.',card:true,p:3,loop:true,end:true}
];
if(shots.reduce((n,s)=>n+s.d,0)!==60)throw new Error('Reel must last 60 seconds');
function run(binary,args){const r=spawnSync(binary,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:2**20});if(r.error||r.status!==0)throw new Error(r.error?.message||r.stderr);return r.stdout;}
function ff(args){run('ffmpeg',['-hide_banner','-loglevel','error','-y',...args]);}
let textIndex=0;
async function type(text,size,x,y,color,font='sans',extra=''){
  const file=`text-${textIndex++}.txt`;await writeFile(path.join(root,file),text);
  return `drawtext=fontfile='C\\:/Windows/Fonts/${fonts[font]}':textfile='${file}':expansion=none:fontsize=${size}:fontcolor=0x${color}:x=${x}:y=${y}${extra}`;
}
function box(x,y,w,h,color,extra=''){return `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=0x${color}:t=fill${extra}`;}
const tiles=[[0,0],[1,0],[1,1],[0,1]];
function mark(x,y,size,p,dark,animated=false){
  const dim=dark?'41382d':'d6cab7',lit=dark?'c9ab83':'79512f';
  return tiles.flatMap(([dx,dy],i)=>{
    const base=box(x+dx*(size+8),y+dy*(size+8),size,size,i===p?lit:dim);
    return animated?[base,box(x+dx*(size+8),y+dy*(size+8),size,size,lit,`:enable='eq(mod(floor(t/0.48),4),${i})'`)]:[base];
  });
}
for(let i=0;i<shots.length;i++){
  const s=shots[i],dark=s.terminal||s.card&&(i%2===0||s.end),bg=dark?'211d18':'efe8da',ink=dark?'ede3d3':'382e25',muted=dark?'b9ac98':'625745';
  let filters=[],inputs=[],head='';
  if(s.grid){
    const names=['Contact sheet','Projection','Atlas','Proof pair'];
    for(const file of ['contact','projection','atlas','proof'])inputs.push('-loop','1','-i',path.join(root,file+'.png'));
    head=`color=c=0x${bg}:s=1920x1080:r=30:d=${s.d}[base];`;
    for(let n=0;n<4;n++)head+=`[${n}:v]crop=1400:600:100:100,scale=850:364,fps=30,setsar=1[tile${n}];`;
    for(let n=0;n<4;n++){
      const x=80+(n%2)*910,y=198+Math.floor(n/2)*416;
      head+=`[${n===0?'base':'grid'+(n-1)}][tile${n}]overlay=${x}:${y}:enable='gte(t,${n*.22})'[grid${n}];`;
      filters.push(await type(names[n],24,x,y-36,ink,'sans',`:enable='gte(t,${n*.22})'`));
    }
    head+='[grid3]';
    filters.push(await type(s.title,40,80,83,ink,'serif'));
    filters.push(await type('Existing prototypes / shortened prompt reconstruction',20,80,1010,muted,'mono'));
  }else if(s.terminal){
    inputs=['-f','lavfi','-i',`color=c=0x${bg}:s=1920x1080:r=30:d=${s.d}`];
    filters.push(await type(s.title,64,100,150,ink,'serif'));
    filters.push(await type('Codex / NEEF',23,100,260,muted,'mono'));
    const stamp=t=>`0:${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
    const escape=t=>t.replaceAll('\\','\\\\').replaceAll('{','\\{').replaceAll('}','\\}').replaceAll('\n','\\N');
    const events=[],speed=Math.min(0.042,(s.d-2)/s.prompt.length);
    for(let c=1;c<=s.prompt.length;c++){
      const start=.25+(c-1)*speed,end=c===s.prompt.length?s.d:.25+c*speed;
      events.push(`Dialogue: 0,${stamp(start)},${stamp(end)},Prompt,,0,0,0,,{\\pos(100,350)}${escape(s.prompt.slice(0,c))}_`);
    }
    const ass=`[Script Info]\nPlayResX: 1920\nPlayResY: 1080\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Prompt,Consolas,38,&H0083ABC9,&H0083ABC9,&H00181D21,&H00181D21,0,0,0,0,100,100,0,0,1,0,0,7,100,100,0,1\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n${events.join('\n')}\n`;
    await writeFile(path.join(root,`typing-${i}.ass`),ass);
    filters.push(`subtitles=filename=typing-${i}.ass`);
    const logStart=.25+s.prompt.length*speed+.15;
    for(let l=0;l<s.log.length;l++)filters.push(await type(s.log[l],29,100,565+l*58,l===0?ink:muted,'mono',`:enable='gte(t,${Math.min(s.d-.8,logStart+l*.3)})'`));
    filters.push(await type('Prompt reconstruction / shortened prompts / real recorded results',22,100,982,muted,'mono'));
  }else if(s.clip){
    inputs=['-ss',String(s.offset||0),'-i',path.join(source,s.clip)];
    // Close crops retain genuine recorded divider, color and font interactions.
    const crop=s.close?'crop=iw*0.94:ih*0.64:iw*0.03:ih*0.20,':'';
    head=`[0:v]${crop}fps=30,scale=1760:800:force_original_aspect_ratio=decrease,pad=1760:800:(ow-iw)/2:(oh-ih)/2:color=0x${bg},tpad=stop_mode=clone:stop_duration=${s.d},trim=duration=${s.d},setsar=1,setpts=PTS-STARTPTS[app];color=c=0x${bg}:s=1920x1080:r=30:d=${s.d}[bg];[bg][app]overlay=80:142:shortest=1,`;
    filters.push(await type(s.title,40,80,83,ink,'serif'));
    if(s.prompt){filters.push(await type('Prompt summary',17,80,967,muted));filters.push(await type(s.prompt,27,80,1000,ink,'mono'));}
    else filters.push(await type(i===11?'Downloaded CSS, loaded on an independent page.':'Recorded app interaction',21,80,995,muted));
  }else{
    inputs=['-f','lavfi','-i',`color=c=0x${bg}:s=1920x1080:r=30:d=${s.d}`];
    filters.push(...mark(135,260,72,s.p,dark,s.loop));
    filters.push(await type(s.title,112,380,"360-16*exp(-6*t)",ink,'serif'));
    filters.push(await type(s.sub,68,384,510,dark?'c9ab83':'79512f','serif'));
    if(s.prompt){filters.push(await type('Prompt summary',20,384,720,muted),await type(s.prompt,30,384,762,ink,'mono'));}
    if(s.loop)filters.push(await type('Navigate   →   Execute   →   Evaluate   →   Follow-up',30,384,690,muted));
    if(s.end){filters.push(await type('neef-landing.netlify.app',28,384,820,ink,'mono'));filters.push(await type('Color build + desktop checks: 4m 47s  /  Typography: 5m 22s',20,80,1000,muted));}
  }
  filters.push(...mark(80,28,13,s.p,dark,s.loop));
  filters.push(await type('NEEF',25,128,29,ink));
  for(let p=0;p<4;p++){
    filters.push(box(1000+p*214,37,10,10,p===s.p?(dark?'c9ab83':'79512f'):(dark?'41382d':'d6cab7')));
    filters.push(await type(phases[p],21,1021+p*214,27,p===s.p?ink:muted));
  }
  filters.push(box(80,1066,1760,2,dark?'41382d':'d6cab7'));
  const elapsed=shots.slice(0,i).reduce((n,s)=>n+s.d,0);
  filters.push(`drawbox=x=80:y=1066:w=${Math.max(1,Math.round(1760*(elapsed+s.d)/60))}:h=2:color=0x${dark?'c9ab83':'79512f'}:t=fill`);
  const graph=head+filters.join(',');
  ff([...inputs,'-filter_complex',graph+'[out]','-map','[out]','-t',String(s.d),'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-threads','4',`shot-${i}.mp4`]);
  console.log(`Reel shot ${i+1}/${shots.length}`);
}
await writeFile(path.join(root,'shots.list'),shots.map((_,i)=>`file 'shot-${i}.mp4'`).join('\n'));
ff(['-f','concat','-safe','0','-i','shots.list','-c','copy','picture.mp4']);
const audioInputs=[],audioFilters=[];
for(let i=0;i<story.segments.length;i++){
  const s=story.segments[i],file=`voice/voice-${String(i).padStart(2,'0')}.wav`;
  const duration=Number(run('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file]));
  const factor=Math.max(1,duration/(s.end-s.start-.4));
  if(factor>1.2)throw new Error(`Shorten narration ${i}`);
  audioInputs.push('-i',file);audioFilters.push(`[${i}:a]atempo=${factor},adelay=160|160,apad,atrim=duration=${s.end-s.start},asetpts=PTS-STARTPTS[a${i}]`);
}
audioFilters.push(story.segments.map((_,i)=>`[a${i}]`).join('')+`concat=n=${story.segments.length}:v=0:a=1[voice]`);
ff([...audioInputs,'-filter_complex',audioFilters.join(';'),'-map','[voice]','-ar','48000','-ac','2','voice.wav']);
const stamp=n=>`00:${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')},000`;
await writeFile(path.join(root,'NEEF-Ribbon-Reel.srt'),story.segments.map((s,i)=>`${i+1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${s.narration}\n`).join('\n'));
// Quiet original synthesized pulse; no licensed music or external assets.
ff(['-f','lavfi','-i',"aevalsrc='0.025*sin(2*PI*82.406*t)*exp(-8*mod(t,0.5))+0.012*sin(2*PI*164.813*t)*exp(-4*mod(t,2))':s=48000:d=60",'-af','afade=t=in:d=1,afade=t=out:st=57:d=3','pulse.wav']);
ff(['-i','picture.mp4','-i','voice.wav','-i','pulse.wav','-i','NEEF-Ribbon-Reel.srt','-filter_complex','[1:a]loudnorm=I=-16:TP=-2:LRA=9[v];[v][2:a]amix=inputs=2:normalize=0,alimiter=limit=0.85[a]','-map','0:v','-map','[a]','-map','3:s','-c:v','copy','-c:a','aac','-b:a','192k','-c:s','mov_text','-metadata:s:s:0','language=eng','-t','60','-movflags','+faststart',outputName+'.mp4']);
ff(['-ss',four?'8':terminal?'1':'54','-i',outputName+'.mp4','-frames:v','1','poster.png']);
const probe=run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',outputName+'.mp4']);
await writeFile(path.join(root,'probe.json'),probe);
const delivery='D:/projects/ribbon-showcase-delivery';
await copyFile(path.join(root,outputName+'.mp4'),path.join(delivery,outputName+'.mp4'));
await copyFile(path.join(root,'NEEF-Ribbon-Reel.srt'),path.join(delivery,four?'NEEF-Four.srt':terminal?'NEEF-Terminal.srt':'NEEF-Ribbon-Reel.srt'));
await copyFile(path.join(root,'poster.png'),path.join(delivery,four?'four-poster.png':terminal?'terminal-poster.png':'reel-poster.png'));
console.log('Delivered the separate 60-second reel.');
