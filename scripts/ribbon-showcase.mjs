import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';

const [command, ...args] = process.argv.slice(2);

function run(binary, parameters) {
  const result = spawnSync(binary, parameters, { encoding: 'utf8', timeout: 60000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed: ${(result.stderr || result.stdout).slice(-3000)}`);
  return result.stdout;
}

function probe(file) {
  return JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.resolve(file)]));
}

async function main() {
  if (command === 'check') {
    const story = JSON.parse(await readFile(new URL('../showcase/ribbon/storyboard.json', import.meta.url), 'utf8'));
    let cursor = 0;
    for (const segment of story.segments) {
      if (segment.start !== cursor || segment.end <= segment.start || !segment.narration || !segment.shot) throw new Error('Storyboard has a gap, overlap or missing narration/shot.');
      cursor = segment.end;
    }
    if (cursor !== 60 || story.durationSeconds !== 60) throw new Error('Storyboard must end at exactly 60 seconds.');
    const words = story.segments.map(segment => segment.narration).join(' ').trim().split(/\s+/).length;
    console.log(JSON.stringify({ durationSeconds: cursor, narrationWords: words, segments: story.segments.length, ffmpeg: run('ffmpeg', ['-version']).split(/\r?\n/)[0], ffprobe: run('ffprobe', ['-version']).split(/\r?\n/)[0] }, null, 2));
    return;
  }
  if (command === 'start' || command === 'finish') {
    if (args.length !== 1) throw new Error('Supply one timing directory.');
    const directory = path.resolve(args[0]);
    await mkdir(directory, { recursive: true });
    const now = Date.now();
    if (command === 'start') {
      const receipt = { startedAt: new Date(now).toISOString(), startedMs: now, purpose: 'Actual build wall time; setup and editing measured separately.' };
      await writeFile(path.join(directory, 'build-start.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
      console.log(JSON.stringify(receipt));
    } else {
      const start = JSON.parse(await readFile(path.join(directory, 'build-start.json'), 'utf8'));
      if (!Number.isFinite(start.startedMs) || start.startedMs > now) throw new Error('Invalid or future build start.');
      const receipt = { startedAt: start.startedAt, finishedAt: new Date(now).toISOString(), elapsedSeconds: (now - start.startedMs) / 1000 };
      await writeFile(path.join(directory, 'build-finish.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
      console.log(JSON.stringify(receipt));
    }
    return;
  }
  if (command === 'probe' && args.length === 1) {
    console.log(JSON.stringify(probe(args[0]), null, 2));
    return;
  }
  if (command === 'normalize' && args.length === 2) {
    const [input, output] = args.map(file => path.resolve(file));
    if (input.toLowerCase() === output.toLowerCase()) throw new Error('Input and output must differ.');
    try {
      await lstat(output);
      throw new Error('Output already exists; choose a new filename.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const original = probe(input);
    if (!original.streams.some(stream => stream.codec_type === 'video')) throw new Error('Input has no video stream.');
    await mkdir(path.dirname(output), { recursive: true });
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', input, '-map', '0:v:0', '-an', '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
    const result = probe(output);
    const video = result.streams.find(stream => stream.codec_type === 'video');
    if (video.width !== 1920 || video.height !== 1080 || video.codec_name !== 'h264' || video.r_frame_rate !== '30/1') throw new Error('Normalized output did not match the editing format.');
    console.log(JSON.stringify({ output, width: video.width, height: video.height, codec: video.codec_name, fps: video.r_frame_rate, durationSeconds: Number(result.format.duration), silentEditingIntermediate: true }, null, 2));
    return;
  }
  throw new Error('Usage: ribbon-showcase.mjs check | start <dir> | finish <dir> | probe <file> | normalize <input> <output>');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
