# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""DawaCheck explainer score (v2): minimal and calm. Soft pads and a felt piano, no drums.

    MOTION_REEL_SKILL=<skill> uv run dawa-explainer/audio/score.py

100 BPM grid (the picture is timed on it), 75 beats = 45 s, D major, one chord per two bars:
D - Bm - G - A. A few piano notes per bar, a sine-like pad underneath, long reverb.
From the reveal (beat 34) a low piano octave joins and the pad opens a little. The end card
holds a single D chord. No kick, shaker, plucks, risers or impacts.
Writes audio/music.wav and beats.json (the designed grid, written exactly).
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


def piano(note, length=2.6, vel=1.0):
    """Felt-piano-like tone: a few decaying partials, soft attack, slight inharmonicity, warm lowpass."""
    n = int(length * SR)
    t = tvec(n)
    f = hz(note)
    x = np.zeros(n)
    for k, (amp, dec) in enumerate([(1.0, 1.6), (0.42, 0.9), (0.22, 0.55), (0.12, 0.35), (0.06, 0.25)], start=1):
        fk = f * k * (1 + 0.0004 * k * k)
        x += amp * np.sin(2 * np.pi * fk * t) * np.exp(-t / dec)
    x *= (1 - np.exp(-t / 0.006)) * vel
    x = filt(x, "lowpass", 2600)
    return x / 1.8


def soft_pad(notes, length, bright=0.0):
    """Sine/triangle pad: no buzz. Slow attack and release."""
    n = int(length * SR)
    t = tvec(n)
    L, R = np.zeros(n), np.zeros(n)
    for i, nt in enumerate(notes):
        f = hz(nt)
        for d, pan in ((-0.0025, 0.3), (0.0025, 0.7)):
            ph = 2 * np.pi * f * (1 + d) * t
            x = np.sin(ph) + 0.18 * (1 + bright) * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
            L += x * np.sqrt(1 - pan); R += x * np.sqrt(pan)
    env = adsr(n, 1.2, 0.5, 0.85, 1.6)
    return np.stack([L, R]) * env / (len(notes) * 2)


PROG = [  # (pad voicing, piano notes for bar 1, bar 2), one chord per two bars
    (["D3", "A3", "F#4"], ["D4", "A4", "F#5"], ["A4", "D5"]),
    (["B2", "F#3", "D4"], ["B3", "F#4", "D5"], ["F#4", "B4"]),
    (["G2", "D3", "B3"], ["G3", "D4", "B4"], ["D4", "G4"]),
    (["A2", "E3", "C#4"], ["A3", "E4", "C#5"], ["E4", "A4"]),
]


def main():
    pad, keysb = (Bus(DUR, BPM) for _ in range(2))
    for bar2 in range(0, 70, 8):
        pv, n1, n2 = PROG[(bar2 // 8) % 4]
        pad.add(soft_pad(pv, T(8.8), bright=0.5 if bar2 >= 34 else 0.0), bar2, 0.5)
        for i, nt in enumerate(n1):                       # a slow rolled chord on the bar
            keysb.add(piano(nt, 3.2, 0.9 - 0.15 * i), bar2 + i * 0.5, 0.3, pan=-0.2 + 0.2 * i)
        for i, nt in enumerate(n2):                       # two answering notes in the second bar
            keysb.add(piano(nt, 2.8, 0.7), bar2 + 5 + i * 1.5, 0.24, pan=0.15)
        if bar2 >= 32:                                    # from the reveal: a low octave underneath
            keysb.add(piano(pv[0].replace("2", "1").replace("3", "2"), 4.0, 0.8), bar2, 0.22)
    # end card: one D chord, let it ring
    pad.add(soft_pad(["D3", "A3", "D4", "F#4"], T(5.5)), 70, 0.5)
    for i, nt in enumerate(["D3", "A3", "F#4", "D5"]):
        keysb.add(piano(nt, 4.5, 0.8), 70 + i * 0.25, 0.28)

    ir = reverb_ir(3.2, 0.55)
    wet_src = keysb.x * 0.8 + pad.x * 0.4
    wet = np.stack([signal.fftconvolve(wet_src[c], ir[c])[: wet_src.shape[1]] for c in range(2)])
    bed = pad.x * 0.8 + keysb.x * 0.9 + wet * 0.5
    bed = np.stack([filt(ch, "highpass", 40) for ch in bed])[:, :N]
    bed /= np.abs(bed).max() + 1e-9
    bed *= 0.5
    fin = int(0.3 * SR)
    bed[:, :fin] *= np.linspace(0, 1, fin)
    fade = int(1.5 * SR)
    bed[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    sf.write(HERE / "music.wav", bed.T, SR, subtype="PCM_24")

    # every note is placed on the designed grid, so write it exactly (a soft piano click fools onset detection)
    grid = {"bpm": BPM, "period": round(BEAT, 6), "offset": 0.0, "beats": [round(i * BEAT, 5) for i in range(NB + 1)],
            "fit_residual_ms": 0.0}
    grid.update({"designed_bpm": BPM, "downbeats": grid["beats"][::4],
                 "sections": {"hook": [0, 14], "problem": [14, 34], "reveal": [34, 40],
                              "product": [40, 66], "values": [66, 70], "end": [70, 75]},
                 "source": "dawa-explainer/audio/score.py designed grid"})
    (FILM / "beats.json").write_text(json.dumps(grid, indent=1))
    print(f"beats: {grid['bpm']} bpm, offset {grid['offset'] * 1000:.1f} ms, fit rms {grid['fit_residual_ms']} ms, dur {DUR:.1f}s")


if __name__ == "__main__":
    main()
