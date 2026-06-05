'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SHARP_TO_FLAT = {'A#':'Bb','C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab'};
const FLAT_TONIC_NAMES = new Set(['F','A#','D#','G#','C#']);
const NUM_FRETS = 24;
const STRING_SCALE_FACTOR = 0.2;
const SCALE_LENGTH = 25.5;
const CHORD_COLORS = ['#636EFA','#EF553B','#00CC96','#AB63FA','#FFA15A','#19D3F3','#FF6692','#B6E880','#FF97FF','#FECB52'];

const THEMES = {
  light: {
    bg: 'white', line: 'black',
    root_fill: 'rgba(0,0,0,0.8)', scale_fill: 'rgba(0,0,0,0.1)',
    base_fill: 'rgba(255,255,255,0.3)', marker_border: 'black', annotation: 'black',
  },
  dark: {
    bg: '#1e1e2e', line: '#cdd6f4',
    root_fill: 'rgba(205,214,244,0.9)', scale_fill: 'rgba(205,214,244,0.15)',
    base_fill: 'rgba(0,0,0,0.3)', marker_border: '#cdd6f4', annotation: '#cdd6f4',
  },
};

const SCALES = [
  { label: 'Diatonic',        value: '2212221'  },
  { label: 'Harmonic minor',  value: '2122131'  },
  { label: 'Melodic minor',   value: '2122221'  },
  { label: 'Hungarian minor', value: '2131131'  },
  { label: 'Pentatonic',      value: '22323'    },
  { label: 'Major Blues',     value: '211323'   },
  { label: 'Augmented',       value: '313131'   },
  { label: 'Diminished',      value: '21212121' },
];

const MODES = {
  '2212221': [
    { label: '1: Ionian (Natural Major)',  value: 0, title: '1: Ionian (Natural Major)' },
    { label: '2: Dorian',                 value: 1, title: '2: Dorian' },
    { label: '3: Phrygian',               value: 2, title: '3: Phrygian' },
    { label: '4: Lydian',                 value: 3, title: '4: Lydian' },
    { label: '5: Mixolydian',             value: 4, title: '5: Mixolydian' },
    { label: '6: Aeolian (Natural Minor)', value: 5, title: '6: Aeolian (Natural Minor)' },
    { label: '7: Locrian',                value: 6, title: '7: Locrian' },
  ],
  '2122131': [
    { label: '1: Aeolian ♮7 (Harmonic minor)',  value: 0, title: '1: Aeolian ♮7 (Harmonic minor)' },
    { label: '2: Locrian ♮6',                   value: 1, title: '2: Locrian ♮6' },
    { label: '3: Ionian #6 (Augmented major)',   value: 2, title: '3: Ionian #6 (Augmented major)' },
    { label: '4: Ukrainian Dorian',              value: 3, title: '4: Ukrainian Dorian (Dorian #11, Romanian Minor, Nikriz, Mi Sheberakh)' },
    { label: '5: Phrygian Dominant',             value: 4, title: '5: Phrygian Dominant (Hijaz, Double Harmonic Major b7, Freygish)' },
    { label: '6: Lydian #9',                     value: 5, title: '6: Lydian #9' },
    { label: '7: Super Locrian bb7',             value: 6, title: '7: Super Locrian bb7 (Altered Diminished, Ultralocrian)' },
  ],
  '2122221': [
    { label: '1: Melodic minor (Jazz minor)',    value: 0, title: '1: Melodic minor (Jazz minor)' },
    { label: '2: Dorian b2 (Phrygian #6)',       value: 1, title: '2: Dorian b2 (Phrygian #6)' },
    { label: '3: Lydian Augmented',              value: 2, title: '3: Lydian Augmented' },
    { label: '4: Lydian Dominant (Overtone)',    value: 3, title: '4: Lydian Dominant (Overtone Scale)' },
    { label: '5: Mixolydian b6',                 value: 4, title: '5: Mixolydian b6' },
    { label: '6: Aeolian b5 (Locrian #2)',       value: 5, title: '6: Aeolian b5 (Locrian #2)' },
    { label: '7: Altered Scale (Super Locrian)', value: 6, title: '7: Altered Scale (Super Locrian)' },
  ],
  '2131131': [
    { label: 'Double Harmonic Minor (Hungarian Minor)', value: 0, title: 'Double Harmonic Minor (Hungarian Minor)' },
    { label: 'Oriental',                               value: 1, title: 'Oriental' },
    { label: 'Ionian ♯2 ♯5',                           value: 2, title: 'Ionian ♯2 ♯5' },
    { label: 'Locrian bb3 bb7',                        value: 3, title: 'Locrian bb3 bb7' },
    { label: 'Double harmonic major',                  value: 4, title: 'Double harmonic major (Phrygian Dominant #7)' },
    { label: 'Lydian #2 #6',                           value: 5, title: 'Lydian #2 #6' },
    { label: 'Ultraphrygian',                          value: 6, title: 'Ultraphrygian (Phrygian b4 bb7)' },
  ],
  '22323': [
    { label: '1: Pentatonic Major',      value: 0, title: '1: Pentatonic Major (Ionian Pentatonic)' },
    { label: '2: Dorian Pentatonic',     value: 1, title: '2: Dorian Pentatonic' },
    { label: '3: Phrygian Pentatonic',   value: 2, title: '3: Phrygian Pentatonic' },
    { label: '4: Mixolydian Pentatonic', value: 3, title: '4: Mixolydian Pentatonic' },
    { label: '5: Pentatonic Minor',      value: 4, title: '5: Pentatonic Minor (Aeolian Pentatonic)' },
  ],
  '211323': [
    { label: '1: Major Blues (Ionian)',  value: 0, title: '1: Major Blues (Ionian)' },
    { label: '4: Minor Blues (Aeolian)', value: 3, title: '4: Minor Blues (Aeolian)' },
  ],
  '313131': [
    { label: '1: Major Augmented', value: 0, title: '1: Major Augmented' },
    { label: '2: Minor Augmented', value: 1, title: '2: Minor Augmented' },
  ],
  '21212121': [
    { label: '1: Diminished',           value: 0, title: '1: Diminished' },
    { label: '2: Alternate Diminished', value: 1, title: '2: Alternate Diminished' },
  ],
};

