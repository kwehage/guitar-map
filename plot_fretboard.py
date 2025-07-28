#!/usr/bin/env python

import dash_bootstrap_components as dbc
import dash
from dash import Dash, html, dcc, Input, Output, State
import plotly.graph_objects as go
import re
import copy
import json

colors = ['#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A', '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52']


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
    # Define note names and their semitone index in an octave
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F',
                  'F#', 'G', 'G#', 'A', 'A#', 'B']
    name, accidental, octave = extract_note_and_octave(note)
    full_note = name + accidental

    # Adjust for flats (e.g., Db -> C#)
    if accidental == 'b':
        index = note_names.index(name) - 1
        full_note = note_names[index % 12]

    # Find semitone distance from A4
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

    # Convert flat to sharp if necessary
    full_note = name + accidental
    if accidental == 'b':
        index = (note_names.index(name) - 1) % 12
        full_note = note_names[index]
    return full_note


def transpose_note(note: str, semitone_offset: int) -> str:
    # Chromatic scale
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F',
                  'F#', 'G', 'G#', 'A', 'A#', 'B']

    note = validate_note(note)
    name, accidental, octave = extract_note_and_octave(note)

    # Convert flat to sharp if necessary
    full_note = name + accidental
    if accidental == 'b':
        index = (note_names.index(name) - 1) % 12
        full_note = note_names[index]

    # Find absolute semitone number (C0 = 0)
    note_index = note_names.index(full_note)
    semitone_number = (octave * 12) + note_index

    # Apply offset
    new_semitone_number = semitone_number + semitone_offset
    if new_semitone_number < 0:
        raise ValueError("Resulting note is below C0, which is unsupported.")

    # Convert back to note name and octave
    new_octave = new_semitone_number // 12
    new_note_index = new_semitone_number % 12
    new_note_name = note_names[new_note_index]

    return f"{new_note_name}{new_octave}"


def is_octave_of_note(note, comparison):
    note = validate_note(note)
    comparison = validate_note(comparison)
    note = re.match(r"[A-G](#|b)?", note).group()
    comparison = re.match(r"[A-G](#|b)?", comparison).group()
    matches = (note == comparison)
    return matches


