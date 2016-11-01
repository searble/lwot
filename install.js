'use strict';

const fs = require('fs');
const path = require('path');
const fsext = require('fs-extra');

const HOMEDIR = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
const PLUGIN_DIR = path.resolve(HOMEDIR, '.lwot');

fsext.removeSync(PLUGIN_DIR);
fsext.mkdirsSync(PLUGIN_DIR);