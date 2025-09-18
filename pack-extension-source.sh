#!/bin/bash

# Script to copy packages/extension folder to a temporary folder,
# excluding node_modules, build, and .plasmo folders,
# then compress it to utags.tar.gz

# Exit on error
set -e

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/packages/extension"
TEMP_DIR="/tmp/utags-extension"
OUTPUT_FILE="${SCRIPT_DIR}/utags-extension.tar.gz"

echo "Starting packaging process..."

# Create temp directory if it doesn't exist
if [ -d "$TEMP_DIR" ]; then
  echo "Cleaning existing temporary directory..."
  rm -rf "$TEMP_DIR"
fi

echo "Creating temporary directory at $TEMP_DIR..."
mkdir -p "$TEMP_DIR"

# Copy files excluding specified directories
echo "Copying files from $SOURCE_DIR to $TEMP_DIR (excluding node_modules, build, .plasmo)..."
rsync -av --progress "$SOURCE_DIR/" "$TEMP_DIR/" \
  --exclude="node_modules" \
  --exclude="build" \
  --exclude=".plasmo" \
  --exclude=".DS_Store"

# Create tar.gz archive
echo "Creating archive $OUTPUT_FILE..."
tar -czf "$OUTPUT_FILE" -C "$(dirname "$TEMP_DIR")" "$(basename "$TEMP_DIR")"

# Clean up
echo "Cleaning up temporary directory..."
rm -rf "$TEMP_DIR"

echo "Package created successfully at $OUTPUT_FILE"
echo "Done!"
