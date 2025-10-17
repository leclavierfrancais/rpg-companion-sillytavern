/**
 * Inventory Actions Module
 * Handles all user interactions with the inventory v2 system
 */

import { extensionSettings, lastGeneratedData } from '../../core/state.js';
import { saveSettings, saveChatData, updateMessageSwipeData } from '../../core/persistence.js';
import { buildInventorySummary } from '../generation/promptBuilder.js';
import { renderInventory, updateInventoryDisplay } from '../rendering/inventory.js';

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
 * Edits items currently on the character's person.
 * @returns {Promise<void>}
 */
export async function editOnPerson() {
    const inventory = extensionSettings.userStats.inventory;
    const current = inventory.onPerson || 'None';

    const newValue = prompt('Edit items on person (carried/worn):', current);
    if (newValue === null) return; // User cancelled

    inventory.onPerson = newValue.trim() || 'None';

    updateLastGeneratedDataInventory();
    saveSettings();
    saveChatData();
    updateMessageSwipeData();

    // Re-render inventory UI
    updateInventoryDisplay('rpg-inventory-content', {
        activeSubTab: currentActiveSubTab,
        collapsedLocations
    });
}

/**
 * Edits items stored at a specific location.
 * @param {string} locationName - Name of the storage location
 * @returns {Promise<void>}
 */
export async function editStoredLocation(locationName) {
    const inventory = extensionSettings.userStats.inventory;
    const current = inventory.stored[locationName] || 'None';

    const newValue = prompt(`Edit items stored at "${locationName}":`, current);
    if (newValue === null) return; // User cancelled

    inventory.stored[locationName] = newValue.trim() || 'None';

    updateLastGeneratedDataInventory();
    saveSettings();
    saveChatData();
    updateMessageSwipeData();

    // Re-render inventory UI
    updateInventoryDisplay('rpg-inventory-content', {
        activeSubTab: currentActiveSubTab,
        collapsedLocations
    });
}

/**
 * Edits character's assets (vehicles, property, major possessions).
 * @returns {Promise<void>}
 */
export async function editAssets() {
    const inventory = extensionSettings.userStats.inventory;
    const current = inventory.assets || 'None';

    const newValue = prompt('Edit assets (vehicles, property, equipment):', current);
    if (newValue === null) return; // User cancelled

    inventory.assets = newValue.trim() || 'None';

    updateLastGeneratedDataInventory();
    saveSettings();
    saveChatData();
    updateMessageSwipeData();

    // Re-render inventory UI
    updateInventoryDisplay('rpg-inventory-content', {
        activeSubTab: currentActiveSubTab,
        collapsedLocations
    });
}

/**
 * Adds a new storage location to the inventory.
 * @returns {Promise<void>}
 */
export async function addStorageLocation() {
    const inventory = extensionSettings.userStats.inventory;

    const locationName = prompt('Enter name for new storage location:');
    if (!locationName) return; // User cancelled or entered empty string

    const trimmedName = locationName.trim();

    // Check for duplicate
    if (inventory.stored[trimmedName]) {
        alert(`Storage location "${trimmedName}" already exists.`);
        return;
    }

    // Create new location with default "None"
    inventory.stored[trimmedName] = 'None';

    updateLastGeneratedDataInventory();
    saveSettings();
    saveChatData();
    updateMessageSwipeData();

    // Switch to stored tab and re-render
    currentActiveSubTab = 'stored';
    updateInventoryDisplay('rpg-inventory-content', {
        activeSubTab: currentActiveSubTab,
        collapsedLocations
    });
}

/**
 * Removes a storage location from the inventory.
 * @param {string} locationName - Name of location to remove
 * @returns {Promise<void>}
 */
export async function removeStorageLocation(locationName) {
    const confirmed = confirm(`Remove storage location "${locationName}"?\n\nThis will delete all items stored there.`);
    if (!confirmed) return;

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
    updateInventoryDisplay('rpg-inventory-content', {
        activeSubTab: currentActiveSubTab,
        collapsedLocations
    });
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
    updateInventoryDisplay('rpg-inventory-content', {
        activeSubTab: currentActiveSubTab,
        collapsedLocations
    });
}

/**
 * Switches the active inventory sub-tab.
 * @param {string} tabName - Name of the tab ('onPerson', 'stored', 'assets')
 */
export function switchInventoryTab(tabName) {
    currentActiveSubTab = tabName;

    // Re-render inventory UI
    updateInventoryDisplay('rpg-inventory-content', {
        activeSubTab: currentActiveSubTab,
        collapsedLocations
    });
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

    // Event delegation for all inventory buttons
    $(document).on('click', '.rpg-inventory-edit-btn', function(e) {
        e.preventDefault();
        const action = $(this).data('action');

        if (action === 'edit-onperson') {
            editOnPerson();
        } else if (action === 'edit-location') {
            const location = $(this).data('location');
            editStoredLocation(location);
        } else if (action === 'edit-assets') {
            editAssets();
        }
    });

    // Add location button
    $(document).on('click', '.rpg-inventory-add-btn', function(e) {
        e.preventDefault();
        const action = $(this).data('action');

        if (action === 'add-location') {
            addStorageLocation();
        }
    });

    // Remove location buttons
    $(document).on('click', '.rpg-inventory-remove-btn', function(e) {
        e.preventDefault();
        const action = $(this).data('action');

        if (action === 'remove-location') {
            const location = $(this).data('location');
            removeStorageLocation(location);
        }
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
