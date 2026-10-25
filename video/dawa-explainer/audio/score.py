# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""DawaCheck explainer score: light corporate pulse, calm enough for a healthcare product.

    MOTION_REEL_SKILL=<skill> uv run dawa-explainer/audio/score.py

100 BPM, 4/4, 75 beats = 45 s, D major, I-vi-IV-V (D Bm G A) per bar.
  0-8    hook: pad + a quiet plucked arpeggio, nothing else
  8-34   problem: arpeggio, soft shaker on the off-beats, round bass on the roots
  34-70  product: lift at the reveal, a soft kick on 1 and 3, brighter arpeggio, bass in eighths
  70-75  end card: kick drops out, one sustained D chord rings to the end
No risers, impacts or crashes. Writes audio/music.wav and beats.json (measured on the click stem).
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal


def _skill_dir():
    if os.environ.get("MOTION_REEL_SKILL"):
        return Path(os.environ["MOTION_REEL_SKILL"])
    sys.exit("set MOTION_REEL_SKILL to the folder that holds the motion-reel SKILL.md")


sys.path.insert(0, str(_skill_dir() / "scripts"))
from dsp import *  # noqa: E402,F403

HERE = Path(__file__).resolve().parent
FILM = HERE.parent
BPM = 100
BEAT = 60 / BPM
NB = 75
DUR = NB * BEAT
N = int(SR * DUR)
seed(20261025)

CHORDS = [  # (root for bass, pad voicing, arpeggio notes)
    ("D2", ["D3", "F#3", "A3", "D4"], ["D4", "F#4", "A4", "D5", "A4", "F#4", "A4", "D5"]),
    ("B1", ["B2", "D3", "F#3", "B3"], ["B3", "D4", "F#4", "B4", "F#4", "D4", "F#4", "B4"]),
    ("G1", ["G2", "B2", "D3", "G3"], ["G3", "B3", "D4", "G4", "D4", "B3", "D4", "G4"]),
    ("A1", ["A2", "C#3", "E3", "A3"], ["A3", "C#4", "E4", "A4", "E4", "C#4", "E4", "A4"]),
]
T = lambda beats: beats * BEAT
chord_at = lambda b: CHORDS[int(b // 4) % 4]


def shaker(length=0.09):
    n = int(length * SR)
    x = np.random.default_rng(int(length * 1e6)).standard_normal(n)
    x = filt(x, "highpass", 6000)
    return x * np.exp(-tvec(n) / 0.025)


def main():
    pads, arp, perc, bass, click = (Bus(DUR, BPM) for _ in range(5))

    # pads: one chord per bar, the whole film; held D on the end card
    for bar in range(0, 70, 4):
        _, pv, _ = chord_at(bar)
        pads.add(pad_chord(pv, T(4.2), (900, 1500) if bar < 34 else (1300, 2200), attack=0.6, release=0.8), bar, 0.55)
    pads.add(pad_chord(["D3", "F#3", "A3", "D4", "F#4"], T(5.2), (1600, 900), attack=0.3, release=1.5), 70, 0.6)

    # arpeggio in eighths (quiet in the hook, brighter after the reveal)
    for i in range(70 * 2):
        b = i / 2
        notes = chord_at(b)[2]
        nt = notes[i % 8]
        if b < 8:
            g, cut = 0.16, 1800
        elif b < 34:
            g, cut = 0.2, 2400
        else:
            g, cut = 0.24, 3200
        arp.add(pluck([nt], 0.32, cut), b, g, pan=0.25 if i % 2 else -0.25)
    arp.add(pluck(["D5"], 0.9, 2600), 70, 0.22)

    # shaker on the off-beats from the problem section; kick on 1 and 3 from the reveal
    for b in range(8, 70):
        perc.add(shaker(), b + 0.5, 0.05 if b < 34 else 0.07, pan=0.3)
    kicks = [b for b in range(34, 70) if b % 2 == 0]
    for b in kicks:
        perc.add(kick(soft=True), b, 0.55)

    # bass: whole notes on the roots, then eighths after the reveal
    for bar in range(8, 34, 4):
        bass.add(bass_note(chord_at(bar)[0], T(3.8), 500), bar, 0.42)
    for i in range(34 * 2, 70 * 2):
        b = i / 2
        bass.add(bass_note(chord_at(b)[0], BEAT * 0.42, 650), b, 0.36 if i % 2 else 0.44)
    bass.add(bass_note("D2", T(4.5), 400), 70, 0.4)

    # click stem: one tick per beat, used only to measure the grid
    for b in range(NB):
        click.add(pluck(["A5"], 0.05, 6000), b, 1.0)

    pump = sidechain([b * BEAT for b in kicks], pads.x.shape[1], depth=0.25, release=0.12)
    ir = reverb_ir(2.2, 0.45)
    wet_src = pads.x * 0.5 + arp.x * 0.6
    wet = np.stack([signal.fftconvolve(wet_src[c], ir[c])[: wet_src.shape[1]] for c in range(2)])
    bed = pads.x * pump * 0.7 + arp.x * 0.8 + perc.x * 0.8 + bass.x * pump * 0.75 + wet * 0.35
    bed = np.stack([filt(ch, "highpass", 30) for ch in bed])[:, :N]
    bed /= np.abs(bed).max() + 1e-9
    bed *= 0.5
    fin = int(0.08 * SR)
    bed[:, :fin] *= np.linspace(0, 1, fin)
    fade = int(1.2 * SR)
    bed[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    sf.write(HERE / "music.wav", bed.T, SR, subtype="PCM_24")

    grid = measure_beats(click.x[:, :N].mean(axis=0), SR, BPM, n_beats=NB + 1)
    grid.update({"designed_bpm": BPM, "downbeats": grid["beats"][::4],
                 "sections": {"hook": [0, 8], "answer": [8, 14], "problem": [14, 34], "reveal": [34, 40],
                              "product": [40, 66], "values": [66, 70], "end": [70, 75]},
                 "source": "dawa-explainer/audio/score.py click stem"})
    (FILM / "beats.json").write_text(json.dumps(grid, indent=1))
    print(f"beats: {grid['bpm']} bpm, offset {grid['offset'] * 1000:.1f} ms, fit rms {grid['fit_residual_ms']} ms, dur {DUR:.1f}s")


if __name__ == "__main__":
    main()
