#!/bin/bash

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Extension root (packages/extension)
EXTENSION_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
# Target directory: ../../../userscripts/utags/ relative to EXTENSION_DIR
# This resolves to workspace_pipes/userscripts/utags/
TARGET_DIR="$EXTENSION_DIR/../../../userscripts/utags"

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "Target directory '$TARGET_DIR' does not exist. Skipping sync."
    exit 0
fi

# Resolve absolute path for TARGET_DIR
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

echo "Syncing to $TARGET_DIR..."

# Function to sync file
sync_file() {
    local src="$1"
    local dest="$2"
    if [ -f "$src" ]; then
        rsync -a "$src" "$dest"
        echo "Synced $(basename "$dest")"
    else
        echo "Warning: Source $src not found"
    fi
}

# 1. staging user.js
sync_file "$EXTENSION_DIR/build/userscript-staging/utags.user.js" "$TARGET_DIR/utags-staging.user.js"

# 2. prod user.js
sync_file "$EXTENSION_DIR/build/userscript-prod/utags.user.js" "$TARGET_DIR/utags.user.js"

# 3. README.md
# README.md -> README.md
sync_file "$EXTENSION_DIR/README.md" "$TARGET_DIR/README.md"

# 4. README.zh-CN.md
# README.zh-CN.md -> README.zh-CN.md
sync_file "$EXTENSION_DIR/README.zh-CN.md" "$TARGET_DIR/README.zh-CN.md"

echo "Sync completed."
