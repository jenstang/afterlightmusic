"""Apply the user's v2 editorial corrections, preserving the first timing pass.

Crowd-vocal boundaries were reviewed on locally isolated vocals. Ordinary verse
and chorus word timings remain intact. Running ASR must not overwrite this edit.
"""
import pathlib,json,subprocess,copy
root=pathlib.Path(__file__).resolve().parent.parent
base=root/'artifacts/karaoke/timing-before-v2.json'
if base.exists():song=json.loads(base.read_text(encoding='utf8'))
else:song=json.loads(subprocess.check_output(['git','show','c053c90:karaoke/timing.json'],cwd=root).decode('utf8'))
old=copy.deepcopy(song['cues'])

def phrase(section,text,intervals):
    words=text.split();assert len(words)==len(intervals),(text,intervals)
    return {'id':0,'section':section,'text':text,'start':intervals[0][0],'end':intervals[-1][1],
            'words':[{'text':word,'start':start,'end':end} for word,(start,end) in zip(words,intervals)]}

intro=[
 phrase('Intro','Hey! Hey! Hey! Hey!',[(1.70,2.42),(2.76,3.14),(3.60,3.90),(3.94,4.22)]),
 phrase('Intro','Tretti år!',[(4.26,4.98),(4.98,5.34)]),
 phrase('Intro','Tretti år!',[(7.88,8.50),(8.50,8.84)]),
 phrase('Intro','Hey! Hey! Hey! Hey!',[(12.04,12.66),(12.98,13.08),(13.38,13.50),(13.64,13.88)]),
 *[phrase('Intro','Hey!',[(start,end)]) for start,end in [(14.02,14.30),(14.52,14.88),(15.20,15.42),(16.46,17.32),(18.44,19.30),(22.02,22.88),(23.14,23.40)]],
 phrase('Intro','Tretti år! Tretti år!',[(24.68,25.28),(25.28,25.52),(25.68,26.10),(26.10,26.44)]),
 phrase('Intro','Hey! Hey! Hey! Hey!',[(26.68,27.10),(27.76,28.00),(28.18,28.48),(28.90,29.56)]),
 phrase('Intro','Oh-oh-oh-oh!',[(29.66,32.72)])
]

# Remove the two requested breakdown replies. Extend the lead phrase to its
# actual ending instead of cutting off "banken" / "appen" to make room for Hey.
body=[]
for cue in old[3:43]:
    if cue['id'] in (30,32):continue
    if cue['id']==17:cue['end']=84.0;cue['words'][-1]['end']=84.0
    if cue['id']==29:cue['end']=135.64;cue['words'][-1]['end']=135.64
    if cue['id']==31:cue['end']=139.10;cue['words'][-1]['end']=139.10
    body.append(cue)

# No Oh caption over the 2:58 buildup. The following crowd-vocal phrases have
# their own intervals, including two separate Oh rounds followed by Hey / Oh.
ending=[
 phrase('Siste refreng','Tretti år!',[(183.28,184.04),(184.04,184.34)]),
 phrase('Siste refreng','Tretti år!',[(184.40,184.92),(184.92,185.20)]),
 phrase('Siste refreng','Tretti år!',[(185.24,185.78),(185.78,186.12)]),
 phrase('Siste refreng','Oh-oh-oh-oh!',[(186.54,188.56)]),
 phrase('Siste refreng','Oh-oh-oh-oh!',[(188.56,191.14)]),
 phrase('Siste refreng','Hey! Hey! Hey!',[(191.56,191.90),(192.14,192.32),(192.56,192.76)]),
 phrase('Siste refreng','Oh-oh-oh-oh!',[(193.00,194.98)]),
 phrase('Outro','Oh-oh-oh-oh!',[(208.86,214.00)]),
 phrase('Outro','Oh-oh-oh-oh!',[(214.00,215.32)])
]
song['cues']=intro+body+ending
song['revision']=2
song['method']='vocal-isolation-assisted-editorial-timing-v2'
for i,cue in enumerate(song['cues']):cue['id']=i
(root/'karaoke/timing.json').write_text(json.dumps(song,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

lines=[];previous=None
for cue in song['cues']:
    if cue['section']!=previous:lines+=['',f'[{cue["section"]}]'];previous=cue['section']
    lines.append(cue['text'])
(root/'karaoke/lyrics.txt').write_text('\n'.join(lines).strip()+'\n',encoding='utf8')
def stamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
srt='\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}' for i,c in enumerate(song['cues']))+'\n'
for folder in ['artifacts/karaoke','output/karaoke']:
    target=root/folder;target.mkdir(exist_ok=True,parents=True);(target/'Serviett-i-nord.srt').write_text(srt,encoding='utf8')
print('Updated',len(song['cues']),'phrases; revision',song['revision'])
