const { withAndroidStyles } = require("expo/config-plugins");

/**
 * Stops Android drawing its own scrim behind the navigation bar.
 *
 * The generated theme sets `android:enforceNavigationBarContrast` to true.
 * Under edge-to-edge that makes the system paint a translucent band behind the
 * navigation bar so its buttons stay legible over arbitrary content. The app
 * already chooses button colours per screen (see useSystemBars), so the extra
 * scrim only does harm: when a modal dims the screen, the dim lands on top of
 * that band and the navigation bar ends up a different shade from everything
 * else, reading as a separate strip rather than part of the dimmed screen.
 *
 * Written as a config plugin because android/ is gitignored and regenerated —
 * editing styles.xml by hand would be undone by the next prebuild.
 *
 * The existing AppTheme is edited in place rather than through
 * AndroidConfig.Styles.assignStylesValue, whose parent-group helpers match on
 * the parent attribute: AppTheme here extends DayNight, so the helper matched
 * nothing and appended a SECOND <style name="AppTheme"> with a Light parent.
 */
const ITEM = "android:enforceNavigationBarContrast";

module.exports = function withNavigationBarContrast(config) {
  return withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults.resources.style;
    if (!styles) return cfg;

    const appTheme = styles.find((s) => s.$?.name === "AppTheme");
    if (!appTheme) {
      throw new Error(
        "withNavigationBarContrast: no AppTheme in styles.xml. The Expo " +
        "template changed — update this plugin."
      );
    }

    appTheme.item = appTheme.item || [];
    const existing = appTheme.item.find((i) => i.$?.name === ITEM);
    if (existing) {
      existing._ = "false";
    } else {
      appTheme.item.push({ $: { name: ITEM, "tools:targetApi": "29" }, _: "false" });
    }

    return cfg;
  });
};
