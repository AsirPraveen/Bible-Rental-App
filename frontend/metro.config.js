const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    assert: require.resolve('assert'),
};

// Native builds (gradlew / expo run:android) write CMake scratch directories
// into node_modules/<pkg>/android/.cxx and android/build. They are created and
// deleted within milliseconds, so Metro's file watcher can try to watch a
// directory that has already vanished and crash with ENOENT. None of it is
// JavaScript Metro needs to see, so keep it out of the watcher entirely.
config.resolver.blockList = [
    /\/android\/\.cxx\/.*/,
    /\/android\/build\/.*/,
    /\/ios\/build\/.*/,
    /\/android\/app\/build\/.*/,
];

module.exports = config;
