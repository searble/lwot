---
# Getting Started
---

```
lwot # Install prebuilt
cd ~/Desktop
lwot create myApp
cd myApp
lwot platform add electron
lwot platform npm electron async
lwot bower bootstrap
lwot build electron
lwot run electron
```

---
# CLI Usage
---

## create
API
  `- lwot create [your-project]`
Usage
  `- lwot create myApp`
  `- cd myApp`

## platform
API
  `lwot platform add [platform 1] [platform 2] ...`
  `lwot platform rm [platform 1] [platform 2] ...`
  `lwot platform npm [platform] [node_modules] ...`
  `- [platform] express, electron, ionic`
Usage
  `lwot platform add electron express`
  `lwot platform rm electron express`
  `lwot platform npm electron async`

## install
API
  `lwot install [plugin] [git url]`
    `- [plugin] compiler, platform`
Usage
  `- lwot install platform https://github.com/searble/lwot-example`
  
## build & watch
API
  `lwot build` or `lwot watch` for all platform
  `lwot build [platform]` or `lwot watch [platform]` for specific platform
Usage
  `lwot build electron`
  `lwot watch electron`
  
## run
API
  `lwot run express`
  `lwot run electron`
  `lwot run ionic [ionic-cli-arguments]`
Usage
  `lwot run express`
  `lwot run electron`
  `lwot run ionic serve --lab`