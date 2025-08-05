#!/usr/bin/env sh

# Terminate already running bar instances
pkill waybar

# Wait until the processes have been shut down
while pgrep -x waybar >/dev/null; do sleep 1; done

DIR_PATH=~/.config/waybar/sway
CONFIG_PATH=$DIR_PATH/config.jsonc
STYLE_PATH=$DIR_PATH/style.css

# Launch main
waybar -c $CONFIG_PATH -s $STYLE_PATH >/dev/null 2>&1 &
