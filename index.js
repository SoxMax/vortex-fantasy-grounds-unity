//Import some assets from Vortex we'll need.
const path = require('path');
const { fs, log, util } = require('vortex-api');
const winapi = require('winapi-bindings');

// Nexus Mods domain for the game. e.g. nexusmods.com/bloodstainedritualofthenight
const GAME_ID = 'fantasygroundsunity';
//Steam Application ID, you can get this from https://steamdb.info/apps/
const STEAMAPP_ID = '1196310';

const MOD_FILENAME = 'extension.xml'
const MOD_BUNDLE_EXTENSION = '.ext'

function findModPath() {
  const instPath = winapi.RegGetValue(
    'HKEY_CURRENT_USER',
    'SOFTWARE\\SmiteWorks\\Fantasy Grounds',
    'DataDir');
  if (!instPath) {
    throw new Error('empty registry key');
  }
  return instPath.value + '/extensions';
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

function installLooseContent(files, destinationPath) {
  // The .pak file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.basename(file) === MOD_FILENAME);
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
      destination: path.join(modName, file.substr(idx)),
    };
  });

  return Promise.resolve({ instructions });
}

function testSupportedLooseContent(files, gameId) {
  // Make sure we're able to support this mod.
  const supported = (gameId === GAME_ID) &&
    (files.find(file => path.basename(file) === MOD_FILENAME) !== undefined);
  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function installBundleContent(files, destinationPath) {
  // The .ext files in the archive
  const bundleFiles = files.filter(file => path.extname(file).toLowerCase() === MOD_BUNDLE_EXTENSION);
  
  console.info("bundleFiles: " + bundleFiles)

  const instructions = bundleFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.basename(file),
    };
  });

  return Promise.resolve({ instructions });
}

function testSupportedBundleContent(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === GAME_ID) &&
    (files.find(file => path.extname(file).toLowerCase() === MOD_BUNDLE_EXTENSION) !== undefined);

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function main(context) {
  //This is the main function Vortex will run when detecting the game extension. 

  context.registerGame({
    id: GAME_ID,
    name: 'Fantasy Grounds Unity',
    mergeMods: true,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: findModPath,
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

  context.registerInstaller('fantasygroundsunity-loosemod', 25, testSupportedLooseContent, installLooseContent);
  context.registerInstaller('fantasygroundsunity-bundlemod', 26, testSupportedBundleContent, installBundleContent);

  return true
}

module.exports = {
  default: main,
};