if __name__ == "__main__":
    app = Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])

    num_frets = 24
    num_strings = 8
    fretboard_color = "black"
    string_scale_factor = 0.2
    scale_length = 25.5
    string_labels = [
        "G#0", "C#1", "E1", "B1", "E2", "A2", "D3", "G3", "B3", "E4"
    ]
    min_num_strings = 4
    line_style = dict(color=fretboard_color)

    # Number of strings and string base notes
    column1 = []
    column2 = []

    style1 = {"height": 30}
    style2 = {"height": 30, "width": "100px"}
    column1.append(
        html.Div('Number of strings', style=style1),
    )
    column2.append(
        html.Div(
            dcc.Dropdown(
                id='num-strings',
                options=[
                    {'label': i, 'value': i}
                    for i in range(4, 11)],
                value=8,
                style=style2,
            ),
            style=style2
        ),
    )

    for i, note in enumerate(reversed(string_labels), start=1):
        column1.append(
            html.Div(f"String {i}", style=style1, id=f"string-{i}-label")
        )
        column2.append(
            html.Div(
                [
                    dcc.Input(
                        id=f"string-{i}",
                        placeholder=f"String {i}",
                        type='text',
                        value=note,
                        pattern="[A-G](?:b|#)?(?:[0-9]|10)",
                        style=style2,
                    ),
                ],
                style=style2,
            ),
        )

    # root note, scale, mode
    column3 = []
    column4 = []
    column3.append(
        html.Div('Tonic', style={"height": 36}),
    )
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
                value="C",
                style={"height": 36, "width": "120px"},
            ),
            style={"height": 36},
        ),
    )
    column3.append(
            html.Div('Scale', style={"height": 36}),
    )
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
                value="2212221",
                style={"height": 36, "width": "300px"},
            ),
            style={"height": 36, "width": "300px"},
        ),
    )
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

    chord_intervals = {
        'maj': [0, 4, 7],          # Major chord: Root, Major 3rd, Perfect 5th
        'min': [0, 3, 7],          # Minor chord: Root, Minor 3rd, Perfect 5th
        'dim': [0, 3, 6],          # Diminished chord: Root, Minor 3rd, Diminished 5th
        'aug': [0, 4, 8],          # Augmented chord: Root, Major 3rd, Augmented 5th
        '7': [0, 4, 7, 10],        # Dominant 7th: Root, Major 3rd, Perfect 5th, Minor 7th
        'maj7': [0, 4, 7, 11],     # Major 7th: Root, Major 3rd, Perfect 5th, Major 7th
        'min7': [0, 3, 7, 10],     # Minor 7th: Root, Minor 3rd, Perfect 5th, Minor 7th
        'dim7': [0, 3, 6, 9],      # Diminished 7th: Root, Minor 3rd, Diminished 5th, Diminished 7th
        'sus2': [0, 2, 7],         # Suspended 2nd: Root, Major 2nd, Perfect 5th
        'sus4': [0, 5, 7],         # Suspended 4th: Root, Perfect 4th, Perfect 5th
        'add9': [0, 4, 7, 14],     # Added 9th: Root, Major 3rd, Perfect 5th, Major 9th
    }

    chord_interval_labels = {
        'maj': ['R', '3', '5'],          # Major chord: Root, Major 3rd, Perfect 5th
        'min': ['R', 'm3', '5'],          # Minor chord: Root, Minor 3rd, Perfect 5th
        'dim': ['R', 'm3', 'b5'],          # Diminished chord: Root, Minor 3rd, Diminished 5th
        'aug': ['R', '3', 'A5'],          # Augmented chord: Root, Major 3rd, Augmented 5th
        '7': ['R', '3', '5', 'm7'],        # Dominant 7th: Root, Major 3rd, Perfect 5th, Minor 7th
        'maj7': ['R', '3', '5', '7'],     # Major 7th: Root, Major 3rd, Perfect 5th, Major 7th
        'min7': ['R', 'm3', '5', 'm7'],     # Minor 7th: Root, Minor 3rd, Perfect 5th, Minor 7th
        'dim7': ['R', 'm3', 'b5', 'bb7'],      # Diminished 7th: Root, Minor 3rd, Diminished 5th, Diminished 7th
        'sus2': ['R', '2', '5'],         # Suspended 2nd: Root, Major 2nd, Perfect 5th
        'sus4': ['R', '4', '5'],         # Suspended 4th: Root, Perfect 4th, Perfect 5th
        'add9': ['R', '3', '5', '9'],     # Added 9th: Root, Major 3rd, Perfect 5th, Major 9th
    }

    column3.append(
        html.Div('Mode', style={"height": 36}),
    )
    column4.append(
        html.Div(
            dcc.Dropdown(
                id='mode',
                options=[
                    {'label': i[0], 'value': i[1]}
                    for i in modes["2212221"]
                ],
                value=0,
                style={"width": "300px", "height": 36},
            ),
            style={"width": "300px", "height": 36},
        ),
    )
    for column in [column3, column4]:
        column.append(
            html.Div('', style={"height": 30})
        )

    for i, label in enumerate(["I", "II", "III", "IV", "V", "VI", "VII"], start=1):
        column3.append(
            html.Div(label, style={"height": 30}),
        )
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
                                style={"width": 55, "height": 30, "font-size": "small",}
                            ),
                            id=f'{i}-{chord}-div'
                        ),
                        style={"justify": "start", "height": 30, "width": 55},
                        id=f'{i}-{chord}-col'
                    )
                    for j, chord in enumerate(chord_intervals.keys())
                ],
                style={"height": "30", "width": 55 * len(chord_intervals.keys()),
                       "justify": "start"},
                id=f"chord-{i}-row"
            ),
        )

    app.layout = html.Div(
        children=[
            html.Div(
                [
                    dbc.Row(
                        [
                            dbc.Col(column1, width="auto"),
                            dbc.Col(column2),
                            dbc.Col(column3, width="auto"),
                            dbc.Col(column4),
                        ]
                    )
                ],
                style={"margin": "10px"},
            ),
            html.Div([
                dcc.Graph(id='fretboard')
            ]),
        ],
    )

    @app.callback(
        [Output(component_id='mode', component_property='options'),
         Output(component_id="mode", component_property="value")],
        [Input(component_id='scale', component_property='value')])
    def update_modes(value):
        if value is None:
            return dash.no_update, dash.no_update
        options = [{'label': i[0].split("(")[0], 'value': i[1], "title": i[0]} for i in modes[value]]
        value = options[0]["value"]
        return options, value

    @app.callback(
        [Output(component_id={
            "name": f'{i + 1}-{chord}-button',
            "index": j * i + j,
            "type": "button"}, component_property='children')
         for i in range(7) for j, chord in enumerate(chord_intervals.keys())] +
        [Output(component_id=f'{i}-{chord}-div', component_property='style')
         for i in range(1, 8) for chord in chord_intervals.keys()] +
        [Output(component_id=f"{i}-{chord}-col", component_property="style")
         for i in range(1, 8) for chord in chord_intervals.keys()] +
        [Output(component_id=f"chord-{i}-row", component_property="style")
         for i in range(1, 8)],
        [Input(component_id='tonic', component_property='value'),
         Input(component_id='scale', component_property='value'),
         Input(component_id='mode', component_property='value')])
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
            for i in range(0, 7) for chord in chord_intervals.keys()
        ]

        num_chords_in_scale = []
        chords_in_scale = []
        for i in range(0, 7):
            if i >= num_notes_in_scale:
                num_chords_in_scale.append(0)
                for j in range(len(chord_intervals.keys())):
                    chords_in_scale.append(False)
                continue
            num_chords_in_scale.append(0)
            for chord, intervals in chord_intervals.items():
                notes_in_chord = [
                    transpose_note(notes_in_scale[i], interval) for interval in intervals
                ]
                chord_in_scale = True

                found = []
                for n1 in notes_in_chord:
                    found.append(False)
                    for n2 in notes_in_scale:
                        if is_octave_of_note(n1, n2):
                            found[-1] = True
                            break
                chord_in_scale = all(found)
                chords_in_scale.append(chord_in_scale)
                if chord_in_scale:
                    num_chords_in_scale[-1] += 1
                    print(i + 1, chord, intervals, notes_in_chord)

        div_styles = [
            copy.copy(style) for _ in range(len(chord_intervals.keys()) * 7)
        ]
        column_styles = [
            copy.copy(style) for _ in range(len(chord_intervals.keys()) * 7)
        ]
        for i, in_scale in enumerate(chords_in_scale):
            if not in_scale:
                div_styles[i]["display"] = "none"
                div_styles[i]["width"] = 0
                column_styles[i]["display"] = "none"
                column_styles[i]["width"] = 0

        print(chords_in_scale)
        print(num_chords_in_scale)
        row_style = {"height": 30, "width": 55 * len(chord_intervals.keys()), "justify": "start"}
        row_styles = [
            copy.copy(row_style) for _ in range(7)
        ]
        for i, num in enumerate(num_chords_in_scale):
            row_styles[i]["width"] = 55 * num

        return button_labels + div_styles + column_styles + row_styles

    @app.callback(
        [Output(
            component_id=f'string-{i}',
            component_property='style') for i in range(1, 11)] +
        [Output(
            component_id=f'string-{i}-label',
            component_property='style') for i in range(1, 11)],
        [Input(component_id='num-strings', component_property='value')])
    def show_hide_element(value):
        styles = []
        for i in range(10):
            if i < value:
                styles.append({'display': 'block', "height": 30, "width": "100px"})
            else:
                styles.append({'display': 'none'})
        for i in range(10):
            if i < value:
                styles.append({'display': 'block', "height": 30})
            else:
                styles.append({'display': 'none'})
        return styles

    @app.callback(
        Output('fretboard', "figure", allow_duplicate=True),
        [Input({'type': 'button', 'index': dash.dependencies.ALL, "name": dash.dependencies.ALL}, 'n_clicks')],
        [State(component_id='num-strings', component_property='value')] +
        [State(component_id=f'string-{i}', component_property='value')
         for i in range(1, 11)] +
        [State(component_id="tonic", component_property="value"),
         State(component_id="scale", component_property="value"),
         State(component_id="mode", component_property="value")],
        allow_duplicate=True,
        prevent_initial_call=True,
    )
    def update_chord_on_figure(value, num_strings, string_1, string_2, string_3, string_4,
                      string_5, string_6, string_7, string_8, string_9,
                      string_10, tonic, scale, mode):
        ctx = dash.callback_context
        if not ctx.triggered:
            return dash.no_update

        # Determine which button was clicked
        button_id = json.loads(ctx.triggered[0]['prop_id'].split('.')[0])

        return update_figure_impl(num_strings, string_1, string_2, string_3, string_4,
                      string_5, string_6, string_7, string_8, string_9,
                      string_10, tonic, scale, mode, chord=button_id["name"])

    @app.callback(
        Output('fretboard', "figure"),
        [Input(component_id='num-strings', component_property='value')] +
        [Input(component_id=f'string-{i}', component_property='value')
         for i in range(1, 11)] +
        [Input(component_id="tonic", component_property="value"),
         Input(component_id="scale", component_property="value"),
         Input(component_id="mode", component_property="value")],
        allow_duplicate=True,
    )
    def update_figure(num_strings, string_1, string_2, string_3, string_4,
                      string_5, string_6, string_7, string_8, string_9,
                      string_10, tonic, scale, mode):
        return update_figure_impl(num_strings, string_1, string_2, string_3, string_4,
                      string_5, string_6, string_7, string_8, string_9,
                      string_10, tonic, scale, mode)


    def update_figure_impl(num_strings, string_1, string_2, string_3, string_4,
                      string_5, string_6, string_7, string_8, string_9,
                      string_10, tonic, scale, mode, chord=None):


        pattern = r"^[A-G](?:b|#)?(?:[0-9]|10)$"
        string_labels = [
            string_1, string_2, string_3, string_4, string_5,
            string_6, string_7, string_8, string_9, string_10
        ]

        for label in string_labels:
            if label is None or not re.match(pattern, label):
                return dash.no_update  # Prevent figure update

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

        print(notes_in_scale)

        string_labels = [validate_note(note) for note in string_labels]

        fig = go.Figure()

        # draw vertical lines
        # draw nut
        fig.add_trace(
            go.Scatter(
                x=[0, 0], y=[0, (num_strings - 1) * string_scale_factor],
                mode="lines", line=line_style,
                hoverinfo="skip",
            ),
        )

        x_prev = 0
        prev = scale_length
        root12_2 = 2. ** (1. / 12.)
        fret_positions = []
        for i in range(num_frets):
            tmp = prev / root12_2
            x = scale_length - tmp
            prev = tmp
            fig.add_trace(
                go.Scatter(
                    x=[x, x], y=[0, (num_strings - 1) * string_scale_factor],
                    mode="lines", line=line_style,
                    hoverinfo="skip",
                )
            )
            fret_positions.append(x_prev + ((x - x_prev) / 2.0))
            x_prev = x

        # draw horizontal lines
        string_positions = []
        for i in range(num_strings):
            y = i * string_scale_factor
            string_positions.append(y)
            fig.add_trace(
                go.Scatter(
                    x=[0, x], y=[y, y], mode="lines", line=line_style,
                    hoverinfo="skip",
                ),
            )
        draw_markers_for = [1, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
        offset = 0.05
        for i in draw_markers_for:
            x = fret_positions[i - 1]
            if i % 12:
                fig.add_trace(
                    go.Scatter(
                        x=[x], y=[-string_scale_factor], mode="markers", line=dict(
                            color=fretboard_color,
                            width=2,
                        ),
                        hovertemplate=(
                            f"{i}<extra></extra>"
                        ),
                    )
                )
            else:
                fig.add_trace(
                    go.Scatter(
                        x=[x - offset, x + offset], y=[-string_scale_factor, -string_scale_factor], mode="markers", line=dict(
                            color=fretboard_color,
                            width=2,
                        ),
                        hovertemplate=(
                            f"{i}<extra></extra>"
                        ),
                    )
                )

        string_positions.reverse()
        for note, y_pos in zip(string_labels, string_positions):
            fig.add_annotation(
                x=-0.75, y=y_pos, text=f"{note} ({note_to_frequency(note)}Hz)",
                showarrow=False, align="right", width=100)

        notes_in_chord = []
        chord_labels = None
        if chord:
            chord_root = notes_in_scale[int(chord.split("-")[0]) - 1]
            chord_interval = chord_intervals[chord.split("-")[1]]
            for c in chord_interval:
                notes_in_chord.append(transpose_note(chord_root, c))
            chord_labels = chord_interval_labels[chord.split("-")[1]]

        for y_pos, base_note in zip(string_positions, string_labels):
            fig.add_trace(
                go.Scatter(
                    x=[0.0], y=[y_pos], mode="markers",
                    hovertemplate=(
                        f"{base_note} ({note_to_frequency(base_note)}Hz)"
                        + "<extra></extra>"
                    ),
                    marker=dict(
                        size=1, color=fretboard_color,
                    )
                )
            )

            base_color = "rgba(255, 255, 255, 0.3)"
            marker=dict(
                color=base_color,
                size=20,
                line=dict(
                    color='Black',
                    width=2
                )
            )

            in_scale = False
            if is_octave_of_note(root, base_note):
                marker["color"] = "rgba(0, 0, 0, 0.8)"
                in_scale = True
            for scale_note in notes_in_scale[1:]:
                if is_octave_of_note(base_note, scale_note):
                    marker["color"] = "rgba(0, 0, 0, 0.1)"
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
                fig.add_trace(
                    go.Scatter(
                        x=[0.0], y=[y_pos], mode="markers",
                        hoverinfo="skip",
                        marker=marker
                    )
                )
            if in_scale and in_chord:
                fig.add_trace(
                    go.Scatter(
                        x=[0.0], y=[y_pos], mode="markers+text",
                        hoverinfo="skip",
                        marker=marker,
                        text=[chord_label]
                    )
                )

            for i in range(num_frets):
                note = transpose_note(base_note, i + 1)
                fig.add_trace(
                    go.Scatter(
                        x=[fret_positions[i]], y=[y_pos], mode="markers",
                        hovertemplate=f"{note} ({note_to_frequency(note)}Hz)<extra></extra>",
                        marker=dict(
                            size=1, color=fretboard_color,
                        )
                    )
                )
                in_scale = False
                if is_octave_of_note(root, note):
                    marker["color"] = "rgba(0, 0, 0, 0.8)"
                    in_scale = True
                for scale_note in notes_in_scale[1:]:
                    if is_octave_of_note(note, scale_note):
                        marker["color"] = "rgba(0, 0, 0, 0.1)"
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
                    fig.add_trace(
                        go.Scatter(
                            x=[fret_positions[i]], y=[y_pos], mode="markers",
                            hoverinfo="skip",
                            marker=marker
                        )
                    )

                if in_scale and in_chord:
                    fig.add_trace(
                        go.Scatter(
                            x=[fret_positions[i]], y=[y_pos], mode="markers+text",
                            hoverinfo="skip",
                            marker=marker,
                            text=[chord_label]
                        )
                    )

        fig.update_xaxes(visible=False, fixedrange=True)
        fig.update_yaxes(visible=False, fixedrange=True, scaleanchor="x",
                         scaleratio=1)
        fig.update_layout(
            # autosize=False,
            showlegend=False,
            plot_bgcolor="white",
            margin=dict(t=10, l=10, b=10, r=10)
        )

        return fig

    app.run(debug=True)
