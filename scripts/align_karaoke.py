"""Align the supplied lyric text to local audio inside reviewed vocal phrases.

Whisper cross-attention alignment supplies word boundaries; no generated ASR
text replaces the user's spelling. Nonlexical gang vocals use rhythmic cues.
"""
import sys,pathlib,json,subprocess,os
ROOT=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'artifacts/karaoke/tools'))
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING']='1'
import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.tokenizer import Tokenizer
from faster_whisper.audio import pad_or_trim

windows=[
 (2.16,5.8),(6.1,9.4),(15.2,19.3),
 (33.2,36.58),(36.58,40.08),(40.08,43.52),(43.52,46.96),
 (46.96,50.46),(50.46,54.08),(54.08,57.56),(57.56,61.48),
 (62.5,65.76),(65.76,69),(69,72.38),(72.38,76.36),(76.36,78.9),(78.9,80.6),(80.6,84.1),
 (97.26,100.94),(100.94,104.46),(104.46,107.92),(107.92,110.48),
 (110.48,114.08),(114.08,117.56),(117.56,121.3),(121.3,124.66),(124.66,127.26),(127.26,129.22),(129.22,132.08),
 (132.24,135.1),(135.1,135.64),(135.64,138.55),(138.55,139.1),(139.1,142.44),(142.44,145.98),
 (145.98,149.36),(149.36,152.82),(153.0,156.4),(156.4,162.52),
 (164.46,167.56),(167.56,171.04),(171.04,174.46),(174.46,178.04),(178.04,182.52),(182.52,186.02),(186.02,190.5),
 (208.86,214.94)
]
lines=[];section=''
for line in (ROOT/'karaoke/lyrics-original.txt').read_text(encoding='utf8').splitlines():
    if line.startswith('['):section=line.strip('[]')
    elif line.strip():lines.append((section,line))
assert len(lines)==len(windows),(len(lines),len(windows))
encoder=next((ROOT/'artifacts/tools/imageio_ffmpeg/binaries').glob('*.exe'))
source=r'C:\Users\jctan\Desktop\Serviett i nord v6.wav'
decoded=subprocess.run([str(encoder),'-v','error','-i',source,'-f','f32le','-ar','16000','-ac','1','pipe:1'],capture_output=True,check=True)
audio=np.frombuffer(decoded.stdout,dtype=np.float32)
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=8,download_root=str(ROOT/'artifacts/karaoke/models'))
tokenizer=Tokenizer(model.hf_tokenizer,model.model.is_multilingual,task='transcribe',language='no')
cues=[];quality=[]
rhythmic={0,1,2,15,17,26,28,30,32,43,44,45,46}
for index,((section,text),(begin,end)) in enumerate(zip(lines,windows)):
    words=text.split();times=[]
    if index in rhythmic:
        weights=[max(2,len(w.strip('(),!'))) for w in words];total=sum(weights);position=begin
        for word,weight in zip(words,weights):
            finish=position+(end-begin)*weight/total;times.append({'text':word,'start':round(position,3),'end':round(finish,3)});position=finish
    else:
        start=max(0,begin-.25);stop=end+.25
        features=model.feature_extractor(audio[int(start*16000):int(stop*16000)])
        num_frames=features.shape[-1]
        encoded=model.encode(pad_or_trim(features))
        token_lists=[tokenizer.encode(' '+w) for w in words]
        tokens=[t for group in token_lists for t in group]
        result=model.model.align(encoded,tokenizer.sot_sequence,[tokens],num_frames,median_filter_width=7)[0]
        pairs=np.array(result.alignments)
        jumps=np.pad(np.diff(pairs[:,0]),(1,0),constant_values=1).astype(bool)
        jump_times=pairs[:,1][jumps]/model.tokens_per_second+start
        boundaries=np.pad(np.cumsum([len(group) for group in token_lists]),(1,0))
        for i,word in enumerate(words):
            ws=float(jump_times[min(boundaries[i],len(jump_times)-1)])
            we=float(jump_times[min(boundaries[i+1],len(jump_times)-1)])
            ws=max(begin,min(end-.02,ws));we=max(ws+.02,min(end,we))
            times.append({'text':word,'start':round(ws,3),'end':round(we,3)})
        quality.append({'id':index,'probability':float(np.mean(result.text_token_probs))})
    cues.append({'id':index,'section':section,'text':text,'start':begin,'end':end,'words':times})
    print(f'{index:02d} {begin:6.2f}-{end:6.2f} {text}',flush=True)
song={'title':'Serviett i nord','duration':round(len(audio)/16000,3),'source':'Serviett i nord v6.wav','method':'local-whisper-forced-alignment-with-reviewed-phrase-windows','cues':cues}
(ROOT/'artifacts/karaoke/generated-timing-candidate.json').write_text(json.dumps(song,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'artifacts/karaoke/alignment-confidence.json').write_text(json.dumps(quality,indent=2))
def timestamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
(ROOT/'artifacts/karaoke/generated-timing-candidate.srt').write_text('\n\n'.join(f'{i+1}\n{timestamp(c["start"])} --> {timestamp(c["end"])}\n{c["text"]}' for i,c in enumerate(cues))+'\n',encoding='utf8')
print('SAVED',len(cues),'cues',sum(len(c['words']) for c in cues),'words',flush=True)
