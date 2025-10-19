/**
 * User Stats Rendering Module
 * Handles rendering of the user stats panel with progress bars and classic RPG stats
 */

import { getContext } from '../../../../../../extensions.js';
import { user_avatar } from '../../../../../../../script.js';
import {
    extensionSettings,
    lastGeneratedData,
    $userStatsContainer,
    FALLBACK_AVATAR_DATA_URI
} from '../../core/state.js';
import {
    saveSettings,
    saveChatData,
    updateMessageSwipeData
} from '../../core/persistence.js';
import { getSafeThumbnailUrl } from '../../utils/avatars.js';

/**
 * Renders the user stats panel with health bars, mood, inventory, and classic stats.
 * Includes event listeners for editable fields.
 */
export function renderUserStats() {
    if (!extensionSettings.showUserStats || !$userStatsContainer) {
        return;
    }

    const stats = extensionSettings.userStats;
    const userName = getContext().name1;

    // Initialize lastGeneratedData.userStats if it doesn't exist
    if (!lastGeneratedData.userStats) {
        lastGeneratedData.userStats = `Health: ${stats.health}%\nSatiety: ${stats.satiety}%\nEnergy: ${stats.energy}%\nHygiene: ${stats.hygiene}%\nArousal: ${stats.arousal}%\n${stats.mood}: ${stats.conditions}\nInventory: ${stats.inventory}`;
    }

    // Get user portrait - handle both default-user and custom persona folders
    // Use a base64-encoded SVG placeholder as fallback to avoid 400 errors
    let userPortrait = FALLBACK_AVATAR_DATA_URI;

    if (user_avatar) {
        // Try to get the thumbnail using our safe helper
        const thumbnailUrl = getSafeThumbnailUrl('persona', user_avatar);
        if (thumbnailUrl) {
            userPortrait = thumbnailUrl;
        }
    }

    // Create gradient from low to high color
    const gradient = `linear-gradient(to right, ${extensionSettings.statBarColorLow}, ${extensionSettings.statBarColorHigh})`;

    const html = `
        <div class="rpg-stats-content">
            <div class="rpg-stats-left">
                <div style="display: flex; gap: clamp(4px, 0.8vh, 8px); align-items: center; justify-content: center; flex-shrink: 0;">
                    <img src="${userPortrait}" alt="${userName}" class="rpg-user-portrait" onerror="this.style.opacity='0.5';this.onerror=null;" />
                </div>
                <div class="rpg-stats-grid">
                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Health:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.health}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="health" title="Click to edit">${stats.health}%</span>
                    </div>

                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Satiety:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.satiety}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="satiety" title="Click to edit">${stats.satiety}%</span>
                    </div>

                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Energy:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.energy}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="energy" title="Click to edit">${stats.energy}%</span>
                    </div>

                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Hygiene:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.hygiene}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="hygiene" title="Click to edit">${stats.hygiene}%</span>
                    </div>

                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Arousal:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.arousal}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="arousal" title="Click to edit">${stats.arousal}%</span>
                    </div>
                </div>

                <div class="rpg-mood">
                    <div class="rpg-mood-emoji rpg-editable" contenteditable="true" data-field="mood" title="Click to edit emoji">${stats.mood}</div>
                    <div class="rpg-mood-conditions rpg-editable" contenteditable="true" data-field="conditions" title="Click to edit conditions">${stats.conditions}</div>
                </div>
            </div>

            <div class="rpg-stats-right">
                <div class="rpg-classic-stats">
                    <div class="rpg-classic-stats-grid">
                        <div class="rpg-classic-stat" data-stat="str">
                            <span class="rpg-classic-stat-label">STR</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="str">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.str}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="str">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="dex">
                            <span class="rpg-classic-stat-label">DEX</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="dex">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.dex}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="dex">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="con">
                            <span class="rpg-classic-stat-label">CON</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="con">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.con}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="con">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="int">
                            <span class="rpg-classic-stat-label">INT</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="int">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.int}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="int">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="wis">
                            <span class="rpg-classic-stat-label">WIS</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="wis">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.wis}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="wis">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="cha">
                            <span class="rpg-classic-stat-label">CHA</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="cha">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.cha}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="cha">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    $userStatsContainer.html(html);

    // Add event listeners for editable stat values
    $('.rpg-editable-stat').on('blur', function() {
        const field = $(this).data('field');
        const textValue = $(this).text().replace('%', '').trim();
        let value = parseInt(textValue);

        // Validate and clamp value between 0 and 100
        if (isNaN(value)) {
            value = 0;
        }
        value = Math.max(0, Math.min(100, value));

        // Update the setting
        extensionSettings.userStats[field] = value;

        // Also update lastGeneratedData to keep it in sync
        if (!lastGeneratedData.userStats) {
            lastGeneratedData.userStats = '';
        }
        // Regenerate the userStats text with updated value
        const statsText = `Health: ${extensionSettings.userStats.health}%\nSatiety: ${extensionSettings.userStats.satiety}%\nEnergy: ${extensionSettings.userStats.energy}%\nHygiene: ${extensionSettings.userStats.hygiene}%\nArousal: ${extensionSettings.userStats.arousal}%\n${extensionSettings.userStats.mood}: ${extensionSettings.userStats.conditions}\nInventory: ${extensionSettings.userStats.inventory}`;
        lastGeneratedData.userStats = statsText;

        saveSettings();
        saveChatData();
        updateMessageSwipeData();

        // Re-render to update the bar
        renderUserStats();
    });

    // Add event listeners for mood/conditions editing
    $('.rpg-mood-emoji.rpg-editable').on('blur', function() {
        const value = $(this).text().trim();
        extensionSettings.userStats.mood = value || '😐';

        // Update lastGeneratedData
        const statsText = `Health: ${extensionSettings.userStats.health}%\nSatiety: ${extensionSettings.userStats.satiety}%\nEnergy: ${extensionSettings.userStats.energy}%\nHygiene: ${extensionSettings.userStats.hygiene}%\nArousal: ${extensionSettings.userStats.arousal}%\n${extensionSettings.userStats.mood}: ${extensionSettings.userStats.conditions}\nInventory: ${extensionSettings.userStats.inventory}`;
        lastGeneratedData.userStats = statsText;

        saveSettings();
        saveChatData();
        updateMessageSwipeData();
    });

    $('.rpg-mood-conditions.rpg-editable').on('blur', function() {
        const value = $(this).text().trim();
        extensionSettings.userStats.conditions = value || 'None';

        // Update lastGeneratedData
        const statsText = `Health: ${extensionSettings.userStats.health}%\nSatiety: ${extensionSettings.userStats.satiety}%\nEnergy: ${extensionSettings.userStats.energy}%\nHygiene: ${extensionSettings.userStats.hygiene}%\nArousal: ${extensionSettings.userStats.arousal}%\n${extensionSettings.userStats.mood}: ${extensionSettings.userStats.conditions}\nInventory: ${extensionSettings.userStats.inventory}`;
        lastGeneratedData.userStats = statsText;

        saveSettings();
        saveChatData();
        updateMessageSwipeData();
    });
}