const TONIC_OPTIONS = [
  { label: 'A',        value: 'A'  },
  { label: 'B♭ (A#)', value: 'A#' },
  { label: 'B',        value: 'B'  },
  { label: 'C',        value: 'C'  },
  { label: 'D♭ (C#)', value: 'C#' },
  { label: 'D',        value: 'D'  },
  { label: 'E♭ (D#)', value: 'D#' },
  { label: 'E',        value: 'E'  },
  { label: 'F',        value: 'F'  },
  { label: 'F# (G♭)', value: 'F#' },
  { label: 'G',        value: 'G'  },
  { label: 'A♭ (G#)', value: 'G#' },
];

const CHORD_INTERVALS = {
  maj:  [0,4,7],
  min:  [0,3,7],
  dim:  [0,3,6],
  aug:  [0,4,8],
  sus2: [0,2,7],
  sus4: [0,5,7],
  '7':  [0,4,7,10],
  maj7: [0,4,7,11],
  min7: [0,3,7,10],
  dim7: [0,3,6,9],
  add9: [0,4,7,14],
};

const CHORD_INTERVAL_LABELS = {
  maj:  ['R','3','5'],
  min:  ['R','m3','5'],
  dim:  ['R','m3','b5'],
  aug:  ['R','3','A5'],
  sus2: ['R','2','5'],
  sus4: ['R','4','5'],
  '7':  ['R','3','5','m7'],
  maj7: ['R','3','5','7'],
  min7: ['R','m3','5','m7'],
  dim7: ['R','m3','b5','bb7'],
  add9: ['R','3','5','9'],
};

