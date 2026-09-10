const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Signs release builds with the upload keystore instead of the debug key.
 *
 * The generated `android/app/build.gradle` ships `signingConfig
 * signingConfigs.debug` inside the release block, and Play rejects anything
 * signed with the Android debug key.
 *
 * This has to be a config plugin rather than an edit to that file, because
 * `android/` is gitignored and regenerated: a hand-edit survives exactly until
 * the next `expo prebuild --clean`, which would silently put debug signing
 * back and produce a release build that gets rejected on upload. This project
 * has already lost the APK size settings and the ABI list to that same trap.
 *
 * Credentials are read from Gradle properties — put them in
 * `~/.gradle/gradle.properties`, never in the repo:
 *
 *   YOUTHROOM_UPLOAD_STORE_FILE=/absolute/path/to/youthroom-upload.keystore
 *   YOUTHROOM_UPLOAD_KEY_ALIAS=youthroom
 *   YOUTHROOM_UPLOAD_STORE_PASSWORD=...
 *   YOUTHROOM_UPLOAD_KEY_PASSWORD=...
 *
 * When they are absent the release build falls back to debug signing, so a
 * contributor without the keystore can still build and run the app. Only
 * builds you intend to upload need the real key — verify before uploading
 * with:
 *
 *   jarsigner -verify -certs <file> | head
 */

const STORE_FILE_PROPERTY = "YOUTHROOM_UPLOAD_STORE_FILE";

const RELEASE_SIGNING_CONFIG = `        release {
            if (project.hasProperty('${STORE_FILE_PROPERTY}')) {
                storeFile file(${STORE_FILE_PROPERTY})
                storePassword YOUTHROOM_UPLOAD_STORE_PASSWORD
                keyAlias YOUTHROOM_UPLOAD_KEY_ALIAS
                keyPassword YOUTHROOM_UPLOAD_KEY_PASSWORD
            }
        }
`;

const RELEASE_SIGNING_REFERENCE =
  `signingConfig project.hasProperty('${STORE_FILE_PROPERTY}') ? signingConfigs.release : signingConfigs.debug`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    // Running twice on the same file would nest the config inside itself.
    if (gradle.includes(STORE_FILE_PROPERTY)) return cfg;

    // 1. Declare the release signing config alongside the existing debug one.
    const signingConfigsAnchor = "    signingConfigs {\n";
    if (!gradle.includes(signingConfigsAnchor)) {
      throw new Error(
        "withReleaseSigning: could not find the signingConfigs block in build.gradle. " +
        "The Expo template changed — update this plugin before releasing."
      );
    }
    gradle = gradle.replace(
      signingConfigsAnchor,
      signingConfigsAnchor + RELEASE_SIGNING_CONFIG
    );

    // 2. Point the release build type at it. Only the occurrence inside
    //    `release {` is replaced; the debug build type keeps the debug key.
    const releaseBlock = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseBlock.test(gradle)) {
      throw new Error(
        "withReleaseSigning: could not find the release build type's signingConfig. " +
        "The Expo template changed — update this plugin before releasing."
      );
    }
    gradle = gradle.replace(releaseBlock, `$1${RELEASE_SIGNING_REFERENCE}`);

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
