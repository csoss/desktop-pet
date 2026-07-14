#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SOURCE_DIR="$SCRIPT_DIR/pets/timi"
PET_DIR="${CODEX_HOME:-$HOME/.codex}/pets/timi"

if [ ! -f "$SOURCE_DIR/pet.json" ] || [ ! -f "$SOURCE_DIR/spritesheet.webp" ]; then
  echo "Timi package files are missing from $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$PET_DIR"
cp "$SOURCE_DIR/pet.json" "$PET_DIR/pet.json"
cp "$SOURCE_DIR/spritesheet.webp" "$PET_DIR/spritesheet.webp"

echo "Timi installed to $PET_DIR"
echo "Reopen the Codex pet picker, or restart Codex if Timi is not visible yet."
