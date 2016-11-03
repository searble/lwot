---
# Getting Started
---

```bash
cd ~/Desktop
lwot create myApp
cd myApp
lwot install compiler https://github.com/searble/lwot-compiler-lwot
lwot install platform https://github.com/searble/lwot-platform-express
lwot bower install bootstrap
lwot npm express install async
lwot build express
lwot run express
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

## install
API
  `lwot install [plugin] [uri]`
    `- [plugin] compiler, platform, mvc`
Usage
  `- lwot install compiler https://github.com/searble/lwot-compiler-lwot`
  
## remove
API
  `lwot remove [plugin] [name]`
    `- [plugin] compiler, platform, mvc`
Usage
  `- lwot remove compiler express`
  
## bower
API
  `lwot bower [bower-cmd] [bower_components] ...`
Usage
  `- lwot bower install bootstrap async`

## npm
API
  `lwot npm [platform] [npm-cmd] [node_modules] ...`
Usage
  `- lwot npm express install async`
  
## build & watch
API
  `lwot build` or `lwot watch` for all platform
  `lwot build [platform]` or `lwot watch [platform]` for specific platform
Usage
  `lwot build electron`
  `lwot watch electron`
  
## run
API
  `lwot run [platform]`
Usage
  `lwot run express`
  
## deploy
API
  `lwot deploy [platform]`
Usage
  `lwot deploy express`