#!/usr/bin/env python

import os
import sys
print(f'Using python version {sys.version}')

import base64
import dash_bootstrap_components as dbc
import dash
from dash import Dash, html, dcc, Input, Output, State, clientside_callback, ClientsideFunction
from flask import request as flask_request
import plotly.graph_objects as go
import re
import copy
import json

# Server-side mailbox for the Electron Open menu path (single-user app, no locking needed).
_pending_load = [None]

colors = ['#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A', '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52']

if sys.platform == 'win32':
    SETTINGS_PATH = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')),
                                 'guitar-map', 'settings.json')
else:
    SETTINGS_PATH = os.path.expanduser('~/.guitar_map.json')

# ── Theme palettes ───────────────────────────────────────────────────────────
# Each entry maps to a CSS variable of the same name (--gm-<key>).
# To add a new theme, duplicate one of these dicts and adjust the values.
THEMES = {
    'light': {
        'bg':             'white',
        'line':           'black',
        'root_fill':      'rgba(0, 0, 0, 0.8)',
        'scale_fill':     'rgba(0, 0, 0, 0.1)',
        'base_fill':      'rgba(255, 255, 255, 0.3)',
        'marker_border':  'black',
        'annotation':     'black',
    },
    'dark': {
        'bg':             '#1e1e2e',
        'line':           '#cdd6f4',
        'root_fill':      'rgba(205, 214, 244, 0.9)',
        'scale_fill':     'rgba(205, 214, 244, 0.15)',
        'base_fill':      'rgba(0, 0, 0, 0.3)',
        'marker_border':  '#cdd6f4',
        'annotation':     '#cdd6f4',
    },
}

# ── CSS injected into every page load ────────────────────────────────────────
# CSS variables drive theming for all non-figure UI elements.
# Add new themes by extending the [data-theme="..."] blocks below.
INDEX_STRING = '''
<!DOCTYPE html>
<html>
  <head>
    {%metas%}
    <title>{%title%}</title>
    {%favicon%}
    {%css%}
    <style>
      /* ── Theme variables ── */
      :root {
        --gm-bg:                 #ffffff;
        --gm-surface:            #f8f9fa;
        --gm-text:               #212529;
        --gm-border:             #ced4da;
        --gm-btn-bg:             #e9ecef;
        --gm-btn-text:           #212529;
        --gm-input-bg:           #ffffff;
        --gm-dropdown-bg:        #ffffff;
        --gm-dropdown-hover:     #f0f0f0;
        --gm-dropdown-selected:  #deebff;
      }
      [data-theme="dark"] {
        --gm-bg:                 #1e1e2e;
        --gm-surface:            #2a2a3e;
        --gm-text:               #cdd6f4;
        --gm-border:             #585b70;
        --gm-btn-bg:             #313244;
        --gm-btn-text:           #cdd6f4;
        --gm-input-bg:           #2a2a3e;
        --gm-dropdown-bg:        #2a2a3e;
        --gm-dropdown-hover:     #45475a;
        --gm-dropdown-selected:  #1e3a5f;
      }

      /* ── Base elements ── */
      body          { margin: 0;
                      background-color: var(--gm-bg)      !important;
                      color:            var(--gm-text)     !important; }
      button        { background-color: var(--gm-btn-bg)  !important;
                      color:            var(--gm-btn-text) !important;
                      border: 1px solid var(--gm-border)   !important; }
      input[type="text"] {
                      background-color: var(--gm-input-bg) !important;
                      color:            var(--gm-text)     !important;
                      border-color:     var(--gm-border)   !important; }

      /* ── Dash dcc.Dropdown (React-Select) ── */
      .Select-control          { background-color: var(--gm-dropdown-bg) !important;
                                 border-color:     var(--gm-border)       !important; }
      .Select-value-label,
      .Select-placeholder      { color: var(--gm-text)     !important; }
      .Select-input > input    { color: var(--gm-text)     !important; }
      .Select-menu-outer       { background-color: var(--gm-dropdown-bg) !important;
                                 border-color:     var(--gm-border)       !important; }
      .Select-option           { background-color: var(--gm-dropdown-bg) !important;
                                 color:            var(--gm-text)         !important; }
      .Select-option.is-focused   { background-color: var(--gm-dropdown-hover)    !important; }
      .Select-option.is-selected  { background-color: var(--gm-dropdown-selected) !important; }
      .Select-arrow            { border-top-color: var(--gm-text) !important; }
      .is-open .Select-arrow   { border-bottom-color: var(--gm-text) !important; }

      /* ── dbc / Bootstrap overrides ── */
      .row                     { --bs-gutter-x: 1.5rem; }
    </style>
  </head>
  <body>
    {%app_entry%}
    <footer>
      {%config%}
      {%scripts%}
      {%renderer%}
    </footer>
  </body>
</html>
'''


