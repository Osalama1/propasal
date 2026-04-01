#!/bin/bash
# Push propasal app to GitHub
# 1. Create a new repo at https://github.com/new named "propasal" (or your choice)
# 2. Replace YOUR_USERNAME with your GitHub username below, then run:
#    chmod +x push-to-github.sh && ./push-to-github.sh

REPO_URL="${1:-https://github.com/YOUR_USERNAME/propasal.git}"

if [[ "$REPO_URL" == *"YOUR_USERNAME"* ]]; then
  echo "Usage: ./push-to-github.sh https://github.com/YOUR_USERNAME/propasal.git"
  echo "Or set your repo URL and run again."
  exit 1
fi

cd "$(dirname "$0")"
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL"
git push -u origin develop
echo "Done. If you use 'main' as default branch on GitHub, you may want: git push -u origin develop:main"
