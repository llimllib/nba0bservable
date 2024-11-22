#!/usr/bin/env bash

# we don't yet have a file with all player logs from all seasons, because we
# haven't downloaded anything but 2025 yet
curl -L https://github.com/llimllib/nba_data/raw/refs/heads/main/data/playerlog_2025.parquet

# when we do, change that line to:
# curl -L https://github.com/llimllib/nba_data/raw/refs/heads/main/data/playerlogs.parquet
