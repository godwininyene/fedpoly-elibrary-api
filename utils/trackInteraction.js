import Interaction from '../models/Interaction.js';
import Resource from '../models/Resource.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Records a unique user interaction (view or download) on a resource.
 *
 * Flow:
 * 1. Attempt to insert a new Interaction document for this user+resource+action.
 * 2. If it inserts successfully → first time this user performed this action
 *    on this resource → increment the counter on Resource.
 * 3. If it throws a duplicate key error (code 11000) → user already did this
 *    → do nothing. Counter stays the same.
 * 4. Always write an AuditLog regardless (audit logs record every occurrence,
 *    counts only record unique occurrences).
 *
 * This is entirely fire-and-forget — we never await it in the request handler
 * so it never slows down the API response.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.resourceId
 * @param {'view'|'download'} params.action
 * @param {string} [params.ipAddress]
 */
export const trackInteraction = async ({
  userId,
  resourceId,
  action,
  ipAddress = '',
}) => {
  try {
    // Try to create the interaction record.
    // If the user has already performed this action on this resource,
    // the unique index rejects it with a duplicate key error (11000).
    await Interaction.create({ user: userId, resource: resourceId, action });

    // Only reaches here if the insert succeeded — meaning it's the first time.
    // Increment the appropriate counter on the Resource document.
    const field = action === 'view' ? 'viewCount' : 'downloadCount';
    await Resource.findByIdAndUpdate(resourceId, { $inc: { [field]: 1 } });

  } catch (error) {
    if (error.code === 11000) {
      // Duplicate interaction — user already counted. Silently ignore.
      return;
    }
    // Log unexpected errors but never throw — this is fire-and-forget
    console.error(`[trackInteraction] Unexpected error (${action}):`, error.message);
  } finally {
    // Always log every occurrence to AuditLog regardless of uniqueness.
    // AuditLog is a full history; counts are unique tallies.
    AuditLog.create({
      user: userId,
      action,
      resource: resourceId,
      ipAddress,
    }).catch(() => {});
  }
};