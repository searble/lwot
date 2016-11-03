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
lwot install compiler https://github.com/searble/lwot-compiler-lwot
lwot install platform https://github.com/searble/lwot-platform-express
lwot bower bootstrap
lwot build express
lwot run express
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
```

---

### Trouble Shooting

#### If Permission Denied

```bash
sudo chown -R $USER /usr/local/
```

---

### Future Work

- forever: `lwot forever platform`
- mvc: `lwot install mvc [demo-name]`
