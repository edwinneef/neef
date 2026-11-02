import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.test-artifacts/ribbon-showcase/final-20261102');
const story=JSON.parse(await readFile(new URL('storyboard.json',import.meta.url),'utf8'));
const font="C\\:/Windows/Fonts/segoeui.ttf", bold="C\\:/Windows/Fonts/seguisb.ttf";
await mkdir(root,{recursive:true});
function run(args){const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024,windowsHide:true});if(r.error||r.status!==0)throw new Error(r.error?.message||r.stderr);}
function duration(file){const r=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file],{cwd:root,encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error(r.stderr);return Number(r.stdout.trim());}
async function textFile(name,text){await writeFile(path.join(root,name),text);return name;}
function draw(file,size,x,y,color='0xf2f5f3',extra=''){return `drawtext=fontfile='${font}':textfile='${file}':expansion=none:fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}${extra}`;}
function normalize(input,output,seconds){run(['-i',input,'-an','-vf',`fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xeef0f2,tpad=stop_mode=clone:stop_duration=${seconds},trim=duration=${seconds},setpts=PTS-STARTPTS,setsar=1`,'-t',String(seconds),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','4',output]);}
function concatenate(files,output){return textFile(output+'.list',files.map(file=>`file '${file}'`).join('\n')).then(()=>run(['-f','concat','-safe','0','-i',output+'.list','-an','-c:v','copy',output]));}

console.log('Preparing typography and independent-export sequences');
normalize('typographyPrototypeClip.mp4','type-prototype.mp4',6);
normalize('appTypographyClip.mp4','type-applied.mp4',6);
await concatenate(['type-prototype.mp4','type-applied.mp4'],'typography-sequence.mp4');
normalize('exportClip.mp4','export-action.mp4',3.4);
normalize('proofClip.mp4','export-proof.mp4',3.6);
await concatenate(['export-action.mp4','export-proof.mp4'],'export-sequence.mp4');

const sourceClips=['heroClip.mp4','heroClip.mp4','nativeUploadClip.mp4','refinedPrototypeClip.mp4','appColorClip.mp4','typography-sequence.mp4','export-sequence.mp4','heroClip.mp4'];
const phases=['An idea, made visible','Navigate → Execute → Evaluate → Follow-up','Prototype first','Refine with feedback','Build the chosen design','Prototype again','Export and verify','A working, verified result'];
const notes=['Working app / recorded interactions','Local images. Scoped work. Verified results.','Earlier prototype / recorded demonstration','Refined prototype / whole interface responds','Color build + desktop checks: 4m 47s','Isolated typography prototype → applied section','Actual downloaded CSS / independent page','Color build + desktop checks: 4m 47s / typography: 5m 22s'];
const sceneFiles=[];
for(let i=0;i<story.segments.length;i++){
  const segment=story.segments[i],seconds=segment.end-segment.start;
  const phase=await textFile(`phase-${i}.txt`,phases[i]);
  const mark=await textFile(`mark-${i}.txt`,'NEEF');
  const note=await textFile(`note-${i}.txt`,notes[i]);
  const generic=await textFile(`caption-${i}.txt`,segment.caption);
  const filters=[`[0:v]fps=30,scale=1792:850:force_original_aspect_ratio=decrease,pad=1792:850:(ow-iw)/2:(oh-ih)/2:color=0xeef0f2,tpad=stop_mode=clone:stop_duration=${seconds},trim=duration=${seconds},setpts=PTS-STARTPTS,setsar=1[app]`,`color=c=0x18262d:s=1920x1080:r=30:d=${seconds}[bg]`,`[bg][app]overlay=64:112:shortest=1`,draw(mark,37,64,34),draw(phase,30,238,39,'0xc0d0c6'),`drawbox=x=64:y=91:w=${Math.round(1792*segment.end/60)}:h=3:color=0x9fb7a4:t=fill`,draw(note,17,88,126,'0x283f43',":box=1:boxcolor=0xf1f4f1@0.95:boxborderw=8")];
  const captions=story.promptCaptions.filter(caption=>caption.start>=segment.start&&caption.end<=segment.end);
  if(captions.length){
    for(let j=0;j<captions.length;j++){
      const caption=captions[j],file=await textFile(`prompt-${i}-${j}.txt`,caption.text);
      const label=await textFile(`prompt-label-${i}-${j}.txt`,caption.label.replace('Prompt (shortened)','Prompt summary').replace('Feedback (shortened)','Feedback summary'));
      const start=caption.start-segment.start,end=caption.end-segment.start,enable=`:enable='between(t,${start},${end-.02})'`;
      filters.push(draw(label,16,64,978,'0x9fb7a4',enable),draw(file,30,64,1008,'0xf2f5f3',enable));
    }
    const last=captions.at(-1).end-segment.start;
    if(last<seconds)filters.push(draw(generic,30,64,1002,'0xf2f5f3',`:enable='gte(t,${last})'`));
  }else filters.push(draw(generic,30,64,1002));
  if(i===7){const timing=await textFile('actual-time.txt','Real build time is separate from this 60-second edit.');filters.push(draw(timing,22,700,1007,'0xc0d0c6'));}
  // The first two filters define labeled sources; the remaining filters form one chain.
  const graph=filters.slice(0,2).join(';')+';'+filters.slice(2).join(',')+'[out]';
  const output=`scene-${i}.mp4`;
  run(['-i',sourceClips[i],'-filter_complex',graph,'-map','[out]','-an','-t',String(seconds),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-threads','4',output]);
  sceneFiles.push(output);console.log(`Rendered shot ${i+1}/8 (${seconds}s)`);
}
await concatenate(sceneFiles,'picture-edit.mp4');
const audioArgs=[],audioFilters=[];
for(let i=0;i<8;i++){
  const input=`audio-final-v2/voice-${String(i).padStart(2,'0')}.wav`,seconds=story.segments[i].end-story.segments[i].start,factor=Math.max(1,duration(input)/(seconds-.28));
  if(factor>1.25)throw new Error('Narration too long for shot '+i+'; revise copy instead of rushing it.');
  audioArgs.push('-i',input);audioFilters.push(`[${i}:a]atempo=${factor.toFixed(5)},adelay=120|120,apad,atrim=duration=${seconds},asetpts=PTS-STARTPTS[a${i}]`);
}
audioFilters.push(Array.from({length:8},(_,i)=>`[a${i}]`).join('')+'concat=n=8:v=0:a=1[audio]');
run([...audioArgs,'-filter_complex',audioFilters.join(';'),'-map','[audio]','-ar','48000','-ac','2','narration.wav']);
const stamp=seconds=>`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')},000`;
await textFile('NEEF-Ribbon.srt',story.segments.map((segment,i)=>`${i+1}\n${stamp(segment.start)} --> ${stamp(segment.end)}\n${segment.narration}\n`).join('\n'));
run(['-i','picture-edit.mp4','-i','narration.wav','-i','NEEF-Ribbon.srt','-map','0:v:0','-map','1:a:0','-map','2:s:0','-c:v','copy','-c:a','aac','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-b:a','192k','-c:s','mov_text','-metadata:s:s:0','language=eng','-t','60','-movflags','+faststart','NEEF-Ribbon-60s.mp4']);
run(['-ss','2','-i','NEEF-Ribbon-60s.mp4','-frames:v','1','poster.png']);
console.log('Finished '+path.join(root,'NEEF-Ribbon-60s.mp4'));
