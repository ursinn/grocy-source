#!/bin/bash

# Grocy Release Update Script
# This script updates your modifications branch to the latest upstream release
# It fetches the latest tags, rebases your changes, and updates version info

set -e  # Exit on any error

BRANCH_NAME="my-modifications"
UPSTREAM_REMOTE="origin"  # Change this if your upstream remote has a different name

echo "🔄 Grocy Release Update Script"
echo "================================"

# Function to get the latest version tag
get_latest_tag() {
    git tag -l "v*" | sort -V | tail -n 1
}

# Check if we're in the right directory
if [ ! -f "version.json" ]; then
    echo "❌ Error: version.json not found. Are you in the grocy root directory?"
    exit 1
fi

# Check if we're on the right branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "$BRANCH_NAME" ]; then
    echo "❌ Error: Not on '$BRANCH_NAME' branch. Current branch: $current_branch"
    echo "Switch to the modifications branch first: git checkout $BRANCH_NAME"
    exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "❌ Error: You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
fi

echo "📡 Fetching latest changes from upstream..."
git fetch --tags $UPSTREAM_REMOTE

# Get the latest tag
latest_tag=$(get_latest_tag)
if [ -z "$latest_tag" ]; then
    echo "❌ Error: No version tags found"
    exit 1
fi

echo "🏷️  Latest upstream tag: $latest_tag"

# Check if we're already up to date
current_base=$(git merge-base HEAD $latest_tag)
tag_commit=$(git rev-parse $latest_tag)

if [ "$current_base" = "$tag_commit" ]; then
    echo "✅ Already up to date with $latest_tag"
else
    echo "🔄 Rebasing $BRANCH_NAME onto $latest_tag..."
    
    # Perform the rebase
    if git rebase --onto $latest_tag $(git merge-base HEAD $latest_tag) HEAD; then
        echo "✅ Successfully rebased onto $latest_tag"
    else
        echo "❌ Rebase failed. Please resolve conflicts manually and run:"
        echo "   git rebase --continue"
        echo "   Then run this script again to update version info"
        exit 1
    fi
fi

# Get the updated build info for display
build_info=$(jq -r '.BuildInfo' version.json)
short_commit=$(git rev-parse --short HEAD)

echo ""
echo "🎉 Update complete!"
echo "   Your branch is now based on: $latest_tag"
echo "   Current commit: $short_commit"
echo "   Build version: $build_info"
echo ""
echo "📋 Summary:"
echo "   - Rebased '$BRANCH_NAME' onto latest tag '$latest_tag'"
echo ""
echo "🔨 Next steps:"
echo "   - Test your application"
echo "   - Push changes: git push --force-with-lease"