def load_settings():
    if os.path.exists(SETTINGS_PATH):
        try:
            with open(SETTINGS_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return None


def save_settings(data):
    try:
        os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
        with open(SETTINGS_PATH, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


def validate_note(note):
    if note[0] == "E" and note[1] == "#":
        return "F" + note[2:]
    if note[0] == "B" and note[1] == "#":
        return "C" + note[2:]
    if note[0] == "F" and note[1] == "b":
        return "E" + note[2:]
    if note[0] == "C" and note[1] == "b":
        return "B" + note[2:]
    return note


def extract_note_and_octave(note: str):
    note = validate_note(note)
    if len(note) == 2:
        name = note[0]
        octave = int(note[1])
        accidental = ''
    elif len(note) == 3 and note[1] in ['#', 'b']:
        name = note[0]
        accidental = note[1]
        octave = int(note[2])
    elif len(note) == 3:
        name = note[0]
        accidental = ''
        octave = int("".join(note[1:]))
    elif len(note) == 4 and note[1] in ['#', 'b']:
        name = note[0]
        accidental = note[1]
        octave = int("".join(note[2:]))
    else:
        raise ValueError(f"Invalid note format: {note}")
    return name, accidental, octave


def note_to_frequency(note: str) -> float:
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F',
                  'F#', 'G', 'G#', 'A', 'A#', 'B']
    name, accidental, octave = extract_note_and_octave(note)
    full_note = name + accidental
    if accidental == 'b':
        index = note_names.index(name) - 1
        full_note = note_names[index % 12]
    try:
        n = note_names.index(full_note)
    except ValueError:
        raise ValueError(f"Invalid note: {note}")
    semitone_distance = n - note_names.index('A') + (octave - 4) * 12
    frequency = 440 * (2 ** (semitone_distance / 12))
    return round(frequency, 2)


def convert_flat_to_sharp(note):
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F',
                  'F#', 'G', 'G#', 'A', 'A#', 'B']
    note = validate_note(note)
    name, accidental, octave = extract_note_and_octave(note)
    full_note = name + accidental
    if accidental == 'b':
        index = (note_names.index(name) - 1) % 12
        full_note = note_names[index]
    return full_note


def transpose_note(note: str, semitone_offset: int) -> str:
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F',
                  'F#', 'G', 'G#', 'A', 'A#', 'B']
    note = validate_note(note)
    name, accidental, octave = extract_note_and_octave(note)
    full_note = name + accidental
    if accidental == 'b':
        index = (note_names.index(name) - 1) % 12
        full_note = note_names[index]
    note_index = note_names.index(full_note)
    semitone_number = (octave * 12) + note_index
    new_semitone_number = semitone_number + semitone_offset
    if new_semitone_number < 0:
        raise ValueError("Resulting note is below C0, which is unsupported.")
    new_octave = new_semitone_number // 12
    new_note_index = new_semitone_number % 12
    new_note_name = note_names[new_note_index]
    return f"{new_note_name}{new_octave}"


def is_octave_of_note(note, comparison):
    note = validate_note(note)
    comparison = validate_note(comparison)
    note = re.match(r"[A-G](#|b)?", note).group()
    comparison = re.match(r"[A-G](#|b)?", comparison).group()
    return note == comparison


