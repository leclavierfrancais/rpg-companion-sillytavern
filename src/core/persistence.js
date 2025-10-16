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
    setExtensionSettings,
    updateExtensionSettings,
    setLastGeneratedData
} from './state.js';

const extensionName = 'third-party/rpg-companion-sillytavern';

/**
 * Loads the extension settings from the global settings object.
 */
export function loadSettings() {
    if (power_user.extensions && power_user.extensions[extensionName]) {
        updateExtensionSettings(power_user.extensions[extensionName]);
        // console.log('[RPG Companion] Settings loaded:', extensionSettings);
    } else {
        // console.log('[RPG Companion] No saved settings found, using defaults');
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
                inventory: 'None'
            }
        });
        setLastGeneratedData({
            userStats: null,
            infoBox: null,
            characterThoughts: null,
            html: null
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

    // console.log('[RPG Companion] Loaded chat data:', savedData);
}
