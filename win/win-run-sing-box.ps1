& "$PSScriptRoot\win-remove-sing-tun.ps1"

Set-Location "$HOME/my/dotfiles/.config/sing-box"

sing-box run -c .\ignored\1.json > .\ignored\1.log 2>&1