const CHORD_TYPES = ['maj','min','dim','aug','sus2','sus4','7','maj7','min7','dim7','add9'];
const CHORD_ROMAN = ['I','II','III','IV','V','VI','VII'];
const DEFAULT_STRING_LABELS = ['G#0','C#1','E1','B1','E2','A2','D3','G3','B3','E4'];

// ── Music theory ──────────────────────────────────────────────────────────────

function validateNote(note) {
  if (note[0] === 'E' && note[1] === '#') return 'F' + note.slice(2);
  if (note[0] === 'B' && note[1] === '#') return 'C' + note.slice(2);
  if (note[0] === 'F' && note[1] === 'b') return 'E' + note.slice(2);
  if (note[0] === 'C' && note[1] === 'b') return 'B' + note.slice(2);
  return note;
}

function extractNoteAndOctave(note) {
  note = validateNote(note);
  if (note.length === 2)
    return { name: note[0], accidental: '', octave: parseInt(note[1]) };
  if (note.length === 3 && (note[1] === '#' || note[1] === 'b'))
    return { name: note[0], accidental: note[1], octave: parseInt(note[2]) };
  if (note.length === 3)
    return { name: note[0], accidental: '', octave: parseInt(note.slice(1)) };
  if (note.length === 4 && (note[1] === '#' || note[1] === 'b'))
    return { name: note[0], accidental: note[1], octave: parseInt(note.slice(2)) };
  throw new Error(`Invalid note format: ${note}`);
}

function noteToFrequency(note) {
  const { name, accidental, octave } = extractNoteAndOctave(note);
  let fullNote = name + accidental;
  if (accidental === 'b') {
    fullNote = NOTE_NAMES[(NOTE_NAMES.indexOf(name) - 1 + 12) % 12];
  }
  const n = NOTE_NAMES.indexOf(fullNote);
  if (n === -1) throw new Error(`Invalid note: ${note}`);
  const d = n - NOTE_NAMES.indexOf('A') + (octave - 4) * 12;
  return Math.round(440 * Math.pow(2, d / 12) * 100) / 100;
}

function transposeNote(note, semitoneOffset) {
  note = validateNote(note);
  const { name, accidental, octave } = extractNoteAndOctave(note);
  let fullNote = name + accidental;
  if (accidental === 'b') {
    fullNote = NOTE_NAMES[(NOTE_NAMES.indexOf(name) - 1 + 12) % 12];
  }
  const semitone = octave * 12 + NOTE_NAMES.indexOf(fullNote) + semitoneOffset;
  if (semitone < 0) throw new Error('Note below C0');
  return NOTE_NAMES[semitone % 12] + Math.floor(semitone / 12);
}

