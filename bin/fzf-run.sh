#!/usr/bin/env bash

# Get list of executables in PATH
compgen -c | sort -u | fzf-launcher.sh
