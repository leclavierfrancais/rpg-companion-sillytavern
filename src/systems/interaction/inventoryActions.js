/**
 * Inventory Actions Module
 * Handles all user interactions with the inventory v2 system
 */

import { extensionSettings, lastGeneratedData } from '../../core/state.js';
import { saveSettings, saveChatData, updateMessageSwipeData } from '../../core/persistence.js';
import { buildInventorySummary } from '../generation/promptBuilder.js';
import { renderInventory } from '../rendering/inventory.js';

// Type imports
/** @typedef {import('../../types/inventory.js').InventoryV2} InventoryV2 */

/**
 * Current active sub-tab for inventory UI
 * @type {string}
 */
let currentActiveSubTab = 'onPerson';

/**
 * Array of collapsed storage location names
 * @type {string[]}
 */
let collapsedLocations = [];

/**
 * Updates lastGeneratedData.userStats to include current inventory in text format.
 * This ensures the AI context stays synced with manual edits.
 */
function updateLastGeneratedDataInventory() {
    const stats = extensionSettings.userStats;
    const inventorySummary = buildInventorySummary(stats.inventory);

    // Rebuild the lastGeneratedData.userStats text format
    lastGeneratedData.userStats =
        `Health: ${stats.health}%\n` +
        `Satiety: ${stats.satiety}%\n` +
        `Energy: ${stats.energy}%\n` +
        `Hygiene: ${stats.hygiene}%\n` +
        `Arousal: ${stats.arousal}%\n` +
        `${stats.mood}: ${stats.conditions}\n` +
        `${inventorySummary}`;
}

/**
 * Handles blur event for contenteditable "On Person" field.
 * Saves changes when user finishes editing.
 * @param {HTMLElement} element - The contenteditable element
 */
export function handleOnPersonBlur(element) {
    const inventory = extensionSettings.userStats.inventory;
    const newValue = element.textContent.trim() || 'None';

    // Only save if value actually changed
    if (newValue !== inventory.onPerson) {
        inventory.onPerson = newValue;

        updateLastGeneratedDataInventory();
        saveSettings();
        saveChatData();
        updateMessageSwipeData();
    }
}

/**
 * Handles blur event for contenteditable stored location field.
 * Saves changes when user finishes editing.
 * @param {HTMLElement} element - The contenteditable element
 * @param {string} locationName - Name of the storage location
 */
export function handleStoredLocationBlur(element, locationName) {
    const inventory = extensionSettings.userStats.inventory;
    const newValue = element.textContent.trim() || 'None';

    // Only save if value actually changed
    if (newValue !== inventory.stored[locationName]) {
        inventory.stored[locationName] = newValue;

        updateLastGeneratedDataInventory();
        saveSettings();
        saveChatData();
        updateMessageSwipeData();
    }
}

/**
 * Handles blur event for contenteditable "Assets" field.
 * Saves changes when user finishes editing.
 * @param {HTMLElement} element - The contenteditable element
 */
export function handleAssetsBlur(element) {
    const inventory = extensionSettings.userStats.inventory;
    const newValue = element.textContent.trim() || 'None';

    // Only save if value actually changed
    if (newValue !== inventory.assets) {
        inventory.assets = newValue;

        updateLastGeneratedDataInventory();
        saveSettings();
        saveChatData();
        updateMessageSwipeData();
    }
}

/**
 * Shows the inline form for adding a new storage location.
 */
export function showAddLocationForm() {
    const form = $('#rpg-add-location-form');
    const input = $('#rpg-new-location-name');

    form.show();
    input.val('').focus();
}

/**
 * Hides the inline form for adding a new storage location.
 */
export function hideAddLocationForm() {
    const form = $('#rpg-add-location-form');
    const input = $('#rpg-new-location-name');

    form.hide();
    input.val('');
}

/**
 * Saves a new storage location from the inline form.
 */
export function saveAddLocation() {
    const inventory = extensionSettings.userStats.inventory;
    const input = $('#rpg-new-location-name');
    const locationName = input.val().trim();

    if (!locationName) {
        hideAddLocationForm();
        return;
    }

    // Check for duplicate
    if (inventory.stored[locationName]) {
        alert(`Storage location "${locationName}" already exists.`);
        return;
    }

    // Create new location with default "None"
    inventory.stored[locationName] = 'None';

    updateLastGeneratedDataInventory();
    saveSettings();
    saveChatData();
    updateMessageSwipeData();

    // Hide form and re-render
    hideAddLocationForm();
    renderInventory();
}

/**
 * Shows the inline confirmation UI for removing a storage location.
 * @param {string} locationName - Name of location to remove
 */
export function showRemoveConfirmation(locationName) {
    const confirmId = `rpg-remove-confirm-${locationName.replace(/\s+/g, '-')}`;
    const confirmUI = $(`#${confirmId}`);

    if (confirmUI.length > 0) {
        confirmUI.show();
    }
}

