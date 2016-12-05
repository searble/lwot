> Leave work on time!
> 
> Now beta version.
>
> This tool is not stable.

## Pre Install

### Dependencies

- node
    - install node from [node.js site](https://nodejs.org)
    - must set node to `PATH` for using on windows
        - add `C:\Program Files\nodejs` to `PATH`
        - add `C:\Users\proin\AppData\Roaming\npm` to `PATH`
- git
    - install git from [git site](https://git-scm.com/download)
    - must set git to `PATH` for using on windows
        - add `C:\Program Files (x86)\Git\bin` to `PATH`
- node_modules
    - bower
     
        ```bash
          npm install -g bower
        ```
        
    - others (optional)
    
        ```bash
          npm install -g nodemon forever electron-prebuilt
        ```

### Trouble Shooting

#### If Permission Denied

```bash
sudo chown -R $USER /usr/local/
```

---

## Getting Started

### Easy Start: LWOT

```bash
npm install -g lwot
lwot create myApp
cd myApp
lwot install express
lwot install cordova
lwot install electron
lwot bower install bootstrap
lwot npm express install async
lwot build express
lwot express run
```

### Build & Watch

```bash
lwot build           # for all installed platforms
lwot build express   # for express only
lwot watch           # for all installed platforms
lwot watch express   # for express only
```

### Platform Functions

```bash
lwot [platform] [function]
lwot express run     # for start express
```

---

## Contribution Guide

### Commit Tag List

```bash
[add]       # Addition of Modules or Code Piece or ETC...
[rm]        # Remove of Modules or Code Piece or ETC...
[mod]       # Modification of Modules or Code Piece or ETC...(In this case, When modification is generated without bug fix)
[fix]       # Bug Fix of modules or Code Piece or ETC...
```