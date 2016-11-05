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
