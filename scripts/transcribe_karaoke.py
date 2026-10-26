"""Local Whisper analysis: source audio is never uploaded to a service.

Install faster-whisper into artifacts/karaoke/tools before running.
The supplied lyric sheet remains the authority; ASR is used only for timing.
"""
import sys, pathlib, json, os, subprocess
ROOT=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'artifacts/karaoke/tools'))
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING']='1'
from faster_whisper import WhisperModel
import numpy as np

source=sys.argv[1] if len(sys.argv)>1 else r'C:\Users\jctan\Desktop\Serviett i nord v6.wav'
model_name=sys.argv[2] if len(sys.argv)>2 else 'small'
model=WhisperModel(model_name,device='cpu',compute_type='int8',cpu_threads=8,download_root=str(ROOT/'artifacts/karaoke/models'))
encoder=next((ROOT/'artifacts/tools/imageio_ffmpeg/binaries').glob('*.exe'))
decoded=subprocess.run([str(encoder),'-v','error','-i',source,'-f','f32le','-ar','16000','-ac','1','pipe:1'],capture_output=True,check=True)
audio=np.frombuffer(decoded.stdout,dtype=np.float32)
segments,info=model.transcribe(audio,language='no',beam_size=3,word_timestamps=True,vad_filter=False,condition_on_previous_text=False,repetition_penalty=1.1,no_repeat_ngram_size=6,
 initial_prompt='Norsk bursdagssang. SpareBank 1. Tretti år. Nittiseks. Serviett i nord. Tolv banker. Nordkapp. Lindesnes. Samfunnsutbytte. Hey! Skål!')
result=[]
for segment in segments:
    entry={'start':segment.start,'end':segment.end,'text':segment.text,'words':[{'text':w.word.strip(),'start':w.start,'end':w.end,'probability':w.probability} for w in segment.words or []]}
    result.append(entry)
    print(f'{segment.start:7.2f} - {segment.end:7.2f}: {segment.text}',flush=True)
    (ROOT/f'artifacts/karaoke/transcript-{model_name}.json').write_text(json.dumps({'duration':info.duration,'segments':result},ensure_ascii=False,indent=2),encoding='utf8')
print('DONE',info.duration,flush=True)
