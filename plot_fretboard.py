#!/usr/bin/env python

# import matplotlib.pyplot as plt
# import plotly.express as px
import plotly.graph_objects as go


def note_to_frequency(note: str) -> float:
    # Define note names and their semitone index in an octave
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F',
                  'F#', 'G', 'G#', 'A', 'A#', 'B']

    # Extract note and octave
    if len(note) == 2:
        name = note[0]
        octave = int(note[1])
        accidental = ''
    elif len(note) == 3 and note[1] in ['#', 'b']:
        name = note[0]
        accidental = note[1]
        octave = int(note[2])
    else:
        raise ValueError(f"Invalid note format: {note}")

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


def transpose_note(note: str, semitone_offset: int) -> str:
    # Chromatic scale
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F',
                  'F#', 'G', 'G#', 'A', 'A#', 'B']

    # Parse the note
    if len(note) == 2:
        name = note[0]
        accidental = ''
        octave = int(note[1])
    elif len(note) == 3 and note[1] in ['#', 'b']:
        name = note[0]
        accidental = note[1]
        octave = int(note[2])
    else:
        raise ValueError(f"Invalid note format: {note}")

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


if __name__ == "__main__":

    # options, eventually break these out using argparse
    num_frets = 24
    num_strings = 8
    fretboard_color = "black"
    string_scale_factor = 0.2
    scale_length = 25.5
    string_labels = ["E1", "B1", "E2", "A2", "D3", "G3", "B3", "E4"]

    line_style = dict(color=fretboard_color)
    fig = go.Figure()

    # draw vertical lines
    # draw nut
    fig.add_trace(
        go.Scatter(
            x=[0, 0], y=[0, (num_strings - 1) * string_scale_factor],
            mode="lines", line=line_style,
        )
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
            )
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
                    )
                )
            )
        else:
            fig.add_trace(
                go.Scatter(
                    x=[x - offset, x + offset], y=[-string_scale_factor, -string_scale_factor], mode="markers", line=dict(
                        color=fretboard_color,
                        width=2,
                    )
                )
            )

    string_positions.reverse()
    string_labels.reverse()

    for note, y_pos in zip(string_labels, string_positions):
        fig.add_annotation(x=-0.3, y=y_pos, text=f"{note} ({note_to_frequency(note)}Hz)", showarrow=False, yshift=string_scale_factor)

    for y_pos, base_note in zip(string_positions, string_labels):
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

    root_fret = 1
    root_pattern = "C"
    patterns = ["C", "A", "G", "E", "D"]
    offsets = [2, 3, 2, 2, 3, 3]

    # fret positions use 1-based indexing, first index is string, second index is fret
    caged_positions = [
        [(1, 0), (1, 3), (2, 1), (2, 3), (3, 0), (3, 2), (4, 0), (4, 2), (5, 0), (5, 3), (6, 0), (6, 3), (7, 1), (7, 3), (8, 0), (8, 3)],  # C
        [(1, 1), (1, 3), (2, 1), (2, 3), (3, 0), (3, 3), (4, 0), (4, 3), (5, 1), (5, 3), (6, 1), (6, 3), (7, 1), (7, 3), (8, 1), (8, 3)],  # A
        [(1, 0), (1, 3), (2, 0), (2, 3), (3, 0), (3, 2), (4, 0), (4, 2), (5, 0), (5, 2), (6, 0), (6, 3), (7, 0), (7, 3), (8, 0), (8, 3)],  # G
        [(1, 1), (1, 3), (2, 1), (2, 3), (3, 0), (3, 2), (4, 0), (4, 3), (5, 0), (5, 3), (6, 1), (6, 3), (7, 1), (7, 3), (8, 1), (8, 3)],  # E
        [(1, 1), (1, 3), (2, 1), (2, 4), (3, 0), (3, 3), (4, 1), (4, 3), (5, 1), (5, 3), (6, 1), (6, 3), (7, 1), (7, 4), (8, 1), (8, 3)],  # D
    ]

    current_offset = root_fret
    colors = ["red", "orange", "green", "blue", "violet"]
    for i in range(2):
        for pattern, offset, caged_position, color  in zip(patterns, offsets, caged_positions, colors):
            x = []
            y = []
            fret_indices = []
            for position in caged_position:
                fret_index = (current_offset + position[1] - 1) % num_frets
                x.append(fret_positions[fret_index])
                y.append(string_positions[position[0] - 1])
                fret_indices.append(fret_index)

            current_offset += offset
            if (max(fret_indices) - min(fret_indices)) < 10:
                fig.add_trace(
                    go.Scatter(
                        x=x, y=y, mode="markers",
                        hovertemplate="<extra></extra>",
                        marker=dict(
                            size=10, color=color,
                        )
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
    print(fig)
    fig.show()
