#!/bin/bash

# Grocy Version Info Update Script
# This script updates version.json with current git commit information
# Use this after manual rebases or when you want to refresh version info

set -e  # Exit on any error

echo "📝 Updating Grocy version information..."

# Check if we're in the right directory
if [ ! -f "version.json" ]; then
    echo "❌ Error: version.json not found. Are you in the grocy root directory?"
    exit 1
fi

# Read current version from version.json
current_version=$(jq -r '.Version' version.json)
current_date=$(jq -r '.ReleaseDate' version.json)

if [ "$current_version" = "null" ] || [ -z "$current_version" ]; then
    echo "❌ Error: Could not read version from version.json"
    exit 1
fi

# Get git information
full_commit=$(git rev-parse HEAD)
short_commit=$(git rev-parse --short HEAD)

# Create build version string (this will be the displayed version)
build_version="${current_version}+${short_commit}"

echo "🔍 Current information:"
echo "   Base version: $current_version"
echo "   Release date: $current_date"
echo "   Current commit: $short_commit"
echo "   Display version: $build_version"

# Create updated version.json
cat > version.json << EOF
{
	"Version": "$build_version",
	"BaseVersion": "$current_version",
	"ReleaseDate": "$current_date",
	"CommitHash": "$short_commit",
	"FullCommitHash": "$full_commit",
}
EOF

echo "✅ Updated version.json with git commit information"
echo "   Display version: $build_version"

echo "📁 version.json updated (not committed)"