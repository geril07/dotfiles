# Docker

## Log rotation

`/etc/docker/daemon.json`:

```json
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
docker info --format '{{.LoggingDriver}}'
docker inspect -f '{{.Name}} {{.HostConfig.LogConfig.Type}} {{json .HostConfig.LogConfig.Config}}' $(docker ps -aq)
```

## Disk usage

```bash
docker system df
docker system df -v
docker builder du --verbose
docker image ls -a
docker ps -as
sudo du -xhd1 /var/lib/docker | sort -h
sudo find /var/lib/docker/containers -type f -name '*-json.log' -printf '%s %p\n' | sort -nr | numfmt --field=1 --to=iec
```
