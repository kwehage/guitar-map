'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SHARP_TO_FLAT = {'A#':'Bb','C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab'};
const FLAT_TONIC_NAMES = new Set(['F','A#','D#','G#','C#']);

// Diatonic spelling helpers
const LETTER_NAMES = ['C','D','E','F','G','A','B'];
const LETTER_NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
// How many letter steps (diatonic scale positions) separate a given interval from the root.
// Used to assign the correct letter name to each chord tone.
const INTERVAL_LABEL_LETTER_STEPS = {
  'R':0, 'm2':1, '2':1, 'm3':2, '3':2,
  '4':3, 'b5':4, '5':4, 'A5':4,
  '6':5, 'bb7':6, 'm7':6, '7':6,
  '9':1, '11':3, '13':5,
};
const NUM_FRETS = 24;
const STRING_SCALE_FACTOR = 0.2;
const SCALE_LENGTH = 25.5;
// Colors indexed by semitone distance from the chord root (0 = unison, 11 = major 7th).
// Cool blues anchor stable intervals (root, P5); warm hues convey increasing tension.
const INTERVAL_COLORS = [
  '#4B78C8',  // 0  root       – deep blue
  '#CC2222',  // 1  m2         – red (strong dissonance)
  '#D4B030',  // 2  M2 / 9th  – amber (suspension)
  '#7CBA40',  // 3  m3         – lime (minor character)
  '#30A84C',  // 4  M3         – green (major character)
  '#30B8B8',  // 5  P4 / 11th – teal
  '#B830B8',  // 6  tritone    – magenta
  '#40A8E8',  // 7  P5         – sky blue (stable like root)
  '#7848C8',  // 8  m6 / A5   – purple
  '#C840A8',  // 9  M6 / bb7  – violet-pink
  '#E08030',  // 10 m7         – orange (dominant tension)
  '#E04040',  // 11 M7         – coral red (leading tone)
];
// "Black Metal" palette: red-dominated and grounded in the dark, with two
// deliberate outsiders — a sickly acid green and a frostbitten ash-blue — placed
// on the harshest dissonances (m2, tritone) so the "wrong" notes visually recoil
// against the surrounding embers and oxblood, evoking corpse paint on a pyre.
const BLACK_METAL_INTERVAL_COLORS = [
  '#B8001F',  // 0  root       – blood red (the anchor)
  '#7FBF3F',  // 1  m2         – sickly acid green (poisoned half-step)
  '#E8581C',  // 2  M2 / 9th  – ember orange (smoldering coal)
  '#8B1A1A',  // 3  m3         – dried-blood crimson (brooding minor)
  '#FF2E2E',  // 4  M3         – searing scarlet (major brightness on black)
  '#A6431F',  // 5  P4 / 11th – burnt rust
  '#7C98A6',  // 6  tritone    – frostbitten ash-blue (Diabolus in Musica, corpse-cold)
  '#7A0000',  // 7  P5         – oxblood (deeper than root, foundational)
  '#7A1453',  // 8  m6 / A5   – bruised plum-violet (shadowed unease)
  '#C4711F',  // 9  M6 / bb7  – charred amber
  '#FF5C1A',  // 10 m7         – molten orange (dominant fire)
  '#FF0844',  // 11 M7         – neon blood (searing leading tone)
];
// Compound intervals (9th, 11th, 13th) fold back mod 12 for coloring.
const INTERVAL_LABEL_SEMITONES = {
  'R': 0, '2': 2, 'm3': 3, '3': 4, '4': 5,
  'b5': 6, '5': 7, 'A5': 8, '6': 9, 'bb7': 9,
  'm7': 10, '7': 11, '9': 2, '11': 5, '13': 9,
};
function intervalColor(label) {
  const tc = THEMES[state.theme] || THEMES.light;
  const palette = tc.interval_colors || INTERVAL_COLORS;
  return palette[INTERVAL_LABEL_SEMITONES[label] ?? 0];
}

