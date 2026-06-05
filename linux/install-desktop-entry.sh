#!/usr/bin/env bash
# Installs the Guitar Map desktop entry and icon for the current user.
# The absolute path to the AppImage is baked into the desktop entry, so if you
# move the AppImage after installation you must re-run this script.
#
# Usage:
#   ./install-desktop-entry.sh [/path/to/guitar-map-x.y.z.AppImage]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve the AppImage to an absolute path regardless of whether the caller
# supplied a relative path, an absolute path, or nothing at all.
if [[ -n "$1" ]]; then
    APPIMAGE="$(realpath "$1")"
else
    # Try to find an AppImage next to the repo root
    APPIMAGE="$(find "$SCRIPT_DIR/.." -maxdepth 1 -name '*.AppImage' | head -1)"
    if [[ -z "$APPIMAGE" ]]; then
        echo "Error: no AppImage found. Pass the path as an argument:" >&2
        echo "  $0 /path/to/guitar-map-x.y.z.AppImage" >&2
        exit 1
    fi
    APPIMAGE="$(realpath "$APPIMAGE")"
fi

ICON_SRC="$SCRIPT_DIR/../dist/guitar_icon.png"
ICON_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

mkdir -p "$ICON_DIR" "$DESKTOP_DIR"

# Install icon
cp "$ICON_SRC" "$ICON_DIR/guitar-map.png"

# Install desktop entry with the real AppImage path substituted
sed "s|APPIMAGE_PATH|$APPIMAGE|g" "$SCRIPT_DIR/guitar-map.desktop" \
    > "$DESKTOP_DIR/guitar-map.desktop"

# Refresh the desktop database
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true

echo "Installed:"
echo "  Icon:    $ICON_DIR/guitar-map.png"
echo "  Launcher: $DESKTOP_DIR/guitar-map.desktop"
echo "  AppImage: $APPIMAGE"