/**
 * Hides the inline confirmation UI for removing a storage location.
 * @param {string} locationName - Name of location
 */
export function hideRemoveConfirmation(locationName) {
    const confirmId = `rpg-remove-confirm-${locationName.replace(/\s+/g, '-')}`;
    const confirmUI = $(`#${confirmId}`);

    if (confirmUI.length > 0) {
        confirmUI.hide();
    }
}

/**
 * Confirms and removes a storage location from the inventory.
 * @param {string} locationName - Name of location to remove
 */
export function confirmRemoveLocation(locationName) {
    const inventory = extensionSettings.userStats.inventory;
    delete inventory.stored[locationName];

    // Remove from collapsed list if present
    const index = collapsedLocations.indexOf(locationName);
    if (index > -1) {
        collapsedLocations.splice(index, 1);
    }

    updateLastGeneratedDataInventory();
    saveSettings();
    saveChatData();
    updateMessageSwipeData();

    // Re-render inventory UI
    renderInventory();
}

/**
 * Toggles the collapsed state of a storage location section.
 * @param {string} locationName - Name of location to toggle
 */
export function toggleLocationCollapse(locationName) {
    const index = collapsedLocations.indexOf(locationName);

    if (index > -1) {
        // Currently collapsed, expand it
        collapsedLocations.splice(index, 1);
    } else {
        // Currently expanded, collapse it
        collapsedLocations.push(locationName);
    }

    // Save collapsed state to settings
    extensionSettings.collapsedInventoryLocations = collapsedLocations;
    saveSettings();

    // Re-render inventory UI
    renderInventory();
}

/**
 * Switches the active inventory sub-tab.
 * @param {string} tabName - Name of the tab ('onPerson', 'stored', 'assets')
 */
export function switchInventoryTab(tabName) {
    currentActiveSubTab = tabName;

    // Re-render inventory UI
    renderInventory();
}

/**
 * Initializes all event listeners for inventory interactions.
 * Uses event delegation to handle dynamically created elements.
 */
export function initInventoryEventListeners() {
    // Load collapsed state from settings
    if (extensionSettings.collapsedInventoryLocations) {
        collapsedLocations = extensionSettings.collapsedInventoryLocations;
    }

    // Contenteditable blur handlers (inline editing)
    $(document).on('blur', '.rpg-inventory-text[contenteditable="true"]', function() {
        const field = $(this).data('field');
        const element = this;

        if (field === 'onPerson') {
            handleOnPersonBlur(element);
        } else if (field === 'stored') {
            const location = $(this).data('location');
            handleStoredLocationBlur(element, location);
        } else if (field === 'assets') {
            handleAssetsBlur(element);
        }
    });

    // Add location button - shows inline form
    $(document).on('click', '.rpg-inventory-add-btn[data-action="add-location"]', function(e) {
        e.preventDefault();
        showAddLocationForm();
    });

    // Add location inline form - save button
    $(document).on('click', '.rpg-inline-btn[data-action="save-add-location"]', function(e) {
        e.preventDefault();
        saveAddLocation();
    });

    // Add location inline form - cancel button
    $(document).on('click', '.rpg-inline-btn[data-action="cancel-add-location"]', function(e) {
        e.preventDefault();
        hideAddLocationForm();
    });

    // Add location inline form - enter key to save
    $(document).on('keypress', '#rpg-new-location-name', function(e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            saveAddLocation();
        }
    });

    // Remove location button - shows inline confirmation
    $(document).on('click', '.rpg-inventory-remove-btn[data-action="remove-location"]', function(e) {
        e.preventDefault();
        const location = $(this).data('location');
        showRemoveConfirmation(location);
    });

    // Remove location inline confirmation - confirm button
    $(document).on('click', '.rpg-inline-btn[data-action="confirm-remove-location"]', function(e) {
        e.preventDefault();
        const location = $(this).data('location');
        confirmRemoveLocation(location);
    });

    // Remove location inline confirmation - cancel button
    $(document).on('click', '.rpg-inline-btn[data-action="cancel-remove-location"]', function(e) {
        e.preventDefault();
        const location = $(this).data('location');
        hideRemoveConfirmation(location);
    });

    // Collapse toggle buttons
    $(document).on('click', '.rpg-storage-toggle', function(e) {
        e.preventDefault();
        const location = $(this).data('location');
        toggleLocationCollapse(location);
    });

    // Sub-tab switching
    $(document).on('click', '.rpg-inventory-subtab', function(e) {
        e.preventDefault();
        const tab = $(this).data('tab');
        switchInventoryTab(tab);
    });

    console.log('[RPG Companion] Inventory event listeners initialized');
}

/**
 * Gets the current inventory rendering options.
 * @returns {Object} Options object with activeSubTab and collapsedLocations
 */
export function getInventoryRenderOptions() {
    return {
        activeSubTab: currentActiveSubTab,
        collapsedLocations
    };
}
