# LWOT

Leave work on time!

Now beta version.

This tool is not stable.

## Pre Install

### For Build

```bash
sudo npm install -g bower
```

## Getting Started

### Easy Start: LWOT

```bash
npm install -g lwot
lwot create myApp
cd myApp
lwot install https://github.com/searble/lwot-platform-express
lwot bower install bootstrap
lwot npm express install async
lwot build express
lwot run express
```

### Build & Watch

```bash
lwot build           # for all installed platforms
lwot build express   # for express only
lwot watch           # for all installed platforms
lwot watch express   # for express only
```

### Run

```bash
lwot run express               # for start express
```

## Trouble Shooting

### If Permission Denied

```bash
sudo chown -R $USER /usr/local/
```
