import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cueAt} from '../karaoke/timeline.ts';
import type {Song} from '../karaoke/types.ts';

const song=JSON.parse(readFileSync(new URL('../karaoke/timing.json',import.meta.url),'utf8')) as Song;
for(const t of [0,84,84.5,90,95,178.1,179,180,181,182,195.1,199,203,206,215.33,216.76]){
  assert.equal(cueAt(song,t),undefined,`Expected a blank frame at ${t}s`);
}
for(const cue of song.cues){
  assert.equal(cueAt(song,(cue.start+cue.end)/2)?.id,cue.id);
  assert.notEqual(cueAt(song,cue.end)?.id,cue.id,`Caption held past its end: ${cue.text}`);
}
assert.equal(cueAt(song,4.5)?.text,'Tretti år!');
assert.equal(cueAt(song,8)?.text,'Tretti år!');
assert.equal(cueAt(song,132.5)?.text,'Først laga vi en app av banken!');
assert.equal(cueAt(song,137)?.text,'Nå har vi laga en bank av appen!');
assert.ok(!song.cues.some(c=>c.section==='Breakdown'&&c.text.includes('Hey')));
assert.equal(song.cues.filter(c=>c.start>=186&&c.start<191.2&&c.text==='Oh-oh-oh-oh!').length,2);
assert.equal(cueAt(song,192.3)?.text,'Hey! Hey! Hey!');
assert.equal(cueAt(song,193.8)?.text,'Oh-oh-oh-oh!');
console.log(`OK: ${song.cues.length} phrases, instrumental gaps, end boundaries and requested edits.`);
