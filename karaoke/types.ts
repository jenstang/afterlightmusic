export type Word = {text:string;start:number;end:number};
export type Cue = {id:number;section:string;text:string;start:number;end:number;words:Word[]};
export type Song = {title:string;duration:number;source:string;method:string;revision?:number;cues:Cue[]};
export type Mode = 'fill'|'ball';
