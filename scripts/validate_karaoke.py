"""Verify lyric fidelity and the boundaries that drive the karaoke renderer."""
import json, pathlib, math, wave
root=pathlib.Path(__file__).resolve().parent.parent
song=json.loads((root/'karaoke/timing.json').read_text(encoding='utf8'))
supplied=[line for line in (root/'karaoke/lyrics.txt').read_text(encoding='utf8').splitlines() if line.strip() and not line.startswith('[')]
assert supplied==[cue['text'] for cue in song['cues']], 'Lyric text was changed'
previous=0
for cue in song['cues']:
    assert cue['start']>=previous and cue['end']>cue['start']
    assert ' '.join(word['text'] for word in cue['words'])==cue['text']
    word_start=cue['start']
    for word in cue['words']:
        assert all(math.isfinite(word[key]) for key in ['start','end'])
        assert cue['start']<=word['start']<word['end']<=cue['end']+.001,(cue['id'],word)
        assert word['start']>=word_start,(cue['id'],word)
        word_start=word['start']
    previous=cue['end']
with wave.open(str(root/'artifacts/karaoke/source.wav')) as source:
    assert abs(source.getnframes()/source.getframerate()-song['duration'])<.001
print(f'OK: {len(supplied)} lines, {sum(len(c["words"]) for c in song["cues"])} words, {song["duration"]} seconds; exact supplied lyric text preserved.')
