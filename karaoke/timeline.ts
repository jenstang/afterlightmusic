import type {Cue,Song} from './types';

/** Keep a short reading lead-in, but never hold text across an instrumental gap. */
export function cueAt(song:Song,time:number):Cue|undefined{
  for(let i=0;i<song.cues.length;i++){
    const cue=song.cues[i];
    const visibleStart=Math.max(i===0?0:song.cues[i-1].end,cue.start-.45);
    if(time>=visibleStart&&time<cue.end)return cue;
  }
  return undefined;
}

/** Background sections remain stable even while there are no lyrics on screen. */
export function sectionAt(song:Song,time:number):string{
  let section=song.cues[0]?.section??'Intro';
  for(const cue of song.cues){if(cue.start>time)break;section=cue.section;}
  return section;
}
