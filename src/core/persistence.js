/**
 * Core Persistence Module
 * Handles saving/loading extension settings and chat data
 */

import { saveSettingsDebounced, chat_metadata, saveChatDebounced } from '../../../../../../script.js';
import { power_user } from '../../../../../power-user.js';
import { getContext } from '../../../../../extensions.js';
import {
    extensionSettings,
    lastGeneratedData,
    committedTrackerData,
    setExtensionSettings,
    updateExtensionSettings,
    setLastGeneratedData,
    setCommittedTrackerData,
    FEATURE_FLAGS
} from './state.js';
import { migrateInventory } from '../utils/migration.js';

const extensionName = 'third-party/rpg-companion-sillytavern';

/**
 * Validates extension settings structure
 * @param {Object} settings - Settings object to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateSettings(settings) {
    if (!settings || typeof settings !== 'object') {
        return false;
    }

    // Check for required top-level properties
    if (typeof settings.enabled !== 'boolean' ||
        typeof settings.autoUpdate !== 'boolean' ||
        !settings.userStats || typeof settings.userStats !== 'object') {
        console.warn('[RPG Companion] Settings validation failed: missing required properties');
        return false;
    }

    // Validate userStats structure
    const stats = settings.userStats;
    if (typeof stats.health !== 'number' ||
        typeof stats.satiety !== 'number' ||
        typeof stats.energy !== 'number') {
        console.warn('[RPG Companion] Settings validation failed: invalid userStats structure');
        return false;
    }

    return true;
}

/**
 * Loads the extension settings from the global settings object.
 * Automatically migrates v1 inventory to v2 format if needed.
 */
export function loadSettings() {
    try {
        // Validate power_user structure
        if (!power_user || typeof power_user !== 'object') {
            console.warn('[RPG Companion] power_user is not available, using default settings');
            return;
        }

        if (!power_user.extensions) {
            power_user.extensions = {};
            // console.log('[RPG Companion] Created power_user.extensions object');
        }

        if (power_user.extensions[extensionName]) {
            const savedSettings = power_user.extensions[extensionName];

            // Validate loaded settings
            if (!validateSettings(savedSettings)) {
                console.warn('[RPG Companion] Loaded settings failed validation, using defaults');
                console.warn('[RPG Companion] Invalid settings:', savedSettings);
                // Save valid defaults to replace corrupt data
                saveSettings();
                return;
            }

            updateExtensionSettings(savedSettings);
            // console.log('[RPG Companion] Settings loaded:', extensionSettings);
        } else {
            // console.log('[RPG Companion] No saved settings found, using defaults');
        }

        // Migrate inventory if feature flag enabled
        if (FEATURE_FLAGS.useNewInventory) {
            const migrationResult = migrateInventory(extensionSettings.userStats.inventory);
            if (migrationResult.migrated) {
                console.log(`[RPG Companion] Inventory migrated from ${migrationResult.source} to v2 format`);
                extensionSettings.userStats.inventory = migrationResult.inventory;
                saveSettings(); // Persist migrated inventory
            }
        }
    } catch (error) {
        console.error('[RPG Companion] Error loading settings:', error);
        console.error('[RPG Companion] Error details:', error.message, error.stack);
        console.warn('[RPG Companion] Using default settings due to load error');
        // Settings will remain at defaults from state.js
    }
}

/**
 * Saves the extension settings to the global settings object.
 */
export function saveSettings() {
    if (!power_user.extensions) {
        power_user.extensions = {};
    }
    power_user.extensions[extensionName] = extensionSettings;
    saveSettingsDebounced();
}

/**
 * Saves RPG data to the current chat's metadata.
 */
export function saveChatData() {
    if (!chat_metadata) {
        return;
    }

    chat_metadata.rpg_companion = {
        userStats: extensionSettings.userStats,
        classicStats: extensionSettings.classicStats,
        lastGeneratedData: lastGeneratedData,
        committedTrackerData: committedTrackerData,
        timestamp: Date.now()
    };

    saveChatDebounced();
}

/**
 * Updates the last assistant message's swipe data with current tracker data.
 * This ensures user edits are preserved across swipes and included in generation context.
 */
export function updateMessageSwipeData() {
    const chat = getContext().chat;
    if (!chat || chat.length === 0) {
        return;
    }

    // Find the last assistant message
    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i];
        if (!message.is_user) {
            // Found last assistant message - update its swipe data
            if (!message.extra) {
                message.extra = {};
            }
            if (!message.extra.rpg_companion_swipes) {
                message.extra.rpg_companion_swipes = {};
            }

            const swipeId = message.swipe_id || 0;
            message.extra.rpg_companion_swipes[swipeId] = {
                userStats: lastGeneratedData.userStats,
                infoBox: lastGeneratedData.infoBox,
                characterThoughts: lastGeneratedData.characterThoughts
            };

            // console.log('[RPG Companion] Updated message swipe data after user edit');
            break;
        }
    }
}

/**
 * Loads RPG data from the current chat's metadata.
 * Automatically migrates v1 inventory to v2 format if needed.
 */
export function loadChatData() {
    if (!chat_metadata || !chat_metadata.rpg_companion) {
        // Reset to defaults if no data exists
        updateExtensionSettings({
            userStats: {
                health: 100,
                satiety: 100,
                energy: 100,
                hygiene: 100,
                arousal: 0,
                mood: '😐',
                conditions: 'None',
                // Use v2 inventory format for defaults
                inventory: {
                    version: 2,
                    onPerson: "None",
                    stored: {},
                    assets: "None"
                }
            }
        });
        setLastGeneratedData({
            userStats: null,
            infoBox: null,
            characterThoughts: null,
            html: null
        });
        setCommittedTrackerData({
            userStats: null,
            infoBox: null,
            characterThoughts: null
        });
        return;
    }

    const savedData = chat_metadata.rpg_companion;

    // Restore stats
    if (savedData.userStats) {
        extensionSettings.userStats = { ...savedData.userStats };
    }

    // Restore classic stats
    if (savedData.classicStats) {
        extensionSettings.classicStats = { ...savedData.classicStats };
    }

    // Restore last generated data
    if (savedData.lastGeneratedData) {
        setLastGeneratedData({ ...savedData.lastGeneratedData });
    }

    // Restore committed tracker data
    if (savedData.committedTrackerData) {
        setCommittedTrackerData({ ...savedData.committedTrackerData });
    }

    // Migrate inventory in chat data if feature flag enabled
    if (FEATURE_FLAGS.useNewInventory && extensionSettings.userStats.inventory) {
        const migrationResult = migrateInventory(extensionSettings.userStats.inventory);
        if (migrationResult.migrated) {
            console.log(`[RPG Companion] Chat inventory migrated from ${migrationResult.source} to v2 format`);
            extensionSettings.userStats.inventory = migrationResult.inventory;
            saveChatData(); // Persist migrated inventory to chat metadata
        }
    }

    // console.log('[RPG Companion] Loaded chat data:', savedData);
}
