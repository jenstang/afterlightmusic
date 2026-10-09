"""Generate a deterministic half-second energy / onset map from the supplied WAV."""
import wave, array, math, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
with wave.open(str(root / 'Triomphe Orchestral.wav'), 'rb') as wav:
    rate, channels = wav.getframerate(), wav.getnchannels()
    duration = wav.getnframes() / rate
    rms, peaks = [], []
    while data := wav.readframes(rate // 2):
        samples = array.array('h', data)
        mono = [(samples[i] + samples[i+1]) / 65536 for i in range(0, len(samples), 24)]
        rms.append(math.sqrt(sum(v*v for v in mono) / len(mono)))
        peaks.append(max(abs(v) for v in mono))
maximum = max(rms)
energy = [round(v / maximum, 4) for v in rms]
onsets = [round(max(0, energy[i] - energy[max(0, i-1)]), 4) for i in range(len(energy))]
out = root / 'src' / 'audio-map.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({'duration':duration, 'step':.5, 'energy':energy, 'onsets':onsets}))
for i in range(0, len(energy), 20):
    part = energy[i:i+20]
    print(f'{i*.5:5.1f}s — {min(part):.2f}..{max(part):.2f}, average {sum(part)/len(part):.2f}')
