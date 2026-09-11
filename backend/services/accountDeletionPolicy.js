const AppSettings = require('../models/AppSettings');
const Organization = require('../models/Organization');

/**
 * Who is allowed to delete their own account.
 *
 * Three levels, and they CASCADE downwards rather than override each other:
 *
 *   SuperAdmin  AppSettings.isAccountDeletionEnabled   platform master switch
 *   Org admin   Organization.features.accountDeletion  per organization
 *   Member      the Delete my account button           only if both allow it
 *
 * This is deliberately different from the other flags in appSettingsController,
 * where an organization's value simply overrides the global one. Here the
 * platform switch wins: if it is off, no organization can turn deletion back
 * on. That is the point of a master switch.
 *
 * A member of several organizations can delete only if EVERY one of them
 * allows it. Otherwise an admin who switched deletion off for their own
 * organization could be overruled by any other organization the member
 * happens to have joined.
 *
 * Everything is resolved here, in one place, so the UI that hides the button
 * and the endpoint that enforces it can never disagree. Hiding a button is
 * not enforcement — the endpoint checks this too.
 */

async function isGloballyEnabled() {
  const settings = await AppSettings.findOne();
  // No settings document yet means nothing has been configured, and the model
  // default is on.
  return settings ? settings.isAccountDeletionEnabled !== false : true;
}

/**
 * Reasons this user may not delete their account right now, as sentences fit
 * to show them. Empty means allowed.
 */
async function findPolicyBlockers(user) {
  if (!(await isGloballyEnabled())) {
    return ['Account deletion is currently turned off by the app administrator.'];
  }

  const orgIds = (user.memberships || [])
    .filter(m => m.isActive !== false)
    .map(m => m.organization);

  if (orgIds.length === 0) return [];

  const orgs = await Organization.find({ _id: { $in: orgIds } }).select('name features');
  const blocking = orgs.filter(org => org.features?.accountDeletion === false);

  return blocking.map(
    org => `Account deletion is turned off by the admins of "${org.name}".`
  );
}

/** Convenience for the endpoints: true when nothing blocks deletion. */
async function isDeletionAllowed(user) {
  const blockers = await findPolicyBlockers(user);
  return blockers.length === 0;
}

module.exports = {
  isGloballyEnabled,
  findPolicyBlockers,
  isDeletionAllowed,
};
