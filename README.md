## LWOT

Leave work on time!

Now beta version.

This tool is not stable.

---

### Pre Install

#### For Build

```bash
sudo npm install -g bower
```

#### For Desktop Application (Electron)

```bash
brew install mono wine                   #Mac
sudo npm install -g electron-prebuilt
```

#### For Mobile App (Ionic Framework)

```bash
sudo npm install -g cordova ionic
```

#### For Web Service (Express.js)

```bash
sudo apt-get install mysql-server mysql-client redis-*  #ubuntu
brew install mysql redis                                #Mac
```

---

### Getting Started

#### Easy Start: LWOT

```bash
npm install -g lwot
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

#### Build & Watch

```bash
lwot build           # for all installed platforms
lwot build express   # for express only
lwot watch           # for all installed platforms
lwot watch express   # for express only
```

#### Run

```bash
lwot run express               # for start express
lwot run electron              # for start electron
lwot run ionic [ionic cmds]    # for start ionic
lwot run ionic serve --lab     # for start ionic lab serve
```

---

### Trouble Shooting

#### If Permission Denied

```bash
sudo chown -R $USER /usr/local/
```

---

### Issue

- deploy: `lwot deploy [platform]`
- forever: `lwot forever platform`
- demo: `lwot demo [demo-name]`

--- 

### TODO

- windows test
- make plugin examples
- improve help. 