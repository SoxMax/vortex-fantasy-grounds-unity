//Import some assets from Vortex we'll need.
const path = require('path');
const { fs, log, util } = require('vortex-api');
const winapi = require('winapi-bindings');

const GAME_ID = 'fantasygroundsunity';
//Steam Application ID, you can get this from https://steamdb.info/apps/
const STEAMAPP_ID = '1196310';

const EXTENSION_FILENAME = 'extension.xml'
const EXTENSION_BUNDLE_EXTENSION = '.ext'

const MODULE_FILENAME = 'definition.xml'
const MODULE_BUNDLE_EXTENSION = '.mod'

const MOD_BASE_DIR = findModPath()
const EXTENSIONS_FOLDER = 'extensions'
const MODULES_FOLDER = 'modules'

function findModPath() {
  const instPath = winapi.RegGetValue(
    'HKEY_CURRENT_USER',
    'SOFTWARE\\SmiteWorks\\Fantasy Grounds',
    'DataDir');
  if (!instPath) {
    return path.join(util.getVortexPath('appData'), 'SmiteWorks', 'Fantasy Grounds');
  }
  return instPath.value;
}

function findGame() {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      'SOFTWARE\\SmiteWorks\\Fantasy Grounds',
      'AppDir');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return Promise.resolve(instPath.value);
  } catch (err) {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID])
      .then(game => game.gamePath);
  }
}

function prepareForModding() {
  // Make sure all the folders we might need exist. 
  return Promise.all([
      fs.ensureDirAsync(MOD_BASE_DIR),
      fs.ensureDirAsync(path.join(MOD_BASE_DIR, EXTENSIONS_FOLDER)),
      fs.ensureDirAsync(path.join(MOD_BASE_DIR, MODULES_FOLDER)),
  ]);
}

function installExtensionLooseContent(files, destinationPath) {
  // The .pak file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.basename(file) === EXTENSION_FILENAME);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const modName = path.basename(destinationPath, '.installing');
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => 
    ((file.indexOf(rootPath) !== -1) 
    && (!file.endsWith(path.sep))));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTENSIONS_FOLDER, modName, file.substr(idx)),
    };
  });

  return Promise.resolve({ instructions });
}

function testSupportedExtensionLooseContent(files, gameId) {
  // Make sure we're able to support this mod.
  const supported = (gameId === GAME_ID) &&
    (files.find(file => path.basename(file) === EXTENSION_FILENAME) !== undefined);
  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function installExtensionBundleContent(files, destinationPath) {
  // The .ext files in the archive
  const bundleFiles = files.filter(file => path.extname(file).toLowerCase() === EXTENSION_BUNDLE_EXTENSION);
  
  console.info("bundleFiles: " + bundleFiles)

  const instructions = bundleFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTENSIONS_FOLDER, path.basename(file))
    };
  });

  return Promise.resolve({ instructions });
}

function testSupportedExtensionBundleContent(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === GAME_ID) &&
    (files.find(file => path.extname(file).toLowerCase() === EXTENSION_BUNDLE_EXTENSION) !== undefined);

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function installModuleLooseContent(files, destinationPath) {
  // The .pak file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.basename(file) === MODULE_FILENAME);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const modName = path.basename(destinationPath, '.installing');
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => 
    ((file.indexOf(rootPath) !== -1) 
    && (!file.endsWith(path.sep))));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MODULES_FOLDER, modName, file.substr(idx)),
    };
  });

  return Promise.resolve({ instructions });
}

function testSupportedModuleLooseContent(files, gameId) {
  // Make sure we're able to support this mod.
  const supported = (gameId === GAME_ID) &&
    (files.find(file => path.basename(file) === MODULE_FILENAME) !== undefined);
  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function installModuleBundleContent(files, destinationPath) {
  // The .ext files in the archive
  const bundleFiles = files.filter(file => path.extname(file).toLowerCase() === MODULE_BUNDLE_EXTENSION);
  
  console.info("bundleFiles: " + bundleFiles)

  const instructions = bundleFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MODULES_FOLDER, path.basename(file))
    };
  });

  return Promise.resolve({ instructions });
}

function testSupportedModuleBundleContent(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === GAME_ID) &&
    (files.find(file => path.extname(file).toLowerCase() === MODULE_BUNDLE_EXTENSION) !== undefined);

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function main(context) {
  //This is the main function Vortex will run when detecting the game extension. 

  console.log("Mods Dir: " + path.join(util.getVortexPath('appData'), 'Roaming', 'SmiteWorks', 'Fantasy Grounds'))

  context.registerGame({
    id: GAME_ID,
    name: 'Fantasy Grounds Unity',
    setup: prepareForModding,
    mergeMods: true,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: () => MOD_BASE_DIR,
    logo: 'gameart.jpg',
    executable: () => 'FantasyGrounds.exe',
    requiredFiles: [
      'FantasyGrounds.exe',
      'FantasyGroundsUpdater.exe'
    ],
    setup: undefined,
    environment: {
      SteamAPPId: STEAMAPP_ID
    },
    details: {
      steamAppId: STEAMAPP_ID
    },
  });

  context.registerInstaller('fantasygroundsunity-extension-loose', 25, testSupportedExtensionLooseContent, installExtensionLooseContent);
  context.registerInstaller('fantasygroundsunity-extension-bundle', 26, testSupportedExtensionBundleContent, installExtensionBundleContent);
  context.registerInstaller('fantasygroundsunity-module-loose', 27, testSupportedModuleLooseContent, installModuleLooseContent);
  context.registerInstaller('fantasygroundsunity-module-bundle', 28, testSupportedModuleBundleContent, installModuleBundleContent);

  return true
}

module.exports = {
  default: main,
};