function isOctaveOfNote(note, comparison) {
  return validateNote(note).match(/^[A-G](#|b)?/)[0] ===
         validateNote(comparison).match(/^[A-G](#|b)?/)[0];
}

function shouldUseFlats(tonic) {
  return FLAT_TONIC_NAMES.has(tonic.match(/^[A-G](#|b)?/)[0]);
}

function enharmonic(note, useFlats) {
  if (!useFlats) return note;
  const m = note.match(/^[A-G]#?/)[0];
  return (SHARP_TO_FLAT[m] || m) + note.slice(m.length);
}

function noteName(note, useFlats = false) {
  return enharmonic(note, useFlats).match(/^[A-G](#|b)?/)[0];
}

function displayNote(note) {
  // Replace flat accidental 'b' with the musical flat symbol ♭ for display only.
  // Matches uppercase note letter A-G followed by lowercase 'b' (the accidental).
  return note.replace(/([A-G])b/g, '$1♭');
}

function buildScaleNotes(tonic, scalePattern, mode) {
  let current = tonic + '0';
  const notes = [current];
  for (const ch of scalePattern.slice(0, -1)) {
    current = transposeNote(current, parseInt(ch));
    notes.push(current);
  }
  const n = mode % notes.length;
  return [...notes.slice(n), ...notes.slice(0, n)];
}

// ── Settings (localStorage) ───────────────────────────────────────────────────

const STORAGE_KEY = 'guitar_map_settings';
const DEFAULT_STRINGS = [...DEFAULT_STRING_LABELS].reverse(); // index 0 = top string

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function persistState() {
  const s = {
    num_strings: state.numStrings,
    tonic: state.tonic, scale: state.scale, mode: state.mode, theme: state.theme,
  };
  for (let i = 0; i < 10; i++) s[`string_${i + 1}`] = state.strings[i];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ── Application state ─────────────────────────────────────────────────────────

const saved = loadSettings();
const state = {
  numStrings: saved?.num_strings ?? 8,
  strings: Array.from({ length: 10 }, (_, i) => saved?.[`string_${i + 1}`] ?? DEFAULT_STRINGS[i]),
  tonic: saved?.tonic ?? 'C',
  scale: saved?.scale ?? '2212221',
  mode:  saved?.mode  ?? 0,
  theme: saved?.theme ?? 'light',
  activeChord: null,
};

// Clamp saved mode to valid values for the saved scale
{
  const valid = MODES[state.scale].map(m => m.value);
  if (!valid.includes(state.mode)) state.mode = MODES[state.scale][0].value;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}

// ── Mode dropdown ─────────────────────────────────────────────────────────────

function renderModeDropdown() {
  const sel = document.getElementById('mode');
  const options = MODES[state.scale];
  sel.innerHTML = '';
  for (const opt of options) {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label.split('(')[0].trim();
    el.title = opt.title;
    sel.appendChild(el);
  }
  const valid = options.map(o => o.value);
  if (!valid.includes(state.mode)) state.mode = options[0].value;
  sel.value = state.mode;
}

// ── String input visibility ───────────────────────────────────────────────────

function renderStringVisibility() {
  for (let i = 1; i <= 10; i++) {
    document.getElementById(`string-row-${i}`).style.display = i <= state.numStrings ? '' : 'none';
  }
}

// ── Chord buttons ─────────────────────────────────────────────────────────────

function renderChordButtons() {
  const notesInScale = buildScaleNotes(state.tonic, state.scale, state.mode);
  const useFlats = shouldUseFlats(state.tonic);

  for (let i = 0; i < 7; i++) {
    let rowVisible = false;

    for (let j = 0; j < CHORD_TYPES.length; j++) {
      const chordType = CHORD_TYPES[j];
      const col = document.getElementById(`chord-col-${i}-${j}`);

      if (i >= notesInScale.length) { col.style.display = 'none'; continue; }

      const notesInChord = CHORD_INTERVALS[chordType].map(iv => transposeNote(notesInScale[i], iv));
      const inScale = notesInChord.every(n => notesInScale.some(sn => isOctaveOfNote(n, sn)));

      col.style.display = inScale ? '' : 'none';
      if (inScale) {
        document.getElementById(`chord-btn-${i}-${j}`).textContent =
          displayNote(noteName(notesInScale[i], useFlats)) + chordType;
        rowVisible = true;
      }
    }

    const row = document.getElementById(`chord-row-${i}`);
    row.style.display = rowVisible ? '' : 'none';
  }
}

// ── Fretboard (Plotly.js) ─────────────────────────────────────────────────────

function buildFretboardData() {
  const tc = THEMES[state.theme] || THEMES.light;
  const lineStyle = { color: tc.line };
  const NOTE_PATTERN = /^[A-G](?:b|#)?(?:[0-9]|10)$/;

  const stringLabels = state.strings.slice(0, state.numStrings).map(validateNote);
  if (!stringLabels.every(s => NOTE_PATTERN.test(s))) return null;

  const notesInScale = buildScaleNotes(state.tonic, state.scale, state.mode);
  const root = notesInScale[0];
  const useFlats = shouldUseFlats(state.tonic);

  let notesInChord = [], chordLabels = [];
  if (state.activeChord) {
    const [rowStr, chordType] = state.activeChord.split('-');
    const rowIdx = parseInt(rowStr) - 1;
    notesInChord = CHORD_INTERVALS[chordType].map(iv => transposeNote(notesInScale[rowIdx], iv));
    chordLabels = CHORD_INTERVAL_LABELS[chordType];
  }

  const traces = [];
  const annotations = [];

  // Nut
  traces.push({ x: [0,0], y: [0, (state.numStrings-1)*STRING_SCALE_FACTOR],
    mode:'lines', line: lineStyle, hoverinfo:'skip', type:'scatter' });

  // Frets
  let xPrev = 0, prev = SCALE_LENGTH, lastX = 0;
  const fretPositions = [];
  const root12_2 = Math.pow(2, 1/12);
  for (let i = 0; i < NUM_FRETS; i++) {
    const tmp = prev / root12_2;
    const x = SCALE_LENGTH - tmp;
    prev = tmp; lastX = x;
    traces.push({ x:[x,x], y:[0,(state.numStrings-1)*STRING_SCALE_FACTOR],
      mode:'lines', line: lineStyle, hoverinfo:'skip', type:'scatter' });
    fretPositions.push(xPrev + (x - xPrev) / 2);
    xPrev = x;
  }

  // String lines + positions
  const stringPositions = [];
  for (let i = 0; i < state.numStrings; i++) {
    const y = i * STRING_SCALE_FACTOR;
    stringPositions.push(y);
    traces.push({ x:[0,lastX], y:[y,y], mode:'lines', line: lineStyle, hoverinfo:'skip', type:'scatter' });
  }

  // Fret position markers (below nut)
  const dotFrets = [1,3,5,7,9,12,15,17,19,21,24];
  for (const fi of dotFrets) {
    const fx = fretPositions[fi - 1];
    if (fi % 12 !== 0) {
      traces.push({ x:[fx], y:[-STRING_SCALE_FACTOR], mode:'markers',
        line:{ color:tc.line, width:2 }, hovertemplate:`${fi}<extra></extra>`, type:'scatter' });
    } else {
      traces.push({ x:[fx-0.05,fx+0.05], y:[-STRING_SCALE_FACTOR,-STRING_SCALE_FACTOR],
        mode:'markers', line:{ color:tc.line, width:2 },
        hovertemplate:`${fi}<extra></extra>`, type:'scatter' });
    }
  }

  // Note markers per string
  const strPosRev = [...stringPositions].reverse();
  for (let si = 0; si < state.numStrings; si++) {
    const baseNote = stringLabels[si];
    const y = strPosRev[si];

    annotations.push({
      xref:'paper', x:0, xanchor:'right', yref:'y', y,
      text: displayNote(enharmonic(baseNote, useFlats)),
      showarrow: false, font:{ color: tc.annotation },
    });

    // Invisible hover marker at open string position
    traces.push({ x:[0], y:[y], mode:'markers',
      hovertemplate:`${displayNote(enharmonic(baseNote, useFlats))} (${noteToFrequency(baseNote)}Hz)<extra></extra>`,
      marker:{ size:1, color:tc.line }, type:'scatter' });

    addNoteMarker(traces, 0, y, baseNote, root, notesInScale, notesInChord, chordLabels, tc);

    for (let fi = 0; fi < NUM_FRETS; fi++) {
      const note = transposeNote(baseNote, fi + 1);
      traces.push({ x:[fretPositions[fi]], y:[y], mode:'markers',
        hovertemplate:`${displayNote(enharmonic(note, useFlats))} (${noteToFrequency(note)}Hz)<extra></extra>`,
        marker:{ size:1, color:tc.line }, type:'scatter' });
      addNoteMarker(traces, fretPositions[fi], y, note, root, notesInScale, notesInChord, chordLabels, tc);
    }
  }

  const layout = {
    showlegend: false,
    plot_bgcolor: tc.bg, paper_bgcolor: tc.bg,
    margin: { t:10, l:48, b:10, r:10 },
    height: state.numStrings * 30 + 20,
    autosize: true,
    xaxis: { visible:false, fixedrange:true, range:[-0.5, lastX+0.3] },
    yaxis: { visible:false, fixedrange:true },
    annotations,
  };

  return { traces, layout };
}

function addNoteMarker(traces, x, y, note, root, notesInScale, notesInChord, chordLabels, tc) {
  let color = null;
  if (isOctaveOfNote(root, note)) color = tc.root_fill;
  for (const sn of notesInScale.slice(1)) {
    if (isOctaveOfNote(note, sn)) { color = color ?? tc.scale_fill; }
  }
  if (!color) return;

  let chordLabel = null;
  for (let j = 0; j < notesInChord.length; j++) {
    if (isOctaveOfNote(notesInChord[j], note)) {
      color = CHORD_COLORS[j];
      chordLabel = chordLabels[j];
      break;
    }
  }

  const marker = { color, size:20, line:{ color:tc.marker_border, width:2 } };
  if (chordLabel) {
    traces.push({ x:[x], y:[y], mode:'markers+text', hoverinfo:'skip', marker, text:[chordLabel], type:'scatter' });
  } else {
    traces.push({ x:[x], y:[y], mode:'markers', hoverinfo:'skip', marker, type:'scatter' });
  }
}

function renderFretboard() {
  const fig = buildFretboardData();
  if (!fig) return;
  Plotly.react('fretboard', fig.traces, fig.layout, { displayModeBar:false, responsive:true });
}

// ── File I/O ──────────────────────────────────────────────────────────────────

function saveToFile() {
  const s = { num_strings: state.numStrings, tonic: state.tonic,
              scale: state.scale, mode: state.mode, theme: state.theme };
  for (let i = 0; i < 10; i++) s[`string_${i+1}`] = state.strings[i];
  const blob = new Blob([JSON.stringify(s, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'guitar_map.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function applyLoadedSettings(data) {
  if (!data) return;
  if (data.num_strings != null) state.numStrings = data.num_strings;
  for (let i = 0; i < 10; i++) {
    if (data[`string_${i+1}`] != null) state.strings[i] = data[`string_${i+1}`];
  }
  if (data.tonic != null) state.tonic = data.tonic;
  if (data.scale != null) state.scale = data.scale;
  if (data.mode  != null) state.mode  = data.mode;
  if (data.theme != null) state.theme = data.theme;

  document.getElementById('num-strings').value = state.numStrings;
  document.getElementById('tonic').value = state.tonic;
  document.getElementById('scale').value = state.scale;
  document.getElementById('theme-select').value = state.theme;
  for (let i = 1; i <= 10; i++) {
    document.getElementById(`string-${i}`).value = state.strings[i-1];
  }

  const valid = MODES[state.scale].map(m => m.value);
  if (!valid.includes(state.mode)) state.mode = MODES[state.scale][0].value;

  applyTheme();
  state.activeChord = null;
  persistState();
  renderModeDropdown();
  renderStringVisibility();
  renderChordButtons();
  renderFretboard();
}

function openFromFile() {
  document.getElementById('file-input').click();
}

function getSettings() {
  const s = { num_strings: state.numStrings, tonic: state.tonic,
              scale: state.scale, mode: state.mode, theme: state.theme };
  for (let i = 0; i < 10; i++) s[`string_${i+1}`] = state.strings[i];
  return s;
}

// Exposed for Electron menu items
window.GuitarMap = { saveToFile, openFromFile, applyLoadedSettings, getSettings };

// ── DOM initialisation ────────────────────────────────────────────────────────

function buildChordButtonGrid() {
  const container = document.getElementById('chord-buttons');
  for (let i = 0; i < 7; i++) {
    const row = document.createElement('div');
    row.className = 'chord-row';
    row.id = `chord-row-${i}`;

    const label = document.createElement('span');
    label.className = 'chord-row-label';
    label.textContent = CHORD_ROMAN[i];
    row.appendChild(label);

    for (let j = 0; j < CHORD_TYPES.length; j++) {
      const col = document.createElement('span');
      col.id = `chord-col-${i}-${j}`;

      const btn = document.createElement('button');
      btn.id = `chord-btn-${i}-${j}`;
      btn.className = 'chord-btn';
      const chordKey = `${i+1}-${CHORD_TYPES[j]}`;
      btn.addEventListener('click', () => {
        state.activeChord = state.activeChord === chordKey ? null : chordKey;
        renderFretboard();
      });

      col.appendChild(btn);
      row.appendChild(col);
    }
    container.appendChild(row);
  }
}

function buildStringInputs() {
  const container = document.getElementById('string-inputs');
  const reversedDefault = [...DEFAULT_STRING_LABELS].reverse();
  for (let i = 1; i <= 10; i++) {
    const row = document.createElement('div');
    row.className = 'control-row';
    row.id = `string-row-${i}`;

    const label = document.createElement('label');
    label.textContent = `String ${i}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `string-${i}`;
    input.className = 'string-input';
    input.value = state.strings[i-1];
    input.addEventListener('change', () => {
      const v = input.value.trim();
      if (/^[A-G](?:b|#)?(?:[0-9]|10)$/.test(v)) {
        state.strings[i-1] = v;
        state.activeChord = null;
        persistState();
        renderChordButtons();
        renderFretboard();
      }
    });

    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  }
}

function init() {
  // Tonic
  const tonicSel = document.getElementById('tonic');
  for (const opt of TONIC_OPTIONS) {
    const el = document.createElement('option');
    el.value = opt.value; el.textContent = opt.label;
    tonicSel.appendChild(el);
  }
  tonicSel.value = state.tonic;

  // Scale
  const scaleSel = document.getElementById('scale');
  for (const s of SCALES) {
    const el = document.createElement('option');
    el.value = s.value; el.textContent = s.label;
    scaleSel.appendChild(el);
  }
  scaleSel.value = state.scale;

  // Num strings
  const numStrSel = document.getElementById('num-strings');
  for (let i = 4; i <= 10; i++) {
    const el = document.createElement('option');
    el.value = i; el.textContent = i;
    numStrSel.appendChild(el);
  }
  numStrSel.value = state.numStrings;

  // Theme select (in preferences modal)
  const themeSel = document.getElementById('theme-select');
  for (const t of Object.keys(THEMES)) {
    const el = document.createElement('option');
    el.value = t; el.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    themeSel.appendChild(el);
  }
  themeSel.value = state.theme;

  applyTheme();
  buildStringInputs();
  buildChordButtonGrid();
  renderModeDropdown();
  renderStringVisibility();
  renderChordButtons();
  renderFretboard();

  // Controls
  numStrSel.addEventListener('change', () => {
    state.numStrings = parseInt(numStrSel.value);
    state.activeChord = null;
    persistState();
    renderStringVisibility();
    renderChordButtons();
    renderFretboard();
  });

  tonicSel.addEventListener('change', () => {
    state.tonic = tonicSel.value;
    state.activeChord = null;
    persistState();
    renderChordButtons();
    renderFretboard();
  });

  scaleSel.addEventListener('change', () => {
    state.scale = scaleSel.value;
    state.mode = MODES[state.scale][0].value;
    state.activeChord = null;
    persistState();
    renderModeDropdown();
    renderChordButtons();
    renderFretboard();
  });

  document.getElementById('mode').addEventListener('change', e => {
    state.mode = parseInt(e.target.value);
    state.activeChord = null;
    persistState();
    renderChordButtons();
    renderFretboard();
  });

  themeSel.addEventListener('change', () => {
    state.theme = themeSel.value;
    applyTheme();
    persistState();
    renderFretboard();
  });

  // Preferences modal
  document.getElementById('open-preferences-btn').addEventListener('click', () =>
    document.getElementById('preferences-modal').classList.remove('hidden'));
  document.getElementById('close-preferences-btn').addEventListener('click', () =>
    document.getElementById('preferences-modal').classList.add('hidden'));
  document.getElementById('preferences-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('preferences-modal'))
      document.getElementById('preferences-modal').classList.add('hidden');
  });

  // File input for open (web / non-Electron path)
  document.getElementById('file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { applyLoadedSettings(JSON.parse(ev.target.result)); }
      catch (err) { console.error('Failed to parse settings:', err); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

document.addEventListener('DOMContentLoaded', init);
