#!/usr/bin/env bash
# Keep the orchestrator's turn open while a background workflow, agent or
# command is still running. Waiting is not a stop: run this again until the
# result arrives, then resume the run.
# Usage: keep-waiting.sh [SECONDS]   (1 to 110, default 60)
# Stays under the Bash tool's two-minute default timeout, past which the
# command would itself move to the background and no longer hold the turn.
s=${1:-60}
case $s in '' | *[!0-9]*) s=0 ;; esac
if [ "$s" -lt 1 ] || [ "$s" -gt 110 ]; then
  echo "usage: keep-waiting.sh [SECONDS between 1 and 110]" >&2
  exit 2
fi
sleep "$s"
echo "Waited ${s}s. Result not here yet? Run this same command again now. Do not reply to the owner and do not end your turn until it arrives."
