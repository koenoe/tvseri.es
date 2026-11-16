#!/bin/sh
# `E2E_SLOW=1` (playwright.config.ts): runs a command at macOS's background
# QoS, which keeps it on the efficiency cores at a low priority, so the
# browser (and `next start`) run about as slow as a GitHub macOS runner's
# three vCPUs. E2E_SLOW_REAL is the program to run; exec keeps Playwright's
# pipes (fd 3 and 4) intact.
exec taskpolicy -c "${E2E_SLOW_CLAMP:-background}" "$E2E_SLOW_REAL" "$@"
