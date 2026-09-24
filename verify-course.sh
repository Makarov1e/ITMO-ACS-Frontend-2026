#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
LOG_DIR=${LOG_DIR:-$(mktemp -d)}
INSTALL_DEPS=${INSTALL_DEPS:-1}
BROWSER_INSTALL=${BROWSER_INSTALL:-0}
HW5_PID=''
cleanup() {
  if [[ -n "$HW5_PID" ]]; then kill -- "-$HW5_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT
mkdir -p "$LOG_DIR"

prepare() {
  local dir="$1" label="$2"
  if [[ "$INSTALL_DEPS" == 1 ]]; then
    echo "INSTALL $label"
    (cd "$ROOT/$dir" && npm ci --no-fund) >"$LOG_DIR/$label-install.log" 2>&1 || { cat "$LOG_DIR/$label-install.log"; return 1; }
  fi
  if [[ "$BROWSER_INSTALL" == 1 && "$label" != lab1 ]]; then
    (cd "$ROOT/$dir" && npx playwright install chromium) >"$LOG_DIR/$label-browser.log" 2>&1
  fi
}
run_check() {
  local dir="$1" label="$2" script="$3"
  local name=${script//:/-}
  echo "RUN $label $script"
  (cd "$ROOT/$dir" && npm run "$script") >"$LOG_DIR/$label-$name.log" 2>&1 || { cat "$LOG_DIR/$label-$name.log"; return 1; }
  echo "PASS $label $script"
}
LAB1='labs/К3440/Макаров Егор/lab1'
LAB2='labs/К3440/Макаров Егор/lab2'
LAB3='labs/К3440/Макаров Егор/lab3'
HW5='homeworks/К3440/Макаров Егор/hw5'
prepare "$LAB1" lab1
for script in build test test:smoke; do run_check "$LAB1" lab1 "$script"; done
prepare "$LAB2" lab2
for script in build test test:e2e test:a11y test:theme test:sprite; do run_check "$LAB2" lab2 "$script"; done
prepare "$LAB3" lab3
for script in build test test:e2e; do run_check "$LAB3" lab3 "$script"; done
prepare "$HW5" hw5
for script in build test; do run_check "$HW5" hw5 "$script"; done
(cd "$ROOT/$HW5" && exec setsid npm run dev -- --host 127.0.0.1 --port 4275 --strictPort) >"$LOG_DIR/hw5-server.log" 2>&1 &
HW5_PID=$!
ready=0
for attempt in {1..40}; do
  if curl --silent --fail http://127.0.0.1:4275/ >/dev/null; then ready=1; break; fi
  if ! kill -0 "$HW5_PID" 2>/dev/null; then cat "$LOG_DIR/hw5-server.log"; exit 1; fi
  sleep 0.25
done
if [[ "$ready" != 1 ]]; then echo 'HW5 server did not become ready'; exit 1; fi
export BASE_URL=http://127.0.0.1:4275
run_check "$HW5" hw5 test:responsive
printf '\nAll application checks passed. Logs: %s\n' "$LOG_DIR"
printf 'HW1 interactive game evidence is documented separately in its REPORT.md.\n'
