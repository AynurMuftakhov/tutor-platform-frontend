/**
 * TODO: Update tests to use PackageState instead of PackageTracker
 *
 * These tests were written for the old slot-based PackageTracker system,
 * which has been replaced by the adjustment-based PackageState system.
 *
 * Tests need to be rewritten to reflect the new architecture where:
 * - Lessons are automatically tracked (not manually assigned to slots)
 * - Package adjustments (RESET_PACKAGE, ADJUST_LESSONS, SET_PACKAGE_START) are used instead
 * - No assign/unassign/cancel/reopen slot operations exist
 */

import { describe, it } from 'vitest';

describe('StudentLedgerDrawer', () => {
    it.todo('should display package state correctly');
    it.todo('should handle reset package adjustment');
    it.todo('should handle remove lesson adjustment');
    it.todo('should handle set package start adjustment');
    it.todo('should display lesson list with dates and statuses');
    it.todo('should open lesson context menu');
});
