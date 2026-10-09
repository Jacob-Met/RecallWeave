#!/bin/zsh
set -eu
LP_APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
exec /Library/Frameworks/Python.framework/Versions/3.13/Resources/Python.app/Contents/MacOS/Python -B "$LP_APP_DIR/open.py" "$@"