if __name__ == "__main__":
    app = Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])
    app.title = "Guitar Map"
    app.index_string = INDEX_STRING

    num_frets = 24
    num_strings = 8
    string_scale_factor = 0.2
    scale_length = 25.5
    string_labels = [
        "G#0", "C#1", "E1", "B1", "E2", "A2", "D3", "G3", "B3", "E4"
    ]
    min_num_strings = 4

    # Load saved settings
    saved = load_settings()
    reversed_labels = list(reversed(string_labels))

    initial_num_strings = saved.get('num_strings', num_strings) if saved else num_strings
    initial_strings = [saved.get(f'string_{i}', reversed_labels[i - 1]) for i in range(1, 11)] if saved else reversed_labels[:]
    initial_tonic = saved.get('tonic', 'C') if saved else 'C'
    initial_scale = saved.get('scale', '2212221') if saved else '2212221'
    initial_mode = saved.get('mode', 0) if saved else 0
    initial_theme = saved.get('theme', 'light') if saved else 'light'

    modes = {
        "2212221": [
            ("1: Ionian (Natural Major)", 0),
            ("2: Dorian", 1),
            ("3: Phrygian", 2),
            ("4: Lydian", 3),
            ("5: Mixolydian", 4),
            ("6: Aeolian (Natural Minor)", 5),
            ("7: Locrian", 6),
        ],
        "2122131": [
            ("1: Aeolian ♮7 (Harmonic minor)", 0),
            ("2: Locrian ♮6", 1),
            ("3: Ionan #6 (Augmented major)", 2),
            ("4: Ukranian Dorian\n(Dorian #11, Dorian #4 Romanian Minor, Arabic, Nikriz, Mi Sheberakh, Altererd Dorian)", 3),
            ("5: Phrygian Dominant\n(Hijaz, Double Harmonic Major b7, Freygish)", 4),
            ("6: Lydian #9", 5),
            ("7: Super Locrian bb7\n(Altered Diminished, Ultralocrian)", 6),
        ],
        "2122221": [
            ("1: Melodic minor scale (Jazz minor)", 0),
            ("2: Dorian b2 (Phrygian #6)", 1),
            ("3: Lydian Augmented", 2),
            ("4: Lydian Dominant (Overtone Scale)", 3),
            ("5: Mixolydian b6", 4),
            ("6: Aeolian b5 (Locrian #2)", 5),
            ("7: Altered Scale (Super Locrian)", 6)
        ],
        "2131131": [
            ("Double Harmonic Minor (Hungarian Minor)", 0),
            ("Oriental", 1),
            ("Ionian ♯2 ♯5", 2),
            ("Locrian bb3 bb7", 3),
            ("Double harmonic major (Phrygian Dominant #7)", 4),
            ("Lydian #2 #6", 5),
            ("Ultraphrygian (Phrygian b4 bb7)", 6),
        ],
        "22323": [
            ("1: Penatonic Major (Ionian Pentatonic)", 0),
            ("2: Dorian Pentatonic", 1),
            ("3: Phrygian Pentatonic", 2),
            ("4: Mixolydian Pentatonic", 3),
            ("5: Pentatonic Minor (Aeolian Pentatonic)", 4),
        ],
        "211323": [
            ("1: Major Blues (Ionian)", 0),
            ("4: Minor Blues (Aeolian)", 3),
        ],
        "313131": [
            ("1: Major Augmented", 0),
            ("2: Minor Augmented", 1),
        ],
        "21212121": [
            ("1: Diminished", 0),
            ("2: Alternate Diminished", 1),
        ]
    }

    initial_mode_options = [
        {'label': i[0].split("(")[0], 'value': i[1], "title": i[0]}
        for i in modes[initial_scale]
    ]
    if initial_mode not in [o['value'] for o in initial_mode_options]:
        initial_mode = initial_mode_options[0]['value']

    chord_intervals = {
        'maj': [0, 4, 7],
        'min': [0, 3, 7],
        'dim': [0, 3, 6],
        'aug': [0, 4, 8],
        '7': [0, 4, 7, 10],
        'maj7': [0, 4, 7, 11],
        'min7': [0, 3, 7, 10],
        'dim7': [0, 3, 6, 9],
        'sus2': [0, 2, 7],
        'sus4': [0, 5, 7],
        'add9': [0, 4, 7, 14],
    }

    chord_interval_labels = {
        'maj': ['R', '3', '5'],
        'min': ['R', 'm3', '5'],
        'dim': ['R', 'm3', 'b5'],
        'aug': ['R', '3', 'A5'],
        '7': ['R', '3', '5', 'm7'],
        'maj7': ['R', '3', '5', '7'],
        'min7': ['R', 'm3', '5', 'm7'],
        'dim7': ['R', 'm3', 'b5', 'bb7'],
        'sus2': ['R', '2', '5'],
        'sus4': ['R', '4', '5'],
        'add9': ['R', '3', '5', '9'],
    }

    # ── Layout ──────────────────────────────────────────────────────────────

    style1 = {"height": 30}
    style2 = {"height": 30, "width": "100px"}

    column1 = []
    column2 = []

    column1.append(html.Div('Number of strings', style=style1))
    column2.append(
        html.Div(
            dcc.Dropdown(
                id='num-strings',
                options=[{'label': i, 'value': i} for i in range(4, 11)],
                value=initial_num_strings,
                style=style2,
            ),
            style=style2,
        ),
    )

    for i, note in enumerate(reversed(string_labels), start=1):
        column1.append(html.Div(f"String {i}", style=style1, id=f"string-{i}-label"))
        column2.append(
            html.Div(
                [
                    dcc.Input(
                        id=f"string-{i}",
                        placeholder=f"String {i}",
                        type='text',
                        value=initial_strings[i - 1],
                        pattern="[A-G](?:b|#)?(?:[0-9]|10)",
                        style=style2,
                    ),
                ],
                style=style2,
            ),
        )

    column3 = []
    column4 = []

    column3.append(html.Div('Tonic', style={"height": 36}))
    column4.append(
        html.Div(
            dcc.Dropdown(
                id='tonic',
                options=[
                    {'label': i,
                     'value': convert_flat_to_sharp(re.match(r"^[A-G](b|#)?", i)[0] + "0")}
                    for i in [
                        "A", "Bb (A#)", "B", "C", "Db (C#)",
                        "D", "Eb (D#)", "E", "F", "F# (Gb)",
                        "G", "Ab (G#)"
                    ]
                ],
                value=initial_tonic,
                style={"height": 36, "width": "120px"},
            ),
            style={"height": 36},
        ),
    )

    column3.append(html.Div('Scale', style={"height": 36}))
    column4.append(
        html.Div(
            dcc.Dropdown(
                id='scale',
                options=[
                    {'label': i[0], 'value': i[1]}
                    for i in [
                        ("Diatonic", "2212221"),
                        ("Harmonic minor", "2122131"),
                        ("Melodic minor", "2122221"),
                        ("Hungarian minor", "2131131"),
                        ("Pentatonic", "22323"),
                        ("Major Blues", "211323"),
                        ("Augmented", "313131"),
                        ("Diminished", "21212121"),
                    ]
                ],
                value=initial_scale,
                style={"height": 36, "width": "300px"},
            ),
            style={"height": 36, "width": "300px"},
        ),
    )

    column3.append(html.Div('Mode', style={"height": 36}))
    column4.append(
        html.Div(
            dcc.Dropdown(
                id='mode',
                options=initial_mode_options,
                value=initial_mode,
                style={"width": "300px", "height": 36},
            ),
            style={"width": "300px", "height": 36},
        ),
    )

    for column in [column3, column4]:
        column.append(html.Div('', style={"height": 30}))

    for i, label in enumerate(["I", "II", "III", "IV", "V", "VI", "VII"], start=1):
        column3.append(html.Div(label, style={"height": 30}))
        column4.append(
            dbc.Row(
                [
                    dbc.Col(
                        html.Div(
                            html.Button(
                                f'{i}{chord}',
                                id={
                                    "name": f"{i}-{chord}-button",
                                    "type": 'button',
                                    "index": j * (i - 1) + j
                                },
                                style={"width": 55, "height": 30, "font-size": "small"}
                            ),
                            id=f'{i}-{chord}-div'
                        ),
                        style={"justify": "start", "height": 30, "width": 55},
                        id=f'{i}-{chord}-col'
                    )
                    for j, chord in enumerate(chord_intervals.keys())
                ],
                style={"height": "30", "width": 55 * len(chord_intervals.keys()), "justify": "start"},
                id=f"chord-{i}-row"
            ),
        )

    app.layout = html.Div(
        style={"overflow-x": "hidden"},
        children=[
            # Non-visual stores / download sink
            dcc.Download(id="download-settings"),
            dcc.Store(id='load-store'),
            dcc.Store(id='mode-store'),
            dcc.Store(id='theme-store', data=initial_theme, storage_type='local'),
            html.Div(id='save-status', style={'display': 'none'}),
            html.Div(id='theme-applier', style={'display': 'none'}),
            # Hidden triggers for Electron menu items
            html.Button(id='open-preferences', style={'display': 'none'}),
            html.Button(id='save-button', style={'display': 'none'}),
            html.Button(id='trigger-open', style={'display': 'none'}),
            # position:absolute + opacity:0 keeps the file input clickable;
            # display:none would cause Chromium to silently reject programmatic clicks.
            dcc.Upload(
                id="upload-settings",
                children=html.Div(),
                accept=".json",
                style={
                    'position': 'absolute',
                    'width': '1px',
                    'height': '1px',
                    'opacity': '0',
                    'overflow': 'hidden',
                    'pointer-events': 'none',
                },
            ),
            # Preferences dialog
            dbc.Modal(
                [
                    dbc.ModalHeader(dbc.ModalTitle("Preferences")),
                    dbc.ModalBody(
                        dbc.Row(
                            [
                                dbc.Col(html.Label("Theme"), width="auto",
                                        style={"display": "flex", "align-items": "center"}),
                                dbc.Col(
                                    dcc.Dropdown(
                                        id='theme-dropdown',
                                        options=[{'label': t.capitalize(), 'value': t}
                                                 for t in THEMES],
                                        clearable=False,
                                        searchable=False,
                                        style={"width": "140px"},
                                    ),
                                    width="auto",
                                ),
                            ],
                            align="center",
                        )
                    ),
                    dbc.ModalFooter(
                        html.Button("Close", id="close-preferences")
                    ),
                ],
                id="preferences-modal",
                is_open=False,
            ),
            # Controls
            html.Div(
                [dbc.Row([
                    dbc.Col(column1, width="auto"),
                    dbc.Col(column2),
                    dbc.Col(column3, width="auto"),
                    dbc.Col(column4),
                ])],
                style={"margin": "10px"},
            ),
            html.Div([dcc.Graph(id='fretboard', config={'displayModeBar': False})]),
        ],
    )

    # ── Theme callbacks ──────────────────────────────────────────────────────

    @app.callback(
        Output('preferences-modal', 'is_open'),
        [Input('open-preferences', 'n_clicks'),
         Input('close-preferences', 'n_clicks')],
        State('preferences-modal', 'is_open'),
        prevent_initial_call=True,
    )
    def toggle_preferences(open_clicks, close_clicks, is_open):
        return not is_open

    # Keep the dropdown value in sync with the store (e.g. on settings load).
    @app.callback(
        Output('theme-dropdown', 'value'),
        Input('theme-store', 'data'),
    )
    def sync_theme_dropdown(theme):
        return theme or 'light'

    # Dropdown selection → store.
    @app.callback(
        Output('theme-store', 'data'),
        Input('theme-dropdown', 'value'),
        prevent_initial_call=True,
    )
    def update_theme_store(value):
        return value or 'light'

    # Store change → apply data-theme attribute directly in the browser.
    app.clientside_callback(
        """
        function(theme) {
            document.documentElement.setAttribute('data-theme', theme || 'light');
            return '';
        }
        """,
        Output('theme-applier', 'children'),
        Input('theme-store', 'data'),
    )

    # ── Fretboard callbacks ──────────────────────────────────────────────────

    @app.callback(
        [Output('mode', 'options'),
         Output('mode', 'value')],
        [Input('scale', 'value'),
         Input('mode-store', 'data')],
        [State('mode', 'value')],
    )
    def update_modes(scale_value, mode_store, current_mode):
        if scale_value is None:
            return dash.no_update, dash.no_update
        options = [{'label': i[0].split("(")[0], 'value': i[1], "title": i[0]}
                   for i in modes[scale_value]]
        valid = [o['value'] for o in options]
        ctx = dash.callback_context
        triggered = [t['prop_id'].split('.')[0] for t in ctx.triggered] if ctx.triggered else []
        if 'mode-store' in triggered and mode_store is not None:
            mode_val = mode_store if mode_store in valid else options[0]['value']
        elif not triggered:
            mode_val = current_mode if current_mode in valid else options[0]['value']
        else:
            mode_val = options[0]['value']
        return options, mode_val

    @app.callback(
        [Output(component_id={
            "name": f'{i + 1}-{chord}-button',
            "index": j * i + j,
            "type": "button"}, component_property='children')
         for i in range(7) for j, chord in enumerate(chord_intervals.keys())] +
        [Output(f'{i}-{chord}-div', 'style')
         for i in range(1, 8) for chord in chord_intervals.keys()] +
        [Output(f"{i}-{chord}-col", "style")
         for i in range(1, 8) for chord in chord_intervals.keys()] +
        [Output(f"chord-{i}-row", "style") for i in range(1, 8)],
        [Input('tonic', 'value'),
         Input('scale', 'value'),
         Input('mode', 'value')],
    )
    def update_chords_in_mode(tonic, scale, mode):
        if tonic is None or scale is None or mode is None:
            return [dash.no_update] * (7 * len(chord_intervals.keys()) * 3 + 7)
        style = {"height": 30, "width": 55, "display": "block"}
        current_note = tonic + "0"
        notes_in_scale = [current_note]
        for interval in scale[:-1]:
            current_note = transpose_note(current_note, int(interval))
            notes_in_scale.append(current_note)
        n = mode % len(notes_in_scale)
        notes_in_scale = notes_in_scale[n:] + notes_in_scale[:n]
        num_notes_in_scale = len(notes_in_scale)
        button_labels = [
            f"{notes_in_scale[i][:-1]}{chord}" if i < num_notes_in_scale else chord
            for i in range(7) for chord in chord_intervals.keys()
        ]
        num_chords_in_scale = []
        chords_in_scale = []
        for i in range(7):
            if i >= num_notes_in_scale:
                num_chords_in_scale.append(0)
                chords_in_scale.extend([False] * len(chord_intervals))
                continue
            num_chords_in_scale.append(0)
            for chord, intervals in chord_intervals.items():
                notes_in_chord = [transpose_note(notes_in_scale[i], iv) for iv in intervals]
                found = [any(is_octave_of_note(n1, n2) for n2 in notes_in_scale) for n1 in notes_in_chord]
                in_scale = all(found)
                chords_in_scale.append(in_scale)
                if in_scale:
                    num_chords_in_scale[-1] += 1
        div_styles    = [copy.copy(style) for _ in range(len(chord_intervals) * 7)]
        column_styles = [copy.copy(style) for _ in range(len(chord_intervals) * 7)]
        for i, in_scale in enumerate(chords_in_scale):
            if not in_scale:
                div_styles[i].update({"display": "none", "width": 0})
                column_styles[i].update({"display": "none", "width": 0})
        row_style  = {"height": 30, "width": 55 * len(chord_intervals), "justify": "start"}
        row_styles = [copy.copy(row_style) for _ in range(7)]
        for i, num in enumerate(num_chords_in_scale):
            row_styles[i]["width"] = 55 * num
        return button_labels + div_styles + column_styles + row_styles

    @app.callback(
        [Output(f'string-{i}', 'style') for i in range(1, 11)] +
        [Output(f'string-{i}-label', 'style') for i in range(1, 11)],
        [Input('num-strings', 'value')],
    )
    def show_hide_element(value):
        styles = []
        for i in range(10):
            styles.append({'display': 'block', "height": 30, "width": "100px"} if i < value else {'display': 'none'})
        for i in range(10):
            styles.append({'display': 'block', "height": 30} if i < value else {'display': 'none'})
        return styles

    @app.callback(
        Output('fretboard', "figure", allow_duplicate=True),
        [Input({'type': 'button', 'index': dash.dependencies.ALL, "name": dash.dependencies.ALL}, 'n_clicks')],
        [State('num-strings', 'value')] +
        [State(f'string-{i}', 'value') for i in range(1, 11)] +
        [State('tonic', 'value'),
         State('scale', 'value'),
         State('mode', 'value'),
         State('theme-store', 'data')],
        allow_duplicate=True,
        prevent_initial_call=True,
    )
    def update_chord_on_figure(value, num_strings, string_1, string_2, string_3, string_4,
                               string_5, string_6, string_7, string_8, string_9,
                               string_10, tonic, scale, mode, theme):
        ctx = dash.callback_context
        if not ctx.triggered:
            return dash.no_update
        button_id = json.loads(ctx.triggered[0]['prop_id'].split('.')[0])
        return update_figure_impl(num_strings, string_1, string_2, string_3, string_4,
                                  string_5, string_6, string_7, string_8, string_9,
                                  string_10, tonic, scale, mode, theme, chord=button_id["name"])

    @app.callback(
        Output('fretboard', "figure"),
        [Input('num-strings', 'value')] +
        [Input(f'string-{i}', 'value') for i in range(1, 11)] +
        [Input('tonic', 'value'),
         Input('scale', 'value'),
         Input('mode', 'value'),
         Input('theme-store', 'data')],
        allow_duplicate=True,
    )
    def update_figure(num_strings, string_1, string_2, string_3, string_4,
                      string_5, string_6, string_7, string_8, string_9,
                      string_10, tonic, scale, mode, theme):
        return update_figure_impl(num_strings, string_1, string_2, string_3, string_4,
                                  string_5, string_6, string_7, string_8, string_9,
                                  string_10, tonic, scale, mode, theme)

    # ── Settings persistence callbacks ──────────────────────────────────────

    @app.callback(
        Output('save-status', 'children'),
        [Input('num-strings', 'value')] +
        [Input(f'string-{i}', 'value') for i in range(1, 11)] +
        [Input('tonic', 'value'),
         Input('scale', 'value'),
         Input('mode', 'value'),
         Input('theme-store', 'data')],
        prevent_initial_call=True,
    )
    def auto_save(num_strings, *args):
        strings = list(args[:10])
        tonic, scale, mode, theme = args[10], args[11], args[12], args[13]
        if None in [num_strings, tonic, scale, mode] or None in strings:
            return dash.no_update
        settings = {
            'num_strings': num_strings,
            **{f'string_{i + 1}': s for i, s in enumerate(strings)},
            'tonic': tonic,
            'scale': scale,
            'mode': mode,
            'theme': theme or 'light',
        }
        save_settings(settings)
        return ''

    @app.callback(
        Output('download-settings', 'data'),
        Input('save-button', 'n_clicks'),
        [State('num-strings', 'value')] +
        [State(f'string-{i}', 'value') for i in range(1, 11)] +
        [State('tonic', 'value'),
         State('scale', 'value'),
         State('mode', 'value'),
         State('theme-store', 'data')],
        prevent_initial_call=True,
    )
    def save_to_file(n_clicks, num_strings, *args):
        strings = list(args[:10])
        tonic, scale, mode, theme = args[10], args[11], args[12], args[13]
        settings = {
            'num_strings': num_strings,
            **{f'string_{i + 1}': s for i, s in enumerate(strings)},
            'tonic': tonic,
            'scale': scale,
            'mode': mode,
            'theme': theme or 'light',
        }
        return dcc.send_string(json.dumps(settings, indent=2), filename='guitar_map.json')

    @app.callback(
        [Output('load-store', 'data'),
         Output('upload-settings', 'contents')],
        Input('upload-settings', 'contents'),
        prevent_initial_call=True,
    )
    def parse_upload(contents):
        if contents is None:
            return dash.no_update, dash.no_update
        _, content_string = contents.split(',', 1)
        try:
            data = json.loads(base64.b64decode(content_string).decode('utf-8'))
            return data, None  # clear contents so the same file can be opened again
        except Exception:
            return dash.no_update, None

    @app.callback(
        [Output('num-strings', 'value')] +
        [Output(f'string-{i}', 'value') for i in range(1, 11)] +
        [Output('tonic', 'value'),
         Output('scale', 'value'),
         Output('mode-store', 'data'),
         Output('theme-store', 'data', allow_duplicate=True)],
        Input('load-store', 'data'),
        prevent_initial_call=True,
    )
    def apply_settings(settings):
        if settings is None:
            return [dash.no_update] * 16
        num_str = settings.get('num_strings', initial_num_strings)
        strings = [settings.get(f'string_{i}', reversed_labels[i - 1]) for i in range(1, 11)]
        tonic   = settings.get('tonic', initial_tonic)
        scale   = settings.get('scale', initial_scale)
        mode    = settings.get('mode', initial_mode)
        theme   = settings.get('theme', 'light')
        return [num_str] + strings + [tonic, scale, mode, theme]

    # ── Figure renderer ──────────────────────────────────────────────────────

    def update_figure_impl(num_strings, string_1, string_2, string_3, string_4,
                           string_5, string_6, string_7, string_8, string_9,
                           string_10, tonic, scale, mode, theme, chord=None):

        tc = THEMES.get(theme or 'light', THEMES['light'])
        line_style = dict(color=tc['line'])

        pattern = r"^[A-G](?:b|#)?(?:[0-9]|10)$"
        string_labels_local = [
            string_1, string_2, string_3, string_4, string_5,
            string_6, string_7, string_8, string_9, string_10
        ]
        for label in string_labels_local:
            if label is None or not re.match(pattern, label):
                return dash.no_update
        if tonic is None or scale is None or mode is None:
            return dash.no_update

        current_note = tonic + "0"
        notes_in_scale = [current_note]
        for interval in scale[:-1]:
            current_note = transpose_note(current_note, int(interval))
            notes_in_scale.append(current_note)
        n = mode % len(notes_in_scale)
        notes_in_scale = notes_in_scale[n:] + notes_in_scale[:n]
        root = notes_in_scale[0]

        string_labels_local = [validate_note(note) for note in string_labels_local]

        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=[0, 0], y=[0, (num_strings - 1) * string_scale_factor],
            mode="lines", line=line_style, hoverinfo="skip",
        ))

        x_prev = 0
        prev = scale_length
        root12_2 = 2. ** (1. / 12.)
        fret_positions = []
        for i in range(num_frets):
            tmp = prev / root12_2
            x = scale_length - tmp
            prev = tmp
            fig.add_trace(go.Scatter(
                x=[x, x], y=[0, (num_strings - 1) * string_scale_factor],
                mode="lines", line=line_style, hoverinfo="skip",
            ))
            fret_positions.append(x_prev + ((x - x_prev) / 2.0))
            x_prev = x

        string_positions = []
        for i in range(num_strings):
            y = i * string_scale_factor
            string_positions.append(y)
            fig.add_trace(go.Scatter(
                x=[0, x], y=[y, y], mode="lines", line=line_style, hoverinfo="skip",
            ))

        draw_markers_for = [1, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
        offset = 0.05
        for i in draw_markers_for:
            fx = fret_positions[i - 1]
            if i % 12:
                fig.add_trace(go.Scatter(
                    x=[fx], y=[-string_scale_factor], mode="markers",
                    line=dict(color=tc['line'], width=2),
                    hovertemplate=f"{i}<extra></extra>",
                ))
            else:
                fig.add_trace(go.Scatter(
                    x=[fx - offset, fx + offset], y=[-string_scale_factor, -string_scale_factor],
                    mode="markers", line=dict(color=tc['line'], width=2),
                    hovertemplate=f"{i}<extra></extra>",
                ))

        string_positions.reverse()
        for note, y_pos in zip(string_labels_local, string_positions):
            fig.add_annotation(
                xref="paper", x=0, xanchor="right",
                yref="y",      y=y_pos,
                text=note,
                showarrow=False,
                font=dict(color=tc['annotation']),
            )

        notes_in_chord = []
        chord_labels = None
        if chord:
            chord_root     = notes_in_scale[int(chord.split("-")[0]) - 1]
            chord_interval = chord_intervals[chord.split("-")[1]]
            notes_in_chord = [transpose_note(chord_root, c) for c in chord_interval]
            chord_labels   = chord_interval_labels[chord.split("-")[1]]

        for y_pos, base_note in zip(string_positions, string_labels_local):
            fig.add_trace(go.Scatter(
                x=[0.0], y=[y_pos], mode="markers",
                hovertemplate=f"{base_note} ({note_to_frequency(base_note)}Hz)<extra></extra>",
                marker=dict(size=1, color=tc['line']),
            ))

            marker = dict(
                color=tc['base_fill'],
                size=20,
                line=dict(color=tc['marker_border'], width=2),
            )

            in_scale = False
            if is_octave_of_note(root, base_note):
                marker["color"] = tc['root_fill']
                in_scale = True
            for scale_note in notes_in_scale[1:]:
                if is_octave_of_note(base_note, scale_note):
                    marker["color"] = tc['scale_fill']
                    in_scale = True

            in_chord = False
            if in_scale and chord:
                for j, chord_note in enumerate(notes_in_chord):
                    if is_octave_of_note(chord_note, base_note):
                        marker["color"] = colors[j]
                        chord_label = chord_labels[j]
                        in_chord = True
                        break

            if in_scale and not in_chord:
                fig.add_trace(go.Scatter(x=[0.0], y=[y_pos], mode="markers",
                                         hoverinfo="skip", marker=marker))
            if in_scale and in_chord:
                fig.add_trace(go.Scatter(x=[0.0], y=[y_pos], mode="markers+text",
                                         hoverinfo="skip", marker=marker, text=[chord_label]))

            for i in range(num_frets):
                note = transpose_note(base_note, i + 1)
                fig.add_trace(go.Scatter(
                    x=[fret_positions[i]], y=[y_pos], mode="markers",
                    hovertemplate=f"{note} ({note_to_frequency(note)}Hz)<extra></extra>",
                    marker=dict(size=1, color=tc['line']),
                ))
                in_scale = False
                if is_octave_of_note(root, note):
                    marker["color"] = tc['root_fill']
                    in_scale = True
                for scale_note in notes_in_scale[1:]:
                    if is_octave_of_note(note, scale_note):
                        marker["color"] = tc['scale_fill']
                        in_scale = True

                in_chord = False
                if in_scale and chord:
                    for j, chord_note in enumerate(notes_in_chord):
                        if is_octave_of_note(chord_note, note):
                            marker["color"] = colors[j]
                            chord_label = chord_labels[j]
                            in_chord = True
                            break

                if in_scale and not in_chord:
                    fig.add_trace(go.Scatter(x=[fret_positions[i]], y=[y_pos], mode="markers",
                                             hoverinfo="skip", marker=marker))
                if in_scale and in_chord:
                    fig.add_trace(go.Scatter(x=[fret_positions[i]], y=[y_pos], mode="markers+text",
                                             hoverinfo="skip", marker=marker, text=[chord_label]))

        # Height: 30 px per string gap + 30 px for the fret-marker row below the nut.
        # This guarantees the 20-px dot markers never overlap regardless of window width.
        # Width is left responsive (fills the container).
        px_per_string = 30
        fig_height = num_strings * px_per_string + 20  # +20 for top/bottom margins

        # Extend left range by 0.5 so open-string markers (centered at x=0) are not
        # clipped, and so the paper-relative labels have a visible gap to the nut.
        fig.update_xaxes(visible=False, fixedrange=True, range=[-0.5, x + 0.3])
        fig.update_yaxes(visible=False, fixedrange=True)
        fig.update_layout(
            showlegend=False,
            plot_bgcolor=tc['bg'],
            paper_bgcolor=tc['bg'],
            margin=dict(t=10, l=48, b=10, r=10),
            height=fig_height,
            autosize=True,
        )

        return fig

    # ── Electron Open route ──────────────────────────────────────────────────
    # Electron reads the file natively and POSTs the content here, then clicks
    # #trigger-open.  This sidesteps Chromium's restriction on programmatic
    # file-input clicks entirely.

    @app.server.route('/api/open', methods=['POST'])
    def api_open():
        try:
            _pending_load[0] = flask_request.get_json(force=True)
            return 'ok', 200
        except Exception as e:
            return str(e), 400

    @app.callback(
        Output('load-store', 'data', allow_duplicate=True),
        Input('trigger-open', 'n_clicks'),
        prevent_initial_call=True,
    )
    def open_from_api(_):
        data = _pending_load[0]
        _pending_load[0] = None
        return data if data is not None else dash.no_update

    in_electron = os.environ.get('GUITAR_MAP_ELECTRON') == '1'
    app.run(debug=True, dev_tools_ui=not in_electron)