const THEMES = {
  light: {
    label: 'Light Jazz', is_dark: false,
    bg: 'white', line: 'black',
    root_fill: 'rgba(0,0,0,0.8)', scale_fill: 'rgba(0,0,0,0.1)',
    base_fill: 'rgba(255,255,255,0.3)', annotation: 'black', label_fill: '#ffffff',
    midi_fill: 'rgba(240,200,30,0.9)',
    click_fill: 'rgba(140,60,220,0.85)',
    interval_colors: INTERVAL_COLORS,
    cof: { inactive: '#f0f4f8', active_bg: '#c8deff', active_major: '#4B78C8', active_minor: '#7848C8' },
  },
  dark: {
    label: 'Blues', is_dark: true,
    bg: '#1e1e2e', line: '#cdd6f4',
    root_fill: 'rgba(205,214,244,0.9)', scale_fill: 'rgba(205,214,244,0.15)',
    base_fill: 'rgba(0,0,0,0.3)', annotation: '#cdd6f4', label_fill: '#000000',
    midi_fill: 'rgba(240,200,30,0.85)',
    click_fill: 'rgba(160,80,220,0.85)',
    interval_colors: INTERVAL_COLORS,
    cof: { inactive: '#252535', active_bg: '#1e3050', active_major: '#4B78C8', active_minor: '#7848C8' },
  },
  blackMetal: {
    label: 'Black Metal', is_dark: true,
    bg: '#000000', line: '#ffffff',
    root_fill: 'rgba(255,255,255,0.9)', scale_fill: 'rgba(255,255,255,0.15)',
    base_fill: 'rgba(0,0,0,0.5)', annotation: '#c9a0a0', label_fill: '#000000',
    midi_fill: 'rgba(184,0,31,0.85)',
    click_fill: 'rgba(255,46,46,0.85)',
    interval_colors: BLACK_METAL_INTERVAL_COLORS,
    cof: { inactive: '#1a0a0a', active_bg: '#3a0f0f', active_major: '#B8001F', active_minor: '#8B1A1A' },
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
    { label: '5: Phrygian Dominant',             value: 4, title: '5: Phrygian Dominant (Hijaz, Double Harmonic Major ♭7, Freygish)' },
    { label: '6: Lydian #9',                     value: 5, title: '6: Lydian #9' },
    { label: '7: Super Locrian ♭♭7',             value: 6, title: '7: Super Locrian ♭♭7 (Altered Diminished, Ultralocrian)' },
  ],
  '2122221': [
    { label: '1: Melodic minor (Jazz minor)',    value: 0, title: '1: Melodic minor (Jazz minor)' },
    { label: '2: Dorian ♭2 (Phrygian #6)',       value: 1, title: '2: Dorian ♭2 (Phrygian #6)' },
    { label: '3: Lydian Augmented',              value: 2, title: '3: Lydian Augmented' },
    { label: '4: Lydian Dominant (Overtone)',    value: 3, title: '4: Lydian Dominant (Overtone Scale)' },
    { label: '5: Mixolydian ♭6',                 value: 4, title: '5: Mixolydian ♭6' },
    { label: '6: Aeolian ♭5 (Locrian #2)',       value: 5, title: '6: Aeolian ♭5 (Locrian #2)' },
    { label: '7: Altered Scale (Super Locrian)', value: 6, title: '7: Altered Scale (Super Locrian)' },
  ],
  '2131131': [
    { label: 'Double Harmonic Minor (Hungarian Minor)', value: 0, title: 'Double Harmonic Minor (Hungarian Minor)' },
    { label: 'Oriental',                               value: 1, title: 'Oriental' },
    { label: 'Ionian ♯2 ♯5',                           value: 2, title: 'Ionian ♯2 ♯5' },
    { label: 'Locrian ♭♭3 ♭♭7',                        value: 3, title: 'Locrian ♭♭3 ♭♭7' },
    { label: 'Double harmonic major',                  value: 4, title: 'Double harmonic major (Phrygian Dominant #7)' },
    { label: 'Lydian #2 #6',                           value: 5, title: 'Lydian #2 #6' },
    { label: 'Ultraphrygian',                          value: 6, title: 'Ultraphrygian (Phrygian ♭4 ♭♭7)' },
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
  // Triads
  maj:    [0,4,7],
  min:    [0,3,7],
  dim:    [0,3,6],
  aug:    [0,4,8],
  // Suspended triads
  sus2:   [0,2,7],
  sus4:   [0,5,7],
  // Sixths
  '6':    [0,4,7,9],
  min6:   [0,3,7,9],
  // Sevenths
  '7':    [0,4,7,10],
  maj7:   [0,4,7,11],
  min7:   [0,3,7,10],
  mMaj7:  [0,3,7,11],
  dim7:   [0,3,6,9],
  m7b5:   [0,3,6,10],
  aug7:   [0,4,8,10],
  '7sus4':[0,5,7,10],
  // Add9 (no 7th)
  add9:   [0,4,7,14],
  madd9:  [0,3,7,14],
  // Ninths (with 7th)
  '9':    [0,4,7,10,14],
  maj9:   [0,4,7,11,14],
  min9:   [0,3,7,10,14],
  // Add11 (no 7th/9th)
  add11:  [0,4,7,17],
  madd11: [0,3,7,17],
  // Elevenths (with 7th and 9th)
  '11':   [0,4,7,10,14,17],
  maj11:  [0,4,7,11,14,17],
  min11:  [0,3,7,10,14,17],
  // Thirteenths
  '13':   [0,4,7,10,14,17,21],
  maj13:  [0,4,7,11,14,17,21],
  min13:  [0,3,7,10,14,17,21],
};

const CHORD_INTERVAL_LABELS = {
  maj:    ['R','3','5'],
  min:    ['R','m3','5'],
  dim:    ['R','m3','b5'],
  aug:    ['R','3','A5'],
  sus2:   ['R','2','5'],
  sus4:   ['R','4','5'],
  '6':    ['R','3','5','6'],
  min6:   ['R','m3','5','6'],
  '7':    ['R','3','5','m7'],
  maj7:   ['R','3','5','7'],
  min7:   ['R','m3','5','m7'],
  mMaj7:  ['R','m3','5','7'],
  dim7:   ['R','m3','b5','bb7'],
  m7b5:   ['R','m3','b5','m7'],
  aug7:   ['R','3','A5','m7'],
  '7sus4':['R','4','5','m7'],
  add9:   ['R','3','5','9'],
  madd9:  ['R','m3','5','9'],
  '9':    ['R','3','5','m7','9'],
  maj9:   ['R','3','5','7','9'],
  min9:   ['R','m3','5','m7','9'],
  add11:  ['R','3','5','11'],
  madd11: ['R','m3','5','11'],
  '11':   ['R','3','5','m7','9','11'],
  maj11:  ['R','3','5','7','9','11'],
  min11:  ['R','m3','5','m7','9','11'],
  '13':   ['R','3','5','m7','9','11','13'],
  maj13:  ['R','3','5','7','9','11','13'],
  min13:  ['R','m3','5','m7','9','11','13'],
};

const CHORD_TYPE_DISPLAY = {
  maj:'',    min:'m',  dim:'°',  aug:'+',
  sus2:'sus2', sus4:'sus4',
  '6':'6',   min6:'m6',
  '7':'7',   maj7:'maj7', min7:'m7', mMaj7:'mMaj7',
  dim7:'°7', m7b5:'ø7',  aug7:'+7', '7sus4':'7sus4',
  add9:'add9', madd9:'madd9',
  '9':'9',   maj9:'maj9', min9:'m9',
  add11:'add11', madd11:'madd11',
  '11':'11', maj11:'maj11', min11:'m11',
  '13':'13', maj13:'maj13', min13:'m13',
};

const SCALE_QUALITY = {
  '2212221':  'major',  // diatonic
  '2122131':  'minor',  // harmonic minor
  '2122221':  'minor',  // melodic minor
  '2131131':  'minor',  // hungarian minor
  '22323':    'major',  // pentatonic
  '211323':   'major',  // blues
  '313131':   null,     // augmented (symmetric, no relative key)
  '21212121': null,     // diminished (symmetric, no relative key)
};

const CHORD_TYPES = [
  'maj','min','dim','aug',
  'sus2','sus4',
  '6','min6',
  '7','maj7','min7','mMaj7','dim7','m7b5','aug7','7sus4',
  'add9','madd9',
  '9','maj9','min9',
  'add11','madd11',
  '11','maj11','min11',
  '13','maj13','min13',
];
const CHORD_DISPLAY_SUFFIX = {
  'maj':    '',       'min':    'm',      'dim':    '°',     'aug':    '+',
  'sus2':   'sus2',  'sus4':   'sus4',
  '6':      '6',     'min6':   'm6',
  '7':      '7',     'maj7':   'maj7',   'min7':   'm7',    'mMaj7':  'm(maj7)',
  'dim7':   '°7',    'm7b5':   'ø7',     'aug7':   '+7',    '7sus4':  '7sus4',
  'add9':   'add9',  'madd9':  'madd9',
  '9':      '9',     'maj9':   'maj9',   'min9':   'm9',
  'add11':  'add11', 'madd11': 'madd11',
  '11':     '11',    'maj11':  'maj11',  'min11':  'm11',
  '13':     '13',    'maj13':  'maj13',  'min13':  'm13',
};
const CHORD_ROMAN = ['I','II','III','IV','V','VI','VII'];
const DEFAULT_STRING_LABELS = ['G#0','C#1','E1','B1','E2','A2','D3','G3','B3','E4'];

// ── Circle of Fifths data ─────────────────────────────────────────────────────
// 12 positions starting at the top (C major / A minor), going clockwise.
const COF_DATA = [
  { major: 'C',   minor: 'Am',  sig: '0'   },
  { major: 'G',   minor: 'Em',  sig: '1♯' },
  { major: 'D',   minor: 'Bm',  sig: '2♯' },
  { major: 'A',   minor: 'F♯m', sig: '3♯' },
  { major: 'E',   minor: 'C♯m', sig: '4♯' },
  { major: 'B',   minor: 'G♯m', sig: '5♯' },
  { major: 'F♯',  minor: 'D♯m', sig: '6♯' },
  { major: 'D♭',  minor: 'B♭m', sig: '5♭' },
  { major: 'A♭',  minor: 'Fm',  sig: '4♭' },
  { major: 'E♭',  minor: 'Cm',  sig: '3♭' },
  { major: 'B♭',  minor: 'Gm',  sig: '2♭' },
  { major: 'F',   minor: 'Dm',  sig: '1♭' },
];
// Maps NOTE_NAMES semitone index → COF position (0 = top = C major)
const MAJOR_SEM_TO_COF   = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
// COF position → major key semitone
const COF_POS_MAJOR_SEM  = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
// COF position → relative minor tonic semitone (= major + 9 mod 12)
const COF_POS_MINOR_SEM  = COF_POS_MAJOR_SEM.map(s => (s + 9) % 12);

// ── Treble clef path (from Wikimedia Commons, CC0) ───────────────────────────
// Source SVG viewBox "0 0 8268 11692". Staff lines at y = 6378, 6968, 7559, 8149, 8740
// → spacing 590 units/space.  Clef x-extent: 1186–2621 (width 1435 units).
// Applied with transform="translate(x0-1186·sc, y0-6378·sc) scale(sc,sc)"
// where sc = S/590, x0/y0 = pixel top-left of staff, S = staff space in pixels.
// y increases DOWNWARD in this coordinate system (standard SVG), no y-flip needed.
const TREBLE_CLEF_PATH = 'M 2002,7851 C 1941,7868 1886,7906 1835,7964 C 1784,8023 1759,8088 1759,8158 C 1759,8202 1774,8252 1803,8305 C 1832,8359 1876,8398 1933,8423 C 1952,8427 1961,8437 1961,8451 C 1961,8456 1954,8461 1937,8465 C 1846,8442 1771,8393 1713,8320 C 1655,8246 1625,8162 1623,8066 C 1626,7963 1657,7867 1716,7779 C 1776,7690 1853,7627 1947,7590 L 1878,7235 C 1724,7363 1599,7496 1502,7636 C 1405,7775 1355,7926 1351,8089 C 1353,8162 1368,8233 1396,8301 C 1424,8370 1466,8432 1522,8489 C 1635,8602 1782,8661 1961,8667 C 2022,8663 2087,8652 2157,8634 L 2002,7851 z M 2074,7841 L 2230,8610 C 2384,8548 2461,8413 2461,8207 C 2452,8138 2432,8076 2398,8021 C 2365,7965 2321,7921 2265,7889 C 2209,7857 2146,7841 2074,7841 z M 1869,6801 C 1902,6781 1940,6746 1981,6697 C 2022,6649 2062,6592 2100,6528 C 2139,6463 2170,6397 2193,6330 C 2216,6264 2227,6201 2227,6143 C 2227,6118 2225,6093 2220,6071 C 2216,6035 2205,6007 2186,5988 C 2167,5970 2143,5960 2113,5960 C 2053,5960 1999,5997 1951,6071 C 1914,6135 1883,6211 1861,6297 C 1838,6384 1825,6470 1823,6557 C 1828,6656 1844,6737 1869,6801 z M 1806,6859 C 1761,6697 1736,6532 1731,6364 C 1732,6256 1743,6155 1764,6061 C 1784,5967 1813,5886 1851,5816 C 1888,5746 1931,5693 1979,5657 C 2022,5625 2053,5608 2070,5608 C 2083,5608 2094,5613 2104,5622 C 2114,5631 2127,5646 2143,5666 C 2262,5835 2322,6039 2322,6277 C 2322,6390 2307,6500 2277,6610 C 2248,6719 2205,6823 2148,6920 C 2090,7018 2022,7103 1943,7176 L 2024,7570 C 2068,7565 2098,7561 2115,7561 C 2191,7561 2259,7577 2322,7609 C 2385,7641 2439,7684 2483,7739 C 2527,7793 2561,7855 2585,7925 C 2608,7995 2621,8068 2621,8144 C 2621,8262 2590,8370 2528,8467 C 2466,8564 2373,8635 2248,8681 C 2256,8730 2270,8801 2291,8892 C 2311,8984 2326,9057 2336,9111 C 2346,9165 2350,9217 2350,9268 C 2350,9347 2331,9417 2293,9479 C 2254,9541 2202,9589 2136,9623 C 2071,9657 1999,9674 1921,9674 C 1811,9674 1715,9643 1633,9582 C 1551,9520 1507,9437 1503,9331 C 1506,9284 1517,9240 1537,9198 C 1557,9156 1584,9122 1619,9096 C 1653,9069 1694,9055 1741,9052 C 1780,9052 1817,9063 1852,9084 C 1886,9106 1914,9135 1935,9172 C 1955,9209 1966,9250 1966,9294 C 1966,9353 1946,9403 1906,9444 C 1866,9485 1815,9506 1754,9506 L 1731,9506 C 1770,9566 1834,9597 1923,9597 C 1968,9597 2014,9587 2060,9569 C 2107,9550 2146,9525 2179,9493 C 2212,9461 2234,9427 2243,9391 C 2260,9350 2268,9293 2268,9222 C 2268,9174 2263,9126 2254,9078 C 2245,9031 2231,8968 2212,8890 C 2193,8813 2179,8753 2171,8712 C 2111,8727 2049,8735 1984,8735 C 1875,8735 1772,8713 1675,8668 C 1578,8623 1493,8561 1419,8481 C 1346,8401 1289,8311 1248,8209 C 1208,8108 1187,8002 1186,7892 C 1190,7790 1209,7692 1245,7600 C 1281,7507 1327,7419 1384,7337 C 1441,7255 1500,7180 1561,7113 C 1623,7047 1704,6962 1806,6859 z';

// VexFlow accidental staff positions: 0 = top line, each unit = 1 staff space downward.
// Sharps order: F C G D A E B  |  Flats order: B E A D G C F
const COF_SHARP_POS = [0, 1.5, -0.5, 1, 2.5, 0.5, 2];
const COF_FLAT_POS  = [2, 0.5, 2.5,  1, 3,   1.5, 3.5];

const MINOR_QUALITY_TYPES = new Set([
  'min','min6','min7','mMaj7','m7b5','min9','min11','min13','madd9','madd11',
]);

function romanNumeral(index, chordType) {
  const base = CHORD_ROMAN[index];
  const lower = base.toLowerCase();
  switch (chordType) {
    case 'dim':   return lower + '°';
    case 'dim7':  return lower + '°';
    case 'm7b5':  return lower + 'ø';
    case 'aug':   return base + '+';
    case 'aug7':  return base + '+';
    case 'sus2':  return base + 'sus2';
    case 'sus4':  return base + 'sus4';
    case '7sus4': return base + '7sus4';
    default:      return MINOR_QUALITY_TYPES.has(chordType) ? lower : base;
  }
}

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

function notePitchClass(note) {
  const { name, accidental } = extractNoteAndOctave(validateNote(note));
  let fullNote = name + accidental;
  if (accidental === 'b') fullNote = NOTE_NAMES[(NOTE_NAMES.indexOf(name) - 1 + 12) % 12];
  return NOTE_NAMES.indexOf(fullNote); // 0=C … 11=B, matches MIDI pitchClass = noteNumber % 12
}

function noteNameToMidi(note) {
  const { name, accidental, octave } = extractNoteAndOctave(validateNote(note));
  let fullNote = name + accidental;
  if (accidental === 'b') fullNote = NOTE_NAMES[(NOTE_NAMES.indexOf(name) - 1 + 12) % 12];
  // MIDI middle C (C4) = 60 = 4*12 + 0 + 12
  return octave * 12 + NOTE_NAMES.indexOf(fullNote) + 12;
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

function parentScaleRoot(tonic, scalePattern, mode) {
  const intervals = scalePattern.split('').map(Number);
  const n = mode % intervals.length;
  const offset = intervals.slice(0, n).reduce((a, b) => a + b, 0);
  // Use octave 2 so subtracting up to 11 semitones never goes below C0
  return transposeNote(tonic + '2', -offset);
}

function shouldUseFlats(tonic, scalePattern, mode) {
  const parentRoot = parentScaleRoot(tonic, scalePattern, mode);
  const origRoot = parentRoot.match(/^[A-G](#|b)?/)[0];
  if (SCALE_QUALITY[scalePattern] === 'minor') {
    // The key signature for minor-quality scales matches the relative natural major
    // (3 semitones above the minor tonic). Check both the original parent root
    // (handles tonics already in the flat set, e.g. G#) and the shifted root
    // (handles tonics like G whose relative major Bb is a flat key).
    const shiftedRoot = transposeNote(parentRoot, 3).match(/^[A-G](#|b)?/)[0];
    return FLAT_TONIC_NAMES.has(origRoot) || FLAT_TONIC_NAMES.has(shiftedRoot);
  }
  return FLAT_TONIC_NAMES.has(origRoot);
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
  const intervals = scalePattern.split('').map(Number);
  const n = mode % intervals.length;
  let current = parentScaleRoot(tonic, scalePattern, mode);
  const notes = [current];
  for (let i = 0; i < intervals.length - 1; i++) {
    current = transposeNote(current, intervals[i]);
    notes.push(current);
  }
  return [...notes.slice(n), ...notes.slice(0, n)];
}

// Returns an array of correctly-spelled note name strings (no octave) for each scale
// degree, one letter per degree starting from the tonic. For 7-note scales each letter
// A–G appears exactly once; the accidental is derived from how far the actual semitone
// differs from that letter's natural semitone. For shorter scales (pentatonic, blues)
// falls back to the global useFlats convention.
function diatonicNoteNames(tonic, scalePattern, mode) {
  const scaleNotes = buildScaleNotes(tonic, scalePattern, mode);
  if (scaleNotes.length !== 7) {
    const useFlats = shouldUseFlats(tonic, scalePattern, mode);
    return scaleNotes.map(n => noteName(n, useFlats));
  }
  const useFlats = shouldUseFlats(tonic, scalePattern, mode);
  // For enharmonic tonic notes (A#, C#, D#, F#, G#) pick the flat letter when the key
  // uses flats (e.g. A# → B for Bb keys), otherwise keep the sharp letter.
  const rawTonicLetter = tonic.match(/^[A-G]/)[0];
  let tonicLetterIdx = LETTER_NAMES.indexOf(rawTonicLetter);
  if (tonic.includes('#') && useFlats) tonicLetterIdx = (tonicLetterIdx + 1) % 7;

  return scaleNotes.map((noteWithOctave, i) => {
    const semitone         = NOTE_NAMES.indexOf(noteWithOctave.match(/^[A-G]#?/)[0]);
    const letterIdx        = (tonicLetterIdx + i) % 7;
    const letter           = LETTER_NAMES[letterIdx];
    const naturalSemitone  = LETTER_NATURAL_SEMITONES[letterIdx];
    let diff = semitone - naturalSemitone;
    if (diff >  6) diff -= 12;
    if (diff < -6) diff += 12;
    if (diff ===  0) return letter;
    if (diff ===  1) return letter + '#';
    if (diff === -1) return letter + 'b';
    if (diff ===  2) return letter + '##';
    if (diff === -2) return letter + 'bb';
    return noteWithOctave.match(/^[A-G]#?/)[0];
  });
}

// Returns the diatonic note name for one chord tone given the root note, the root's
// diatonic letter (from diatonicNoteNames), the interval in semitones, and the
// interval label (e.g. 'm3', 'b5') which encodes how many letter steps separate
// the tone from the root.
function diatonicChordToneName(rootNote, rootDiatonicLetter, intervalSemitones, intervalLabel) {
  const letterSteps      = INTERVAL_LABEL_LETTER_STEPS[intervalLabel] ?? 0;
  const rootLetterIdx    = LETTER_NAMES.indexOf(rootDiatonicLetter);
  const letterIdx        = (rootLetterIdx + letterSteps) % 7;
  const letter           = LETTER_NAMES[letterIdx];
  const naturalSemitone  = LETTER_NATURAL_SEMITONES[letterIdx];
  const rootSemitone     = NOTE_NAMES.indexOf(rootNote.match(/^[A-G]#?/)[0]);
  let semitone = (rootSemitone + (intervalSemitones % 12)) % 12;
  let diff = semitone - naturalSemitone;
  if (diff >  6) diff -= 12;
  if (diff < -6) diff += 12;
  if (diff ===  0) return letter;
  if (diff ===  1) return letter + '#';
  if (diff === -1) return letter + 'b';
  if (diff ===  2) return letter + '##';
  if (diff === -2) return letter + 'bb';
  return rootNote.match(/^[A-G]#?/)[0];
}

// ── Preset tunings ────────────────────────────────────────────────────────────
// strings array is high-to-low (string 1 = highest/thinnest)

const TUNINGS = [
  // 4-string bass
  { label: '4 String - Bass Standard - E1, A1, D2, G2',   n: 4, s: ['G2','D2','A1','E1'] },
  { label: '4 String - Bass Drop D - D1, A1, D2, G2',     n: 4, s: ['G2','D2','A1','D1'] },
  { label: '4 String - Bass Drop C - C1, G1, C2, F2',     n: 4, s: ['F2','C2','G1','C1'] },
  { label: '4 String - Bass Drop B - B0, F#1, B1, E2',    n: 4, s: ['E2','B1','F#1','B0'] },
  // 5-string bass
  { label: '5 String - Bass Standard - B0, E1, A1, D2, G2', n: 5, s: ['G2','D2','A1','E1','B0'] },
  { label: '5 String - Bass Drop A - A0, E1, A1, D2, G2',   n: 5, s: ['G2','D2','A1','E1','A0'] },
  // 6-string guitar
  { label: '6 String - E Standard - E2, A2, D3, G3, B3, E4',        n: 6, s: ['E4','B3','G3','D3','A2','E2'] },
  { label: '6 String - Drop D - D2, A2, D3, G3, B3, E4',            n: 6, s: ['E4','B3','G3','D3','A2','D2'] },
  { label: '6 String - Double Drop D - D2, A2, D3, G3, B3, D4',     n: 6, s: ['D4','B3','G3','D3','A2','D2'] },
  { label: '6 String - Eb Standard - Eb2, Ab2, Db3, Gb3, Bb3, Eb4', n: 6, s: ['Eb4','Bb3','Gb3','Db3','Ab2','Eb2'] },
  { label: '6 String - D Standard - D2, G2, C3, F3, A3, D4',        n: 6, s: ['D4','A3','F3','C3','G2','D2'] },
  { label: '6 String - Drop C - C2, G2, C3, F3, A3, D4',            n: 6, s: ['D4','A3','F3','C3','G2','C2'] },
  { label: '6 String - C# Standard - C#2, F#2, B2, E3, G#3, C#4',  n: 6, s: ['C#4','G#3','E3','B2','F#2','C#2'] },
  { label: '6 String - Drop B - B1, F#2, B2, E3, G#3, C#4',         n: 6, s: ['C#4','G#3','E3','B2','F#2','B1'] },
  { label: '6 String - B Standard - B1, E2, A2, D3, F#3, B3',       n: 6, s: ['B3','F#3','D3','A2','E2','B1'] },
  { label: '6 String - Drop A - A1, E2, A2, D3, F#3, B3',           n: 6, s: ['B3','F#3','D3','A2','E2','A1'] },
  { label: '6 String - DADGAD - D2, A2, D3, G3, A3, D4',            n: 6, s: ['D4','A3','G3','D3','A2','D2'] },
  { label: '6 String - Open E - E2, B2, E3, G#3, B3, E4',           n: 6, s: ['E4','B3','G#3','E3','B2','E2'] },
  { label: '6 String - Open D - D2, A2, D3, F#3, A3, D4',           n: 6, s: ['D4','A3','F#3','D3','A2','D2'] },
  { label: '6 String - Open G - D2, G2, D3, G3, B3, D4',            n: 6, s: ['D4','B3','G3','D3','G2','D2'] },
  { label: '6 String - Open A - E2, A2, E3, A3, C#4, E4',           n: 6, s: ['E4','C#4','A3','E3','A2','E2'] },
  { label: '6 String - Open C - C2, G2, C3, G3, C4, E4',            n: 6, s: ['E4','C4','G3','C3','G2','C2'] },
  // 7-string guitar
  { label: '7 String - B Standard - B1, E2, A2, D3, G3, B3, E4', n: 7, s: ['E4','B3','G3','D3','A2','E2','B1'] },
  { label: '7 String - Drop A - A1, E2, A2, D3, G3, B3, E4',     n: 7, s: ['E4','B3','G3','D3','A2','E2','A1'] },
  // 8-string guitar
  { label: '8 String - F# Standard - F#1, B1, E2, A2, D3, G3, B3, E4', n: 8, s: ['E4','B3','G3','D3','A2','E2','B1','F#1'] },
  { label: '8 String - Drop E - E1, B1, E2, A2, D3, G3, B3, E4',       n: 8, s: ['E4','B3','G3','D3','A2','E2','B1','E1'] },
  { label: '8 String - Mirar - E1, B1, C2, E2, B2, E3, B3, C4',        n: 8, s: ['C4','B3','E3','B2','E2','C2','B1','E1'] },
];

function detectCurrentTuning() {
  for (const t of TUNINGS) {
    if (t.n !== state.numStrings) continue;
    if (t.s.every((s, i) => state.strings[i] === s)) return t.label;
  }
  return 'custom';
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
    midiDeviceId: state.midiDeviceId,
    midiOutputId: state.midiOutputId,
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
  theme: saved?.theme ?? 'dark',
  midiDeviceId: saved?.midiDeviceId ?? null,
  midiOutputId: saved?.midiOutputId ?? null,
  activeChord: null,
  baseAltChord: null,
  transitionChord: null,
  selectedVoicing: null,
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

// ── MIDI ──────────────────────────────────────────────────────────────────────

let midiAccess = null;
let midiOutputDevice = null;  // currently selected Web MIDI output port
const midiActiveNotes = new Set(); // active MIDI note numbers (0–127)
const clickedPositions = new Map(); // key="si,fi" (fi=0=open string), value=note name
let _fretPositionsCache = [];
let _stringPositionsRev = [];
let _fretboardStateHash = '';

let _midiRenderPending = false;
function scheduleMidiRender() {
  if (_midiRenderPending) return;
  _midiRenderPending = true;
  requestAnimationFrame(() => { _midiRenderPending = false; renderFretboard(); });
}

function playMidiNote(noteNumber) {
  const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
  const ctx  = getAudioCtx();
  const ab   = karplusBuffer(ctx, freq);
  const src  = ctx.createBufferSource();
  src.buffer = ab;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(9000, freq * 14);
  lp.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.value = 0.4;
  src.connect(lp);
  lp.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

function handleMidiMessage(event) {
  const [status, note, velocity] = event.data;
  const type = status & 0xF0;
  if (type === 0x90 && velocity > 0) {
    midiActiveNotes.add(note);
    playMidiNote(note);
  } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
    midiActiveNotes.delete(note);
  } else {
    return;
  }
  scheduleMidiRender();
}

function setMidiDevice(deviceId) {
  if (midiAccess) {
    for (const inp of midiAccess.inputs.values()) inp.onmidimessage = null;
  }
  midiActiveNotes.clear();
  state.midiDeviceId = deviceId || null;
  persistState();
  if (midiAccess && deviceId) {
    const inp = midiAccess.inputs.get(deviceId);
    if (inp) inp.onmidimessage = handleMidiMessage;
  }
  renderFretboard();
}

function midiStatusMsg(msg, isWarning = false) {
  const el = document.getElementById('midi-status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isWarning ? 'var(--gm-text)' : '';
  el.style.opacity = isWarning ? '1' : '0.6';
}

function populateMidiDevices() {
  const sel = document.getElementById('midi-device-select');
  if (!sel || !midiAccess) return;
  const prev = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  for (const [id, inp] of midiAccess.inputs) {
    const opt = document.createElement('option');
    opt.value = id; opt.textContent = inp.name;
    sel.appendChild(opt);
  }
  const ids = [...midiAccess.inputs.keys()];
  sel.value = ids.includes(prev) ? prev : (ids.includes(state.midiDeviceId) ? state.midiDeviceId : '');

  if (ids.length === 0) {
    midiStatusMsg(
      'No MIDI inputs detected. If your device is open in a DAW, the DAW may hold ' +
      'exclusive access to the port. Route MIDI through a virtual port (IAC Driver on ' +
      'macOS, loopMIDI on Windows) so both apps can receive simultaneously.',
      true
    );
  } else if (state.midiDeviceId && !ids.includes(state.midiDeviceId)) {
    midiStatusMsg(
      'Previously selected device is no longer available — it may have been claimed by ' +
      'another application. Select a different input or set up a virtual MIDI port.',
      true
    );
  } else {
    midiStatusMsg('');
  }
}

async function initMidi() {
  if (!navigator.requestMIDIAccess) {
    midiStatusMsg('Web MIDI API not supported in this browser.', true);
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess();
    populateMidiDevices();
    populateMidiOutputs();
    if (state.midiDeviceId && midiAccess.inputs.has(state.midiDeviceId)) {
      const inp = midiAccess.inputs.get(state.midiDeviceId);
      if (inp) inp.onmidimessage = handleMidiMessage;
      const sel = document.getElementById('midi-device-select');
      if (sel) sel.value = state.midiDeviceId;
    }
    if (state.midiOutputId && midiAccess.outputs.has(state.midiOutputId)) {
      midiOutputDevice = midiAccess.outputs.get(state.midiOutputId) || null;
    }
    midiAccess.onstatechange = () => {
      populateMidiDevices();
      populateMidiOutputs();
      if (state.midiDeviceId && !midiAccess.inputs.has(state.midiDeviceId)) {
        midiActiveNotes.clear();
        scheduleMidiRender();
      }
    };
  } catch (err) {
    midiStatusMsg(`MIDI access denied: ${err.message}`, true);
  }
}

function populateMidiOutputs() {
  const sel = document.getElementById('midi-output-select');
  if (!sel || !midiAccess) return;
  const prev = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  for (const [id, out] of midiAccess.outputs) {
    const opt = document.createElement('option');
    opt.value = id; opt.textContent = out.name;
    sel.appendChild(opt);
  }
  const ids = [...midiAccess.outputs.keys()];
  const next = ids.includes(prev) ? prev : (ids.includes(state.midiOutputId) ? state.midiOutputId : '');
  sel.value = next;
  midiOutputDevice = next ? (midiAccess.outputs.get(next) || null) : null;
}

function setMidiOutput(deviceId) {
  state.midiOutputId = deviceId || null;
  persistState();
  midiOutputDevice = (midiAccess && deviceId) ? (midiAccess.outputs.get(deviceId) || null) : null;
}

// ── Chord audio playback ──────────────────────────────────────────────────────

// Returns notes in the selected voicing from lowest string to highest string,
// skipping muted strings. Each element is a note string with octave, e.g. "E2".
function voicingNotes() {
  if (!state.selectedVoicing) return [];
  const stringNotes = state.strings.slice(0, state.numStrings).map(validateNote);
  const notes = [];
  // strings[0] = highest pitched string, strings[numStrings-1] = lowest — strum low→high
  for (let s = state.numStrings - 1; s >= 0; s--) {
    const fret = state.selectedVoicing[s];
    if (fret < 0) continue; // muted string
    notes.push(transposeNote(stringNotes[s], fret));
  }
  return notes;
}

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

// Karplus-Strong plucked-string synthesis: fills an AudioBuffer for a single note.
function karplusBuffer(ctx, freq) {
  const sr = ctx.sampleRate;
  const N = Math.max(2, Math.round(sr / freq));
  const duration = 3.5;
  const numSamples = Math.round(sr * duration);
  const ab = ctx.createBuffer(1, numSamples, sr);
  const data = ab.getChannelData(0);

  const ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;

  // Decay: tuned so notes naturally fade in ~2-3 s; lower notes decay more slowly
  const decay = Math.exp(-Math.log(2) / (freq * 1.2));

  for (let i = 0; i < numSamples; i++) {
    const pos = i % N;
    data[i] = ring[pos];
    ring[pos] = decay * 0.5 * (ring[pos] + ring[(pos + 1) % N]);
  }
  return ab;
}

function playVoicingSynth() {
  const notes = voicingNotes();
  if (!notes.length) return;
  const ctx = getAudioCtx();

  // Master gain normalised for string count
  const master = ctx.createGain();
  master.gain.value = 0.65 / Math.sqrt(notes.length);
  master.connect(ctx.destination);

  const now = ctx.currentTime;
  notes.forEach((note, i) => {
    const freq = noteToFrequency(note);
    const ab   = karplusBuffer(ctx, freq);

    const src = ctx.createBufferSource();
    src.buffer = ab;

    // Gentle high-frequency rolloff to soften the attack
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(9000, freq * 14);
    lp.Q.value = 0.5;

    src.connect(lp);
    lp.connect(master);
    src.start(now + i * 0.028); // 28 ms per string — realistic strum speed
  });
}

function sendVoicingMidi() {
  if (!midiOutputDevice) return;
  const notes = voicingNotes();
  if (!notes.length) return;
  const channel  = 0;   // MIDI channel 1
  const velocity = 80;
  const holdMs   = 1500;
  notes.forEach((note, i) => {
    const nn = noteNameToMidi(note);
    const t  = i * 28;
    setTimeout(() => midiOutputDevice.send([0x90 | channel, nn, velocity]), t);
    setTimeout(() => midiOutputDevice.send([0x80 | channel, nn, 0]),        t + holdMs);
  });
}

// ── Circle of Fifths ─────────────────────────────────────────────────────────

function isMajorFlavorMode(scale, mode) {
  if (scale === '2212221') return [0, 3, 4].includes(mode); // Ionian, Lydian, Mixolydian
  return SCALE_QUALITY[scale] === 'major';
}

function getActiveCofPos() {
  const quality = SCALE_QUALITY[state.scale];
  if (quality === null) return { pos: -1, isMajorFlavor: true };

  const parentRoot = parentScaleRoot(state.tonic, state.scale, state.mode);
  const parentSem  = NOTE_NAMES.indexOf(parentRoot.match(/^[A-G]#?/)[0]);

  if (quality === 'major') {
    return { pos: MAJOR_SEM_TO_COF[parentSem], isMajorFlavor: isMajorFlavorMode(state.scale, state.mode) };
  }
  // Minor-quality scale: find relative major (+3 semitones from minor parent root)
  return { pos: MAJOR_SEM_TO_COF[(parentSem + 3) % 12], isMajorFlavor: false };
}

let _cofClickBound = false;

function renderCircleOfFifths() {
  if (!document.getElementById('circle-of-fifths')) return;

  const tc    = THEMES[state.theme] || THEMES.light;

  // Both rings have equal radial width (0.34 units each)
  const R_OUT   = 1.14;
  const R_MID_O = 0.80;
  const R_MID_I = 0.46;   // R_MID_O - (R_OUT - R_MID_O) = equal width rings
  const GAP_DEG = 1.0;
  const N_PTS   = 30;

  const { pos: activePos, isMajorFlavor } = getActiveCofPos();

  const cof           = tc.cof;
  const inactiveFill  = cof.inactive;
  const activeBg      = cof.active_bg;
  const activeMajFill = cof.active_major;
  const activeMinFill = cof.active_minor;
  const textCol       = tc.annotation;
  const activeTextCol = '#ffffff';

  const traces      = [];
  const annotations = [];

  // Plotly y-axis points upward; negate sin so -90° is the top (12 o'clock).
  function arcPoly(r1, r2, startDeg, endDeg) {
    const xs = [], ys = [];
    for (let k = 0; k <= N_PTS; k++) {
      const a = (startDeg + (endDeg - startDeg) * k / N_PTS) * Math.PI / 180;
      xs.push(r2 * Math.cos(a)); ys.push(-r2 * Math.sin(a));
    }
    for (let k = N_PTS; k >= 0; k--) {
      const a = (startDeg + (endDeg - startDeg) * k / N_PTS) * Math.PI / 180;
      xs.push(r1 * Math.cos(a)); ys.push(-r1 * Math.sin(a));
    }
    xs.push(xs[0]); ys.push(ys[0]);
    return { xs, ys };
  }

  function midXY(r1, r2, midDeg) {
    const r = (r1 + r2) / 2, a = midDeg * Math.PI / 180;
    return { x: r * Math.cos(a), y: -r * Math.sin(a) };
  }

  for (let i = 0; i < 12; i++) {
    const startDeg = -105 + i * 30 + GAP_DEG / 2;
    const endDeg   = -105 + (i + 1) * 30 - GAP_DEG / 2;
    const midDeg   = -90 + i * 30;
    const isActive = i === activePos;
    const d        = COF_DATA[i];

    // Outer ring fill — major key
    const op = arcPoly(R_MID_O, R_OUT, startDeg, endDeg);
    traces.push({
      type: 'scatter', mode: 'none', x: op.xs, y: op.ys,
      fill: 'toself', fillcolor: isActive ? (isMajorFlavor ? activeMajFill : activeBg) : inactiveFill,
      line: { color: tc.bg, width: 1.5 }, hoverinfo: 'skip', showlegend: false,
    });

    // Middle ring fill — relative minor
    const mp = arcPoly(R_MID_I, R_MID_O, startDeg, endDeg);
    traces.push({
      type: 'scatter', mode: 'none', x: mp.xs, y: mp.ys,
      fill: 'toself', fillcolor: isActive ? (isMajorFlavor ? activeBg : activeMinFill) : inactiveFill,
      line: { color: tc.bg, width: 1.5 }, hoverinfo: 'skip', showlegend: false,
    });

    // Labels via layout annotations (not trace text — avoids click interference)
    const olp = midXY(R_MID_O, R_OUT, midDeg);
    annotations.push({
      x: olp.x, y: olp.y, showarrow: false,
      text: isActive ? `<b>${d.major}</b>` : d.major,
      font: { size: 11, color: isActive && isMajorFlavor ? activeTextCol : textCol },
      xanchor: 'center', yanchor: 'middle',
    });

    const mlp = midXY(R_MID_I, R_MID_O, midDeg);
    annotations.push({
      x: mlp.x, y: mlp.y, showarrow: false,
      text: isActive ? `<b>${d.minor}</b>` : d.minor,
      font: { size: 10, color: isActive && !isMajorFlavor ? activeTextCol : textCol },
      xanchor: 'center', yanchor: 'middle',
    });

    // Invisible click-target markers — one per ring per sector
    const oc = midXY(R_MID_O, R_OUT, midDeg);
    traces.push({
      type: 'scatter', mode: 'markers', x: [oc.x], y: [oc.y],
      marker: { size: 36, color: tc.bg, opacity: 0.01, line: { width: 0 } },
      hoverinfo: 'skip', showlegend: false, customdata: [`${i}-major`],
    });

    const mc = midXY(R_MID_I, R_MID_O, midDeg);
    traces.push({
      type: 'scatter', mode: 'markers', x: [mc.x], y: [mc.y],
      marker: { size: 36, color: tc.bg, opacity: 0.01, line: { width: 0 } },
      hoverinfo: 'skip', showlegend: false, customdata: [`${i}-minor`],
    });
  }

  // Centre hub (filled circle)
  const hubXs = [], hubYs = [];
  for (let k = 0; k <= 36; k++) {
    const a = (k * 10) * Math.PI / 180;
    hubXs.push(R_MID_I * Math.cos(a)); hubYs.push(-R_MID_I * Math.sin(a));
  }
  traces.push({
    type: 'scatter', mode: 'none', x: hubXs, y: hubYs,
    fill: 'toself', fillcolor: inactiveFill,
    line: { color: tc.bg, width: 1.5 }, hoverinfo: 'skip', showlegend: false,
  });

  const layout = {
    showlegend: false,
    plot_bgcolor: tc.bg, paper_bgcolor: tc.bg,
    margin: { t: 5, l: 5, b: 5, r: 5 },
    width: 360, height: 360,
    xaxis: { visible: false, fixedrange: true, range: [-2.0, 2.0], scaleanchor: 'y', scaleratio: 1 },
    yaxis: { visible: false, fixedrange: true, range: [-2.0, 2.0] },
    annotations,
  };

  Plotly.react('circle-of-fifths', traces, layout, { displayModeBar: false });
  renderCofKeySignatures();

  if (!_cofClickBound) {
    _cofClickBound = true;
    document.getElementById('circle-of-fifths').on('plotly_click', function(data) {
      if (!data.points || !data.points.length) return;
      const pt = data.points[0];
      if (pt.customdata == null) return;
      const [cofPosStr, quality] = String(pt.customdata).split('-');
      navigateToCofKey(parseInt(cofPosStr), quality);
    });
  }
}

function navigateToCofKey(cofPos, quality) {
  state.scale = '2212221'; // diatonic
  if (quality === 'major') {
    state.tonic = NOTE_NAMES[COF_POS_MAJOR_SEM[cofPos]];
    state.mode  = 0; // Ionian
  } else {
    state.tonic = NOTE_NAMES[COF_POS_MINOR_SEM[cofPos]];
    state.mode  = 5; // Aeolian
  }
  state.activeChord = null; state.baseAltChord = null; state.transitionChord = null; state.selectedVoicing = null;
  document.getElementById('tonic').value = state.tonic;
  document.getElementById('scale').value = state.scale;
  persistState();
  renderModeDropdown();
  renderChordButtons(); // calls renderCircleOfFifths internally
  renderFretboard();
}

// ── Circle of Fifths key signatures (SVG overlay) ────────────────────────────

// These must stay in sync with renderCircleOfFifths() layout parameters:
//   chart 360×360 px, margins 5 px each side, axis range [-2.0, 2.0]
const _COF_CHART   = 360;
const _COF_MARGIN  = 5;
const _COF_RANGE   = 4.0;   // total axis extent (2.0 - (-2.0))
const _COF_PX      = (_COF_CHART - 2 * _COF_MARGIN) / _COF_RANGE; // 87.5 px / data unit
const _COF_CX      = _COF_MARGIN + (_COF_CHART - 2 * _COF_MARGIN) / 2; // 180
const _COF_CY      = _COF_MARGIN + (_COF_CHART - 2 * _COF_MARGIN) / 2; // 180

// Radius (data units) at which staff middle lines are centred — just outside R_OUT=1.14
const _R_STAFF     = 1.58;
// Staff space in pixels and treble-clef scale factor
const _S           = 5;
const _CLEF_SC     = _S / 590;           // source → SVG scale (590 units = 1 staff space)
const _CLEF_W      = 1435 * _CLEF_SC;    // ≈ 12.2 px — clef x-extent (1186→2621 in source)
const _ACC_W       = 5.0;                // px per accidental column

let _cofKeySigSVG = null;

function _sharpSVG(ax, ay, S, color) {
  const h = S, w = 2.5, sw1 = 0.6, sw2 = 1.1;
  const b1 = ay - S * 0.32, b2 = ay + S * 0.32, tilt = 0.25;
  return `<line x1="${(ax+0.6).toFixed(1)}" y1="${(ay-h).toFixed(1)}" x2="${(ax+0.6).toFixed(1)}" y2="${(ay+h).toFixed(1)}" stroke="${color}" stroke-width="${sw1}"/>` +
    `<line x1="${(ax+w-0.4).toFixed(1)}" y1="${(ay-h).toFixed(1)}" x2="${(ax+w-0.4).toFixed(1)}" y2="${(ay+h).toFixed(1)}" stroke="${color}" stroke-width="${sw1}"/>` +
    `<line x1="${ax.toFixed(1)}" y1="${b1.toFixed(1)}" x2="${(ax+w+0.4).toFixed(1)}" y2="${(b1-tilt).toFixed(1)}" stroke="${color}" stroke-width="${sw2}"/>` +
    `<line x1="${ax.toFixed(1)}" y1="${b2.toFixed(1)}" x2="${(ax+w+0.4).toFixed(1)}" y2="${(b2-tilt).toFixed(1)}" stroke="${color}" stroke-width="${sw2}"/>`;
}

function _flatSVG(ax, ay, S, color) {
  const stemX = ax + 0.4;
  const rx = S * 0.43, ry = S * 0.43;
  const stemTop = ay - S * 2.4;
  const stemBot = ay + ry + 0.2;
  const sw = 0.65;
  return `<line x1="${stemX.toFixed(1)}" y1="${stemTop.toFixed(1)}" x2="${stemX.toFixed(1)}" y2="${stemBot.toFixed(1)}" stroke="${color}" stroke-width="${sw}"/>` +
    `<ellipse cx="${(stemX + rx).toFixed(1)}" cy="${ay.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" stroke="${color}" stroke-width="${sw}" fill="none"/>`;
}

function renderCofKeySignatures() {
  const cofEl = document.getElementById('circle-of-fifths');
  if (!cofEl) return;

  const tc    = THEMES[state.theme] || THEMES.light;
  const color = tc.annotation;

  if (!_cofKeySigSVG) {
    _cofKeySigSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    _cofKeySigSVG.setAttribute('width',  String(_COF_CHART));
    _cofKeySigSVG.setAttribute('height', String(_COF_CHART));
    _cofKeySigSVG.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible;';
    cofEl.appendChild(_cofKeySigSVG);
  }

  const parts = [];

  for (let i = 0; i < 12; i++) {
    const { sig } = COF_DATA[i];
    const numAcc  = parseInt(sig) || 0;
    const accType = sig.includes('♯') ? 'sharp' : sig.includes('♭') ? 'flat' : null;
    const posArr  = accType === 'sharp' ? COF_SHARP_POS : COF_FLAT_POS;

    const totalW = _CLEF_W + (numAcc > 0 ? 1 + numAcc * _ACC_W : 0);

    // Pixel centre of this COF sector.
    const midDeg = -90 + i * 30;
    const angle  = midDeg * Math.PI / 180;
    const cx = _COF_CX + _R_STAFF * Math.cos(angle) * _COF_PX;
    const cy = _COF_CY + _R_STAFF * Math.sin(angle) * _COF_PX;

    const x0 = cx - totalW / 2;
    const y0 = cy - 2 * _S;

    // 5 staff lines.
    for (let ln = 0; ln < 5; ln++) {
      const ly = (y0 + ln * _S).toFixed(1);
      parts.push(`<line x1="${x0.toFixed(1)}" y1="${ly}" x2="${(x0+totalW).toFixed(1)}" y2="${ly}" stroke="${color}" stroke-width="0.5"/>`);
    }

    // Treble clef: source path is in standard y-down coordinates (590 units = 1 staff space).
    // translate(x0 - 1186·sc, y0 - 6378·sc) maps source top-left of clef (1186, 6378)
    // to SVG position (x0, y0) = left edge of staff at the top staff line.
    const sc = _CLEF_SC;
    const tx = (x0 - 1186 * sc).toFixed(2), ty = (y0 - 6378 * sc).toFixed(2);
    parts.push(`<path d="${TREBLE_CLEF_PATH}" transform="translate(${tx},${ty}) scale(${sc.toFixed(6)},${sc.toFixed(6)})" fill="${color}" fill-rule="evenodd"/>`);

    // Key signature accidentals.
    let ax = x0 + _CLEF_W + 1;
    for (let a = 0; a < numAcc; a++) {
      const ay = y0 + posArr[a] * _S;
      parts.push(accType === 'sharp' ? _sharpSVG(ax, ay, _S, color) : _flatSVG(ax, ay, _S, color));
      ax += _ACC_W;
    }
  }

  _cofKeySigSVG.innerHTML = parts.join('');
}

// ── Relative keys ─────────────────────────────────────────────────────────────

function renderSkipPattern() {
  const el = document.getElementById('skip-pattern');
  if (!el) return;
  const intervals = state.scale.split('').map(Number);
  const n = state.mode % intervals.length;
  const rotated = [...intervals.slice(n), ...intervals.slice(0, n)];
  const labels = rotated.map(i => i === 1 ? 'H' : i === 2 ? 'W' : i === 3 ? 'W+H' : String(i));
  el.textContent = labels.join(' – ');
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

function renderTransitions() {
  const panel = document.getElementById('chord-transitions');
  if (!state.activeChord) {
    panel.style.visibility = 'hidden';
    return;
  }

  const [rowStr, chordType] = state.activeChord.split('-');
  const rowIdx = parseInt(rowStr) - 1;
  const notesInScale = buildScaleNotes(state.tonic, state.scale, state.mode);
  const useFlats = shouldUseFlats(state.tonic, state.scale, state.mode);
  const rootNote = notesInScale[rowIdx];

  // Secondary dominant: the dominant 7th whose root is a P5 above the selected root
  document.getElementById('trans-sec-dom').textContent =
    displayNote(noteName(transposeNote(rootNote, 7), useFlats)) + '7';

  // Chromatic mediants: same basic quality as the selected chord
  const isMinor = MINOR_QUALITY_TYPES.has(chordType) || chordType === 'dim' || chordType === 'dim7';
  const q = isMinor ? 'm' : '';

  document.getElementById('trans-med-up-m3').textContent =
    '↑ ' + displayNote(noteName(transposeNote(rootNote, 3), useFlats)) + q;
  document.getElementById('trans-med-dn-m3').textContent =
    '↓ ' + displayNote(noteName(transposeNote(rootNote, 9), useFlats)) + q;
  document.getElementById('trans-med-up-M3').textContent =
    '↑ ' + displayNote(noteName(transposeNote(rootNote, 4), useFlats)) + q;
  document.getElementById('trans-med-dn-M3').textContent =
    '↓ ' + displayNote(noteName(transposeNote(rootNote, 8), useFlats)) + q;

  panel.style.visibility = 'visible';
}

const TRANSITION_IDS = [
  'trans-sec-dom','trans-med-up-m3','trans-med-dn-m3','trans-med-up-M3','trans-med-dn-M3',
];

const TONIC_ALTERATIONS = [
  { id: 'tonic-alt-b2', semitones:  1, letterSteps: 1, type: 'maj' },
  { id: 'tonic-alt-b3', semitones:  3, letterSteps: 2, type: 'maj' },
  { id: 'tonic-alt-iv', semitones:  5, letterSteps: 3, type: 'min' },
  { id: 'tonic-alt-b6', semitones:  8, letterSteps: 5, type: 'maj' },
  { id: 'tonic-alt-b7', semitones: 10, letterSteps: 6, type: 'maj' },
];

function renderBorrowedChords() {
  const section   = document.getElementById('borrowed-chords');
  const container = document.getElementById('borrowed-chord-rows');
  if (!section || !container) return;

  if (!state.activeChord) {
    section.style.visibility = 'hidden';
    container.innerHTML = '';
    return;
  }

  section.style.visibility = 'visible';
  container.innerHTML = '';

  const [rowStr] = state.activeChord.split('-');
  const rowIdx = parseInt(rowStr) - 1;

  const allModes = MODES[state.scale];
  const parallelModes = allModes.filter(m => m.value !== state.mode);
  const BASIC_TYPES = ['maj', 'min', 'dim', 'aug', 'sus4', 'sus2'];

  for (const pModeObj of parallelModes) {
    const pMode = pModeObj.value;
    const pScaleNotes = buildScaleNotes(state.tonic, state.scale, pMode);
    if (rowIdx >= pScaleNotes.length) continue;

    const pDiatonicNames = diatonicNoteNames(state.tonic, state.scale, pMode);

    let chordType = null;
    for (const type of BASIC_TYPES) {
      const ints = CHORD_INTERVALS[type];
      if (!ints) continue;
      const notesInChord = ints.map(iv => transposeNote(pScaleNotes[rowIdx], iv));
      if (notesInChord.every(n => pScaleNotes.some(sn => isOctaveOfNote(n, sn)))) {
        chordType = type;
        break;
      }
    }
    if (!chordType) continue;

    const badgeId = `borrowed-${pMode}`;
    const isActive = state.transitionChord?.badgeId === badgeId;
    const modeName = pModeObj.label
      .replace(/^\d+:\s*/, '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();
    const chordName = displayNote(pDiatonicNames[rowIdx]) + (CHORD_DISPLAY_SUFFIX[chordType] ?? chordType);

    const row = document.createElement('div');
    row.className = 'chord-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'borrowed-mode-label';
    nameSpan.textContent = modeName;

    const btn = document.createElement('button');
    btn.className = 'trans-btn' + (isActive ? ' active' : '');
    btn.textContent = chordName;

    const capturedRoot  = pScaleNotes[rowIdx];
    const capturedType  = chordType;
    const capturedBadge = badgeId;
    btn.addEventListener('click', () => {
      if (state.transitionChord?.badgeId === capturedBadge) {
        state.transitionChord = null;
        state.selectedVoicing = null;
      } else {
        // Keep activeChord so the scale degree context stays visible
        state.selectedVoicing = null;
        state.transitionChord = {
          badgeId: capturedBadge,
          rootNote: capturedRoot,
          intervals: CHORD_INTERVALS[capturedType],
          labels: CHORD_INTERVAL_LABELS[capturedType],
        };
      }
      updateActiveChordButton();
      updateTransitionButtons();
      renderTonicAlterations();
      renderBorrowedChords();
      renderChordNotes();
      renderTransitionNotes();
      renderFretboard();
    });

    row.appendChild(nameSpan);
    row.appendChild(btn);
    container.appendChild(row);
  }
}

function renderTonicAlterations() {
  const notesInScale = buildScaleNotes(state.tonic, state.scale, state.mode);
  const tonic = state.tonic;
  const tonicSemitone = NOTE_NAMES.indexOf(tonic.match(/^[A-G]#?/)[0]);
  const useFlats = shouldUseFlats(tonic, state.scale, state.mode);
  let tonicLetterIdx = LETTER_NAMES.indexOf(tonic.match(/^[A-G]/)[0]);
  if (tonic.includes('#') && useFlats) tonicLetterIdx = (tonicLetterIdx + 1) % 7;

  for (const alt of TONIC_ALTERATIONS) {
    const btn = document.getElementById(alt.id);
    if (!btn) continue;

    // Diatonic spelling for the root
    const letterIdx = (tonicLetterIdx + alt.letterSteps) % 7;
    const letter = LETTER_NAMES[letterIdx];
    const naturalSemitone = LETTER_NATURAL_SEMITONES[letterIdx];
    const targetSemitone = (tonicSemitone + alt.semitones) % 12;
    let diff = targetSemitone - naturalSemitone;
    if (diff >  6) diff -= 12;
    if (diff < -6) diff += 12;

    let rootName = letter;
    if      (diff ===  1) rootName = letter + '#';
    else if (diff === -1) rootName = letter + 'b';
    else if (diff ===  2) rootName = letter + '##';
    else if (diff === -2) rootName = letter + 'bb';

    btn.textContent = displayNote(rootName) + (CHORD_DISPLAY_SUFFIX[alt.type] ?? alt.type);

    // Grey out if already diatonic to the current scale
    const rootNote = transposeNote(notesInScale[0], alt.semitones);
    const chordNotes = CHORD_INTERVALS[alt.type].map(iv => transposeNote(rootNote, iv));
    const isDiatonic = chordNotes.every(n => notesInScale.some(sn => isOctaveOfNote(n, sn)));
    const isActive = state.baseAltChord?.badgeId === alt.id;
    btn.classList.toggle('active',    isActive);
    btn.classList.toggle('secondary', isDiatonic && !isActive);
  }
}

function renderChordNotes() {
  const container = document.getElementById('chord-notes');
  container.innerHTML = '';

  const notesInScale = buildScaleNotes(state.tonic, state.scale, state.mode);
  const useFlats = shouldUseFlats(state.tonic, state.scale, state.mode);
  const tc = THEMES[state.theme] || THEMES.light;

  let chordNotes = [], chordLabels = [], intervals = [], noteDisplayNames = [];
  if (state.activeChord) {
    const [rowStr, chordType] = state.activeChord.split('-');
    const rowIdx = parseInt(rowStr) - 1;
    intervals   = CHORD_INTERVALS[chordType];
    chordNotes  = intervals.map(iv => transposeNote(notesInScale[rowIdx], iv));
    chordLabels = CHORD_INTERVAL_LABELS[chordType];
    const diatonicNames = diatonicNoteNames(state.tonic, state.scale, state.mode);
    const rootLetter    = diatonicNames[rowIdx].match(/^[A-G]/)[0];
    const rootNote      = notesInScale[rowIdx];
    noteDisplayNames = intervals.map((iv, i) =>
      diatonicChordToneName(rootNote, rootLetter, iv, chordLabels[i])
    );
  } else if (state.baseAltChord) {
    intervals        = state.baseAltChord.intervals;
    chordNotes       = intervals.map(iv => transposeNote(state.baseAltChord.rootNote, iv));
    chordLabels      = state.baseAltChord.labels;
    noteDisplayNames = chordNotes.map(n => noteName(n, useFlats));
  }

  const autoPlayRow = document.getElementById('chord-auto-play');
  if (!chordNotes.length) {
    container.style.display = 'none';
    if (autoPlayRow) autoPlayRow.style.display = 'none';
    return;
  }
  if (clickedPositions.size > 0) {
    clickedPositions.clear();
    renderClickedChordId();
  }
  container.style.display = 'flex';
  if (autoPlayRow) autoPlayRow.style.display = 'flex';

  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < chordNotes.length; i++) {
    const color    = intervalColor(chordLabels[i]);
    const noteDisp = displayNote(noteDisplayNames[i]);

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '26'); svg.setAttribute('height', '26');

    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '13'); circle.setAttribute('cy', '13');
    circle.setAttribute('r', '12'); circle.setAttribute('fill', color);
    svg.appendChild(circle);

    const txt = document.createElementNS(NS, 'text');
    txt.setAttribute('x', '13'); txt.setAttribute('y', '17');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('font-size', '9');
    txt.setAttribute('font-weight', 'bold');
    txt.setAttribute('fill', tc.label_fill);
    txt.textContent = noteDisp;
    svg.appendChild(txt);

    container.appendChild(svg);
  }

  const intervalRow = document.createElement('div');
  intervalRow.style.cssText = 'width:100%; text-align:center; font-size:12px; opacity:0.65; padding-top:2px;';
  intervalRow.textContent = '[' + intervals.join(', ') + ']';
  container.appendChild(intervalRow);
}

function renderTransitionNotes() {
  const arrow     = document.getElementById('chord-trans-arrow');
  const container = document.getElementById('chord-trans-notes');
  container.innerHTML = '';

  const hasBase = state.activeChord || state.baseAltChord;
  if (!hasBase || !state.transitionChord) {
    arrow.style.display     = 'none';
    container.style.display = 'none';
    return;
  }

  arrow.style.display     = '';
  container.style.display = 'flex';

  const tc       = THEMES[state.theme] || THEMES.light;
  const useFlats = shouldUseFlats(state.tonic, state.scale, state.mode);
  const intervals        = state.transitionChord.intervals;
  const chordNotes       = intervals.map(iv => transposeNote(state.transitionChord.rootNote, iv));
  const chordLabels      = state.transitionChord.labels;
  const noteDisplayNames = chordNotes.map(n => noteName(n, useFlats));

  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < chordNotes.length; i++) {
    const color    = intervalColor(chordLabels[i]);
    const noteDisp = displayNote(noteDisplayNames[i]);

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '26'); svg.setAttribute('height', '26');

    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '13'); circle.setAttribute('cy', '13');
    circle.setAttribute('r', '12'); circle.setAttribute('fill', color);
    svg.appendChild(circle);

    const txt = document.createElementNS(NS, 'text');
    txt.setAttribute('x', '13'); txt.setAttribute('y', '17');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('font-size', '9');
    txt.setAttribute('font-weight', 'bold');
    txt.setAttribute('fill', tc.label_fill);
    txt.textContent = noteDisp;
    svg.appendChild(txt);

    container.appendChild(svg);
  }

  const intervalRow = document.createElement('div');
  intervalRow.style.cssText = 'width:100%; text-align:center; font-size:12px; opacity:0.65; padding-top:2px;';
  intervalRow.textContent = '[' + intervals.join(', ') + ']';
  container.appendChild(intervalRow);
}

function updateActiveChordButton() {
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < CHORD_TYPES.length; j++) {
      const btn = document.getElementById(`chord-btn-${i}-${j}`);
      if (!btn) continue;
      const isActive = state.activeChord === `${i+1}-${CHORD_TYPES[j]}`;
      btn.classList.toggle('active',    isActive && !state.transitionChord);
      btn.classList.toggle('secondary', isActive && !!state.transitionChord);
    }
  }
}

function updateTransitionButtons() {
  for (const id of TRANSITION_IDS) {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', !!(state.transitionChord && state.transitionChord.badgeId === id));
  }
}

function activateTransitionChord(badgeId, semitoneOffset, forcedType) {
  if (!state.activeChord) return;
  state.selectedVoicing = null;
  if (state.transitionChord && state.transitionChord.badgeId === badgeId) {
    state.transitionChord = null;
  } else {
    const [rowStr, chordType] = state.activeChord.split('-');
    const rootNote = transposeNote(buildScaleNotes(state.tonic, state.scale, state.mode)[parseInt(rowStr) - 1], semitoneOffset);
    const type = forcedType !== null
      ? forcedType
      : (MINOR_QUALITY_TYPES.has(chordType) || chordType === 'dim' || chordType === 'dim7' ? 'min' : 'maj');
    state.transitionChord = { badgeId, rootNote, intervals: CHORD_INTERVALS[type], labels: CHORD_INTERVAL_LABELS[type] };
  }
  updateTransitionButtons();
  updateActiveChordButton();
  renderTonicAlterations();
  renderBorrowedChords();
  renderChordNotes();
  renderTransitionNotes();
  renderFretboard();
}

function renderChordButtons() {
  renderSkipPattern();
  const notesInScale  = buildScaleNotes(state.tonic, state.scale, state.mode);
  const diatonicNames = diatonicNoteNames(state.tonic, state.scale, state.mode);

  for (let i = 0; i < 7; i++) {
    let rowVisible = false;
    let firstChordType = null;

    for (let j = 0; j < CHORD_TYPES.length; j++) {
      const chordType = CHORD_TYPES[j];
      const col = document.getElementById(`chord-col-${i}-${j}`);

      if (i >= notesInScale.length) { col.style.display = 'none'; continue; }

      const notesInChord = CHORD_INTERVALS[chordType].map(iv => transposeNote(notesInScale[i], iv));
      const inScale = notesInChord.every(n => notesInScale.some(sn => isOctaveOfNote(n, sn)));

      col.style.display = inScale ? '' : 'none';
      if (inScale) {
        document.getElementById(`chord-btn-${i}-${j}`).textContent =
          displayNote(diatonicNames[i]) + (CHORD_DISPLAY_SUFFIX[chordType] ?? chordType);
        if (firstChordType === null) firstChordType = chordType;
        rowVisible = true;
      }
    }

    const row = document.getElementById(`chord-row-${i}`);
    row.style.display = rowVisible ? '' : 'none';
    document.getElementById(`chord-label-${i}`).textContent =
      firstChordType ? romanNumeral(i, firstChordType) : CHORD_ROMAN[i];
  }
  updateActiveChordButton();
  updateTransitionButtons();
  renderTransitions();
  renderTonicAlterations();
  renderBorrowedChords();
  renderChordNotes();
  renderCircleOfFifths();
}

// ── Fretboard (Plotly.js) ─────────────────────────────────────────────────────

function buildFretboardData() {
  const fbHash = `${state.tonic}|${state.scale}|${state.mode}|${state.numStrings}|${state.strings.slice(0, state.numStrings).join(',')}`;
  if (fbHash !== _fretboardStateHash) {
    if (_fretboardStateHash) clickedPositions.clear();
    _fretboardStateHash = fbHash;
  }
  const tc = THEMES[state.theme] || THEMES.light;
  const lineStyle     = { color: tc.annotation, width: 2 };   // nut
  const thinLineStyle = { color: tc.annotation, width: 0.75 }; // frets + strings
  const NOTE_PATTERN = /^[A-G](?:b|#)?(?:[0-9]|10)$/;

  const stringLabels = state.strings.slice(0, state.numStrings).map(validateNote);
  if (!stringLabels.every(s => NOTE_PATTERN.test(s))) return null;

  const notesInScale = buildScaleNotes(state.tonic, state.scale, state.mode);
  const root = notesInScale[0];
  const useFlats = shouldUseFlats(state.tonic, state.scale, state.mode);

  let notesInChord = [], chordLabels = [];
  if (state.transitionChord) {
    notesInChord = state.transitionChord.intervals.map(iv => transposeNote(state.transitionChord.rootNote, iv));
    chordLabels = state.transitionChord.labels;
  } else if (state.activeChord) {
    const [rowStr, chordType] = state.activeChord.split('-');
    const rowIdx = parseInt(rowStr) - 1;
    notesInChord = CHORD_INTERVALS[chordType].map(iv => transposeNote(notesInScale[rowIdx], iv));
    chordLabels = CHORD_INTERVAL_LABELS[chordType];
  } else if (state.baseAltChord) {
    notesInChord = state.baseAltChord.intervals.map(iv => transposeNote(state.baseAltChord.rootNote, iv));
    chordLabels = state.baseAltChord.labels;
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
      mode:'lines', line: thinLineStyle, hoverinfo:'skip', type:'scatter' });
    fretPositions.push(xPrev + (x - xPrev) / 2);
    xPrev = x;
  }
  _fretPositionsCache = [...fretPositions];

  // String lines + positions
  const stringPositions = [];
  for (let i = 0; i < state.numStrings; i++) {
    const y = i * STRING_SCALE_FACTOR;
    stringPositions.push(y);
    traces.push({ x:[0,lastX], y:[y,y], mode:'lines', line: thinLineStyle, hoverinfo:'skip', type:'scatter' });
  }

  // Fret position markers (below nut)
  const dotFrets = [1,3,5,7,9,12,15,17,19,21,24];
  for (const fi of dotFrets) {
    const fx = fretPositions[fi - 1];
    if (fi % 12 !== 0) {
      traces.push({ x:[fx], y:[-STRING_SCALE_FACTOR], mode:'markers',
        line:{ color:tc.annotation, width:2 }, hovertemplate:`${fi}<extra></extra>`, type:'scatter' });
    } else {
      traces.push({ x:[fx-0.05,fx+0.05], y:[-STRING_SCALE_FACTOR,-STRING_SCALE_FACTOR],
        mode:'markers', line:{ color:tc.annotation, width:2 },
        hovertemplate:`${fi}<extra></extra>`, type:'scatter' });
    }
  }

  // Note markers per string
  const strPosRev = [...stringPositions].reverse();
  _stringPositionsRev = [...strPosRev];
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

    // When a voicing is selected, only colour the specific (string, fret) positions
    // it uses; every other position falls back to plain scale/root colouring.
    const openChord  = (!state.selectedVoicing || state.selectedVoicing[si] === 0) ? notesInChord : [];
    const openLabels = (!state.selectedVoicing || state.selectedVoicing[si] === 0) ? chordLabels  : [];
    addNoteMarker(traces, 0, y, baseNote, root, notesInScale, openChord, openLabels, tc);

    for (let fi = 0; fi < NUM_FRETS; fi++) {
      const note = transposeNote(baseNote, fi + 1);
      traces.push({ x:[fretPositions[fi]], y:[y], mode:'markers',
        hovertemplate:`${displayNote(enharmonic(note, useFlats))} (${noteToFrequency(note)}Hz)<extra></extra>`,
        marker:{ size:1, color:tc.line }, type:'scatter' });
      const fret = fi + 1;
      const fretChord  = (!state.selectedVoicing || state.selectedVoicing[si] === fret) ? notesInChord : [];
      const fretLabels = (!state.selectedVoicing || state.selectedVoicing[si] === fret) ? chordLabels  : [];
      addNoteMarker(traces, fretPositions[fi], y, note, root, notesInScale, fretChord, fretLabels, tc);
    }
  }

  // ── MIDI note highlights ──────────────────────────────────────────────────
  if (midiActiveNotes.size > 0) {
    for (let si = 0; si < state.numStrings; si++) {
      const baseNote = stringLabels[si];
      const y = strPosRev[si];
      const highlight = (x, note) => {
        if (!midiActiveNotes.has(noteNameToMidi(note))) return;
        const inScale = notesInScale.some(sn => isOctaveOfNote(note, sn));
        const inChord = notesInChord.some(cn => isOctaveOfNote(cn, note));
        if (inScale || inChord) {
          traces.push({ x:[x], y:[y], mode:'markers', hoverinfo:'skip', type:'scatter',
            cliponaxis: false,
            marker:{ symbol:'circle-open', color:tc.midi_fill, size:26,
                     line:{ color:tc.midi_fill, width:3 } } });
        } else {
          traces.push({ x:[x], y:[y], mode:'markers', hoverinfo:'skip', type:'scatter',
            cliponaxis: false,
            marker:{ symbol:'circle', color:tc.midi_fill, size:20 } });
        }
      };
      highlight(0, baseNote);
      for (let fi = 0; fi < NUM_FRETS; fi++) highlight(fretPositions[fi], transposeNote(baseNote, fi + 1));
    }
  }

  // ── Clicked position highlights (chord ID mode) ──────────────────────────────
  if (clickedPositions.size > 0 && !state.activeChord && !state.baseAltChord && !state.transitionChord) {
    for (const [key] of clickedPositions) {
      const [si, fi] = key.split(',').map(Number);
      if (si >= strPosRev.length) continue;
      const x = fi === 0 ? 0 : fretPositions[fi - 1];
      const y = strPosRev[si];
      traces.push({ x:[x], y:[y], mode:'markers', hoverinfo:'skip', type:'scatter',
        cliponaxis: false, marker:{ symbol:'circle', color:tc.click_fill, size:22 } });
    }
  }

  // Pin the y-axis range explicitly so that large MIDI markers (circle-open,
  // size 26) do not cause Plotly to add extra padding and compress string spacing.
  const yDataMin = -STRING_SCALE_FACTOR;                              // fret-dot row
  const yDataMax = (state.numStrings - 1) * STRING_SCALE_FACTOR;     // highest string
  // Padding must exceed the visual radius of a 26px MIDI ring in data units.
  // 1.0 × STRING_SCALE_FACTOR gives comfortable clearance across all string counts.
  const yPad    = STRING_SCALE_FACTOR * 1.0;

  const layout = {
    showlegend: false,
    plot_bgcolor: tc.bg, paper_bgcolor: tc.bg,
    margin: { t:10, l:48, b:10, r:10 },
    height: state.numStrings * 30 + 20,
    autosize: true,
    xaxis: { visible:false, fixedrange:true, range:[-0.5, lastX+0.3] },
    yaxis: { visible:false, fixedrange:true, range:[yDataMin - yPad, yDataMax + yPad] },
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

  // Chord check must run before the early-return so non-scale chord tones
  // (e.g. chromatic mediant / secondary dominant notes) still get a marker.
  let chordLabel = null;
  for (let j = 0; j < notesInChord.length; j++) {
    if (isOctaveOfNote(notesInChord[j], note)) {
      color = intervalColor(chordLabels[j]);
      chordLabel = chordLabels[j];
      break;
    }
  }

  if (!color) return;

  const marker = { color, size:20 };
  if (chordLabel) {
    traces.push({ x:[x], y:[y], mode:'markers+text', hoverinfo:'skip', marker, text:[chordLabel], textfont:{ color:tc.label_fill }, type:'scatter' });
  } else {
    traces.push({ x:[x], y:[y], mode:'markers', hoverinfo:'skip', marker, type:'scatter' });
  }
}

// ── Chord identification from clicked positions ───────────────────────────────

function identifyChords(noteNames) {
  // Order distinct pitch classes by the actual pitch (ascending) of their lowest
  // occurrence, so orderedPcs[0] is the bass note's pitch class.
  const withMidi = noteNames
    .map(n => ({ midi: noteNameToMidi(n), pc: notePitchClass(n) }))
    .filter(o => o.pc >= 0)
    .sort((a, b) => a.midi - b.midi);
  const seenPc = new Set();
  const orderedPcs = [];
  for (const { pc } of withMidi) {
    if (!seenPc.has(pc)) { seenPc.add(pc); orderedPcs.push(pc); }
  }
  if (orderedPcs.length < 3) return [];

  const bassPc  = orderedPcs[0];
  const allPcs  = new Set(orderedPcs);
  const useFlats = shouldUseFlats(state.tonic, state.scale, state.mode);
  const pcName = pc => displayNote(noteName(enharmonic(NOTE_NAMES[pc] + '4', useFlats), useFlats));

  const results = [];
  // Try each distinct pitch class as root, in ascending bass-pitch order: a match
  // rooted on the bass note is a root-position chord (presented first); a match
  // rooted on a higher note means the bass is a chord tone — an inversion.
  for (const root of orderedPcs) {
    const intervals = new Set([...allPcs].map(pc => (pc - root + 12) % 12));
    for (const [type, ints] of Object.entries(CHORD_INTERVALS)) {
      const typePCs = new Set(ints.map(iv => iv % 12));
      if (typePCs.size === intervals.size && [...typePCs].every(iv => intervals.has(iv))) {
        const chordName = pcName(root) + (CHORD_TYPE_DISPLAY[type] ?? type);
        results.push(root === bassPc ? chordName : `${chordName}/${pcName(bassPc)}`);
      }
    }
  }
  return results;
}

function renderClickedChordId() {
  const el = document.getElementById('chord-id-display');
  if (!el) return;
  const count = clickedPositions.size;
  if (count === 0 || state.activeChord || state.baseAltChord || state.transitionChord) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  if (count < 3) {
    const need = 3 - count;
    el.textContent = `${need} more note${need > 1 ? 's' : ''} needed to identify chord`;
    el.style.opacity = '0.5';
    el.style.fontSize = '13px';
  } else {
    const chords = identifyChords([...clickedPositions.values()]);
    el.textContent = chords.length ? chords.join('  –  ') : '—';
    el.style.opacity = '1';
    el.style.fontSize = '';
  }
}

function handleFretboardClick(e) {
  if (state.activeChord || state.baseAltChord || state.transitionChord) return;
  if (!_fretPositionsCache.length || !_stringPositionsRev.length) return;
  const div = document.getElementById('fretboard');
  const layout = div._fullLayout;
  if (!layout) return;
  const rect = div.getBoundingClientRect();
  const px = e.clientX - rect.left - layout.margin.l;
  const py = e.clientY - rect.top  - layout.margin.t;
  const plotW = layout.width  - layout.margin.l - layout.margin.r;
  const plotH = layout.height - layout.margin.t - layout.margin.b;
  if (px < 0 || px > plotW || py < 0 || py > plotH) return;
  const xRange = layout.xaxis.range;
  const yRange = layout.yaxis.range;
  const dataX = xRange[0] + (px / plotW) * (xRange[1] - xRange[0]);
  const dataY = yRange[1] - (py / plotH) * (yRange[1] - yRange[0]);
  // Snap to nearest string (y-axis); reject if click is too far between strings
  let bestSi = -1, bestSiDist = Infinity;
  for (let si = 0; si < _stringPositionsRev.length; si++) {
    const d = Math.abs(_stringPositionsRev[si] - dataY);
    if (d < bestSiDist) { bestSiDist = d; bestSi = si; }
  }
  if (bestSiDist > STRING_SCALE_FACTOR * 0.55) return;
  // Snap to nearest fret (0=open string, 1..NUM_FRETS=fretted positions)
  const allX = [0, ..._fretPositionsCache];
  let bestFi = 0, bestFiDist = Math.abs(allX[0] - dataX);
  for (let i = 1; i < allX.length; i++) {
    const d = Math.abs(allX[i] - dataX);
    if (d < bestFiDist) { bestFiDist = d; bestFi = i; }
  }
  const si = bestSi, fi = bestFi;
  const stringLabels = state.strings.slice(0, state.numStrings).map(validateNote);
  if (si >= stringLabels.length) return;
  const note = fi === 0 ? stringLabels[si] : transposeNote(stringLabels[si], fi);
  const key = `${si},${fi}`;
  const wasSelected = clickedPositions.has(key);
  // Remove any existing selection on this string (one per string maximum)
  for (const k of clickedPositions.keys()) {
    if (k.startsWith(`${si},`)) { clickedPositions.delete(k); break; }
  }
  // Same position clicked again = deselect; different position = replace with new
  if (!wasSelected) clickedPositions.set(key, note);
  renderClickedChordId();
  const fig = buildFretboardData();
  if (fig) Plotly.react('fretboard', fig.traces, fig.layout, { displayModeBar:false, responsive:true });
}

function bindFretboardClick() {
  const div = document.getElementById('fretboard');
  if (div && !div._clickHandlerBound) {
    div.addEventListener('click', handleFretboardClick);
    // On touch devices, Plotly's hover tooltip still shows on tap (desired —
    // it's how a touch user sees the note label), but the synthetic "ghost
    // click" that follows a touch fires too late / gets swallowed by Plotly's
    // hover handling, so the click listener above never selects the note.
    // Drive selection directly from touchend, then preventDefault there only
    // (after the hover has already been triggered by touchstart/touchmove)
    // to suppress that ghost click so the toggle doesn't fire twice.
    div.addEventListener('touchend', e => {
      e.preventDefault();
      const touch = e.changedTouches && e.changedTouches[0];
      if (touch) handleFretboardClick({ clientX: touch.clientX, clientY: touch.clientY });
    }, { passive: false });
    div._clickHandlerBound = true;
  }
}

function renderFretboard() {
  const fig = buildFretboardData();
  if (!fig) return;
  Plotly.react('fretboard', fig.traces, fig.layout, { displayModeBar:false, responsive:true });
  renderChordDiagrams();
  renderClickedChordId();
}

// ── Chord voicing finder ─────────────────────────────────────────────────────

// Returns the minimum number of fretting fingers required for a voicing.
//
// Barre rules (si=0 = highest-pitch / rightmost string):
//   - Strings above minFret that precede the barre each need one finger.
//   - The barre starts at the first string AT minFret (skipping leading
//     open/muted strings and strings fretted above minFret).
//   - The barre extends toward lower pitch through contiguous fretted strings;
//     open/muted strings break it.
//   - A barre is only used when 2+ strings in the barre range are at minFret.
//   - One barre only; fretted strings after an open/muted break each count
//     individually.
function fingersNeeded(frets, numStrings) {
  const fs = frets.slice(0, numStrings);
  const frettedFrets = fs.filter(f => f > 0);
  if (!frettedFrets.length) return 0;

  const minFret = Math.min(...frettedFrets);

  // Scan from si=0: count individual fingers for strings above minFret that
  // precede the barre, then find the first string AT minFret as barreStart.
  let leadFingers = 0;
  let barreStart = -1;
  for (let si = 0; si < numStrings; si++) {
    const f = fs[si];
    if (f <= 0) continue;
    if (f > minFret) { leadFingers++; continue; }
    barreStart = si;
    break;
  }

  if (barreStart === -1) return frettedFrets.length;

  // Extend barre until an open or muted string breaks it.
  let barreEnd = barreStart;
  for (let si = barreStart + 1; si < numStrings; si++) {
    if (fs[si] === 0 || fs[si] === -1) break;
    barreEnd = si;
  }

  // Only treat it as a barre if 2+ strings in the range are at minFret.
  let minFretCount = 0;
  for (let si = barreStart; si <= barreEnd; si++) {
    if (fs[si] === minFret) minFretCount++;
  }
  const useBarre = minFretCount >= 2;

  let fingers = leadFingers + (useBarre ? 1 : 0);
  for (let si = barreStart; si <= barreEnd; si++) {
    if (useBarre && fs[si] === minFret) continue;
    fingers++;
  }
  // Fretted strings past the first open/muted break each need their own finger.
  for (let si = barreEnd + 1; si < numStrings; si++) {
    if (fs[si] > 0) fingers++;
  }
  return fingers;
}

function findChordVoicings(chordNotes, stringNotes, numStrings, maxResults = 500) {
  const allResults = [];
  const seen = new Set();
  let totalNodes = 0;
  const NODE_LIMIT = 2000000;
  // All chord tones must be present (cap at string count for extended chords)
  const minRequired = Math.min(chordNotes.length, numStrings);

  function buildOptions(wStart, wEnd) {
    return stringNotes.slice(0, numStrings).map(sn => {
      const opts = [{ fret: -1, ti: -1 }];
      const toCheck = new Set([0]);
      for (let f = Math.max(1, wStart); f <= wEnd; f++) toCheck.add(f);
      for (const f of toCheck) {
        const note = transposeNote(sn, f);
        for (let ti = 0; ti < chordNotes.length; ti++) {
          if (isOctaveOfNote(chordNotes[ti], note)) { opts.push({ fret: f, ti }); break; }
        }
      }
      return opts;
    });
  }

  function dfs(options, s, fretsArr, covered, suffixReachable) {
    if (totalNodes++ > NODE_LIMIT) return;
    if (s === numStrings) {
      if (!covered.has(0) || covered.size < minRequired) return;
      if (fingersNeeded(fretsArr, numStrings) > 4) return;
      const key = fretsArr.join(',');
      if (!seen.has(key)) { seen.add(key); allResults.push([...fretsArr]); }
      return;
    }
    // Prune: even using all remaining strings we can't reach minRequired tones
    if (covered.size + (suffixReachable[s]?.size ?? 0) < minRequired) return;
    // Prune: root unreachable from remaining strings
    if (!covered.has(0) && !suffixReachable[s]?.has(0)) return;
    for (const opt of options[s]) {
      fretsArr[s] = opt.fret;
      dfs(options, s + 1, fretsArr,
        opt.ti >= 0 ? new Set([...covered, opt.ti]) : covered,
        suffixReachable);
    }
    fretsArr[s] = -1;
  }

  const arr = new Array(numStrings).fill(-1);
  for (let w = 0; w <= 19 && totalNodes < NODE_LIMIT; w++) {
    const options = buildOptions(w, w + 4);
    // Precompute suffix reachable[s] = union of ti values available on strings s..n-1
    const suffixReachable = new Array(numStrings + 1);
    suffixReachable[numStrings] = new Set();
    for (let i = numStrings - 1; i >= 0; i--) {
      suffixReachable[i] = new Set([...suffixReachable[i + 1]]);
      for (const opt of options[i]) if (opt.ti >= 0) suffixReachable[i].add(opt.ti);
    }
    // Skip window if it can't possibly cover all required tones
    if (suffixReachable[0].size < minRequired) continue;
    dfs(options, 0, arr, new Set(), suffixReachable);
  }

  // Remove voicings whose played (string, fret) pairs are a proper subset of
  // another voicing — the fuller voicing is strictly better.
  {
    // Pack each played (stringIndex, fret) as a single int for fast Set lookup
    const sets = allResults.map(frets => {
      const s = new Set();
      frets.forEach((f, i) => { if (f >= 0) s.add(i * 30 + f); });
      return s;
    });
    const dominated = new Uint8Array(allResults.length);
    for (let i = 0; i < allResults.length; i++) {
      if (dominated[i]) continue;
      const si = sets[i];
      for (let j = 0; j < allResults.length; j++) {
        if (i === j || dominated[j] || sets[j].size <= si.size) continue;
        let isSubset = true;
        for (const e of si) { if (!sets[j].has(e)) { isSubset = false; break; } }
        if (isSubset) { dominated[i] = 1; break; }
      }
    }
    for (let i = allResults.length - 1; i >= 0; i--) {
      if (dominated[i]) allResults.splice(i, 1);
    }
  }

  // Position of a voicing = lowest fretted (non-open) fret played
  const posOf = frets => {
    const fs = frets.filter(f => f > 0);
    return fs.length ? Math.min(...fs) : 0;
  };
  const toneCountOf = frets => {
    const s = new Set();
    frets.forEach((f, i) => {
      if (f < 0) return;
      const n = transposeNote(stringNotes[i], f);
      chordNotes.forEach((cn, ti) => { if (isOctaveOfNote(cn, n)) s.add(ti); });
    });
    return s.size;
  };
  const avgFretOf = frets => {
    const fs = frets.filter(f => f > 0);
    return fs.length ? fs.reduce((a, b) => a + b, 0) / fs.length : 0;
  };

  // Sort within each position bucket: tone coverage DESC, avg fret ASC
  const buckets = new Map();
  for (const frets of allResults) {
    const b = Math.floor(posOf(frets) / 5);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b).push(frets);
  }
  for (const group of buckets.values()) {
    group.sort((a, b) => {
      const dc = toneCountOf(b) - toneCountOf(a);
      return dc || avgFretOf(a) - avgFretOf(b);
    });
  }

  // Select one best per position bucket (low fret first), then fill remainder
  const selected = [];
  const bkeys = [...buckets.keys()].sort((a, b) => a - b);
  for (const k of bkeys) {
    if (selected.length >= maxResults) break;
    selected.push(buckets.get(k).shift());
  }
  // Fill remaining slots cycling through buckets with leftover voicings
  let bi = 0;
  while (selected.length < maxResults) {
    let found = false;
    for (let i = 0; i < bkeys.length; i++) {
      const grp = buckets.get(bkeys[(bi + i) % bkeys.length]);
      if (grp && grp.length) { selected.push(grp.shift()); bi = (bi + i + 1) % bkeys.length; found = true; break; }
    }
    if (!found) break;
  }

  // Final sort by position ascending
  selected.sort((a, b) => posOf(a) - posOf(b));

  return selected;
}

// ── Chord diagram SVG renderer ────────────────────────────────────────────────

function drawChordDiagramSVG(frets, chordNotes, labels, stringNotes, numStrings) {
  const tc = THEMES[state.theme] || THEMES.light;
  // Scale string spacing down for higher string counts
  const SS  = numStrings <= 6 ? 20 : numStrings <= 8 ? 16 : 14;
  const FH  = 18; // fret row height
  const NFRETS = 5;
  const DOT_R  = Math.min(7, SS * 0.38);
  const ML = 34, MT = 30, MR = 12, MB = 8;
  const gridW  = (numStrings - 1) * SS;
  const gridH  = NFRETS * FH;
  const W = gridW + ML + MR;
  const H = gridH + MT + MB;

  // Determine start fret (lowest non-open played fret)
  const playedFrets = frets.filter(f => f > 0);
  const minFret  = playedFrets.length ? Math.min(...playedFrets) : 1;
  const startFret = minFret <= 1 ? 1 : minFret;
  const isAtNut  = startFret === 1;
  const NUT = isAtNut ? 4 : 0;
  const gridTop = MT + NUT;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  const mk = (tag, attrs, txt) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (txt !== undefined) el.textContent = txt;
    return el;
  };

  svg.appendChild(mk('rect', { x: 0, y: 0, width: W, height: H, fill: tc.bg }));

  // Nut (thick bar) or position number
  if (isAtNut) {
    svg.appendChild(mk('rect', { x: ML, y: MT, width: gridW, height: NUT, fill: tc.annotation }));
  } else {
    svg.appendChild(mk('text', {
      x: ML - 14, y: gridTop + FH * 0.68,
      'text-anchor': 'end', 'font-size': '10', fill: tc.annotation
    }, String(startFret)));
  }

  // Fret lines
  for (let f = isAtNut ? 1 : 0; f <= NFRETS; f++) {
    const y = gridTop + f * FH;
    svg.appendChild(mk('line', {
      x1: ML, y1: y, x2: ML + gridW, y2: y, stroke: tc.annotation, 'stroke-width': '1'
    }));
  }

  // String lines
  for (let d = 0; d < numStrings; d++) {
    const x = ML + d * SS;
    svg.appendChild(mk('line', {
      x1: x, y1: gridTop, x2: x, y2: gridTop + gridH, stroke: tc.annotation, 'stroke-width': '1'
    }));
  }

  // Per-string indicators (x / o) and fretted dots
  // Diagram columns: d=0 = lowest string = stringNotes[numStrings-1]
  for (let d = 0; d < numStrings; d++) {
    const s = numStrings - 1 - d; // string index (low→left, high→right)
    const x = ML + d * SS;
    const fret = frets[s];

    if (fret < 0) {
      // Muted
      svg.appendChild(mk('text', {
        x, y: MT - 5, 'text-anchor': 'middle',
        'font-size': '12', fill: tc.annotation, 'font-weight': 'bold'
      }, '×'));
    } else {
      // Open string (fret === 0) or fretted note — both get a colored dot
      const cy = fret === 0 ? MT - 10 : gridTop + (fret - startFret + 1 - 0.5) * FH;
      const note = transposeNote(stringNotes[s], fret);
      let toneIdx = -1;
      for (let ti = 0; ti < chordNotes.length; ti++) {
        if (isOctaveOfNote(chordNotes[ti], note)) { toneIdx = ti; break; }
      }
      svg.appendChild(mk('circle', {
        cx: x, cy, r: DOT_R, fill: toneIdx >= 0 ? intervalColor(labels[toneIdx]) : tc.line
      }));
      if (toneIdx >= 0 && DOT_R >= 6 && labels[toneIdx]) {
        svg.appendChild(mk('text', {
          x, y: cy + 3.5, 'text-anchor': 'middle',
          'font-size': labels[toneIdx].length > 1 ? '7' : '8',
          fill: tc.label_fill, 'font-weight': 'bold'
        }, labels[toneIdx]));
      }
    }
  }

  return svg;
}

// ── Chord diagram panel ───────────────────────────────────────────────────────

function renderChordDiagrams() {
  const container = document.getElementById('chord-diagrams');
  let notesInChord = [], chordLabels = [];

  if (state.transitionChord) {
    notesInChord = state.transitionChord.intervals.map(
      iv => transposeNote(state.transitionChord.rootNote, iv));
    chordLabels = state.transitionChord.labels;
  } else if (state.activeChord) {
    const [rowStr, chordType] = state.activeChord.split('-');
    const rowIdx = parseInt(rowStr) - 1;
    const notesInScale = buildScaleNotes(state.tonic, state.scale, state.mode);
    notesInChord = CHORD_INTERVALS[chordType].map(iv => transposeNote(notesInScale[rowIdx], iv));
    chordLabels = CHORD_INTERVAL_LABELS[chordType];
  } else if (state.baseAltChord) {
    notesInChord = state.baseAltChord.intervals.map(iv => transposeNote(state.baseAltChord.rootNote, iv));
    chordLabels = state.baseAltChord.labels;
  }

  container.innerHTML = '';
  if (!notesInChord.length) return;

  const stringNotes = state.strings.slice(0, state.numStrings).map(validateNote);
  const voicings = findChordVoicings(notesInChord, stringNotes, state.numStrings);

  const posOf = frets => {
    const fs = frets.filter(f => f > 0);
    return fs.length ? Math.min(...fs) : 0;
  };

  // Group by position (lowest fretted fret), display one row per position
  const groups = new Map();
  for (const frets of voicings) {
    const pos = posOf(frets);
    if (!groups.has(pos)) groups.set(pos, []);
    groups.get(pos).push(frets);
  }

  const selectedKey = state.selectedVoicing ? state.selectedVoicing.join(',') : null;

  for (const [, group] of [...groups.entries()].sort(([a], [b]) => a - b)) {
    const row = document.createElement('div');
    row.className = 'chord-position-row';

    for (const frets of group) {
      const key = frets.join(',');
      const wrap = document.createElement('div');
      wrap.className = 'chord-diagram-wrap';
      if (key === selectedKey) wrap.classList.add('selected');
      wrap.dataset.voicingKey = key;
      wrap.appendChild(drawChordDiagramSVG(frets, notesInChord, chordLabels, stringNotes, state.numStrings));

      wrap.addEventListener('click', () => {
        const wasSelected = state.selectedVoicing?.join(',') === key;
        state.selectedVoicing = wasSelected ? null : frets;
        const activeKey = state.selectedVoicing ? key : null;
        container.querySelectorAll('.chord-diagram-wrap').forEach(el => {
          el.classList.toggle('selected', el.dataset.voicingKey === activeKey);
        });
        if (state.selectedVoicing) {
          if (document.getElementById('auto-play-synth')?.checked) playVoicingSynth();
          if (document.getElementById('auto-play-midi')?.checked)  sendVoicingMidi();
        }
        const fig = buildFretboardData();
        if (fig) Plotly.react('fretboard', fig.traces, fig.layout, { displayModeBar: false, responsive: true });
      });

      row.appendChild(wrap);
    }
    container.appendChild(row);
  }
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
  state.activeChord     = null;
  state.baseAltChord    = null;
  state.transitionChord = null;
  state.selectedVoicing = null;
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
    label.id = `chord-label-${i}`;
    row.appendChild(label);

    for (let j = 0; j < CHORD_TYPES.length; j++) {
      const col = document.createElement('span');
      col.id = `chord-col-${i}-${j}`;

      const btn = document.createElement('button');
      btn.id = `chord-btn-${i}-${j}`;
      btn.className = 'chord-btn';
      const chordKey = `${i+1}-${CHORD_TYPES[j]}`;
      btn.addEventListener('click', () => {
        state.activeChord     = state.activeChord === chordKey ? null : chordKey;
        state.baseAltChord    = null;
        state.transitionChord = null;
        state.selectedVoicing = null;
        updateActiveChordButton();
        updateTransitionButtons();
        renderTransitions();
        renderTonicAlterations();
        renderBorrowedChords();
        renderChordNotes();
        renderTransitionNotes();
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
        const ts = document.getElementById('tuning-select');
        if (ts) ts.value = 'custom';
        state.activeChord     = null;
        state.baseAltChord    = null;
        state.transitionChord = null;
        state.selectedVoicing = null;
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

  // Tuning select
  const tuningSel = document.getElementById('tuning-select');
  for (const t of TUNINGS) {
    const el = document.createElement('option');
    el.value = t.label; el.textContent = t.label;
    tuningSel.appendChild(el);
  }
  const customOpt = document.createElement('option');
  customOpt.value = 'custom'; customOpt.textContent = 'Custom';
  tuningSel.appendChild(customOpt);
  tuningSel.value = detectCurrentTuning();

  function syncCustomSection() {
    const isCustom = tuningSel.value === 'custom';
    document.getElementById('custom-tuning-section').style.display = isCustom ? '' : 'none';
  }
  syncCustomSection();

  tuningSel.addEventListener('change', () => {
    if (tuningSel.value === 'custom') {
      syncCustomSection();
      return;
    }
    const preset = TUNINGS.find(t => t.label === tuningSel.value);
    if (!preset) return;
    state.numStrings = preset.n;
    for (let i = 0; i < preset.s.length; i++) state.strings[i] = preset.s[i];
    numStrSel.value = state.numStrings;
    for (let i = 1; i <= 10; i++) {
      const inp = document.getElementById(`string-${i}`);
      if (inp) inp.value = state.strings[i - 1];
    }
    syncCustomSection();
    state.activeChord = null; state.baseAltChord = null;
    state.transitionChord = null; state.selectedVoicing = null;
    persistState();
    renderStringVisibility();
    renderChordButtons();
    renderFretboard();
  });

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
    el.value = t; el.textContent = THEMES[t].label ?? (t.charAt(0).toUpperCase() + t.slice(1));
    themeSel.appendChild(el);
  }
  themeSel.value = state.theme;

  applyTheme();
  buildStringInputs();
  buildChordButtonGrid();

  // Transition button click handlers
  for (const [id, offset, type] of [
    ['trans-sec-dom',    7, '7'  ],
    ['trans-med-up-m3',  3, null ],
    ['trans-med-dn-m3',  9, null ],
    ['trans-med-up-M3',  4, null ],
    ['trans-med-dn-M3',  8, null ],
  ]) {
    document.getElementById(id).addEventListener('click', () => activateTransitionChord(id, offset, type));
  }

  // Tonic alteration click handlers
  for (const alt of TONIC_ALTERATIONS) {
    document.getElementById(alt.id).addEventListener('click', () => {
      state.selectedVoicing = null;
      if (state.baseAltChord?.badgeId === alt.id) {
        state.baseAltChord = null;
      } else {
        state.activeChord     = null;
        state.transitionChord = null;
        const notesInScale = buildScaleNotes(state.tonic, state.scale, state.mode);
        state.baseAltChord = {
          badgeId: alt.id,
          rootNote: transposeNote(notesInScale[0], alt.semitones),
          intervals: CHORD_INTERVALS[alt.type],
          labels: CHORD_INTERVAL_LABELS[alt.type],
        };
      }
      updateActiveChordButton();
      updateTransitionButtons();
      renderTransitions();
      renderTonicAlterations();
      renderBorrowedChords();
      renderChordNotes();
      renderTransitionNotes();
      renderFretboard();
    });
  }

  renderModeDropdown();
  renderStringVisibility();
  renderChordButtons();
  renderFretboard();
  bindFretboardClick();

  // Controls
  numStrSel.addEventListener('change', () => {
    state.numStrings = parseInt(numStrSel.value);
    tuningSel.value = 'custom';
    state.activeChord     = null;
    state.baseAltChord    = null;
    state.transitionChord = null;
    state.selectedVoicing = null;
    persistState();
    renderStringVisibility();
    renderChordButtons();
    renderFretboard();
  });

  tonicSel.addEventListener('change', () => {
    state.tonic = tonicSel.value;
    state.activeChord     = null;
    state.baseAltChord    = null;
    state.transitionChord = null;
    state.selectedVoicing = null;
    persistState();
    renderChordButtons();
    renderFretboard();
  });

  scaleSel.addEventListener('change', () => {
    state.scale = scaleSel.value;
    state.mode = MODES[state.scale][0].value;
    state.activeChord     = null;
    state.baseAltChord    = null;
    state.transitionChord = null;
    state.selectedVoicing = null;
    persistState();
    renderModeDropdown();
    renderChordButtons();
    renderFretboard();
  });

  document.getElementById('mode').addEventListener('change', e => {
    state.mode = parseInt(e.target.value);
    state.activeChord     = null;
    state.baseAltChord    = null;
    state.transitionChord = null;
    state.selectedVoicing = null;
    persistState();
    renderChordButtons();
    renderFretboard();
  });

  themeSel.addEventListener('change', () => {
    state.theme = themeSel.value;
    applyTheme();
    persistState();
    renderChordNotes();
    renderTransitionNotes();
    renderFretboard();
    renderCircleOfFifths();
  });

  // Preferences modal — opened by the Electron menu (hidden btn) or the visible gear button
  const openPreferences = () => {
    tuningSel.value = detectCurrentTuning();
    syncCustomSection();
    populateMidiDevices();
    populateMidiOutputs();
    document.getElementById('preferences-modal').classList.remove('hidden');
  };
  document.getElementById('open-preferences-btn').addEventListener('click', openPreferences);
  document.getElementById('settings-btn').addEventListener('click', openPreferences);
  document.getElementById('close-preferences-btn').addEventListener('click', () =>
    document.getElementById('preferences-modal').classList.add('hidden'));
  document.getElementById('preferences-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('preferences-modal'))
      document.getElementById('preferences-modal').classList.add('hidden');
  });

  // MIDI device selectors
  document.getElementById('midi-device-select').addEventListener('change', e => {
    setMidiDevice(e.target.value || null);
    const sel = document.getElementById('midi-device-select');
    if (sel) sel.value = state.midiDeviceId ?? '';
  });
  document.getElementById('midi-output-select').addEventListener('change', e => {
    setMidiOutput(e.target.value || null);
  });

  // Start MIDI access (async — populates device list when permission is granted)
  initMidi();

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

// Re-render the fretboard on viewport resize (handles device rotation and
// browser chrome show/hide on mobile). Debounced to avoid thrashing.
let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(renderFretboard, 150);
});
