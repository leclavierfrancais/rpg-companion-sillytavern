/**
 * Inventory Rendering Module
 * Handles UI rendering for inventory v2 system
 */

import { extensionSettings, $inventoryContainer } from '../../core/state.js';
import { getInventoryRenderOptions } from '../interaction/inventoryActions.js';

// Type imports
/** @typedef {import('../../types/inventory.js').InventoryV2} InventoryV2 */

/**
 * Renders the inventory sub-tab navigation (On Person, Stored, Assets)
 * @param {string} activeTab - Currently active sub-tab ('onPerson', 'stored', 'assets')
 * @returns {string} HTML for sub-tab navigation
 */
export function renderInventorySubTabs(activeTab = 'onPerson') {
    return `
        <div class="rpg-inventory-subtabs">
            <button class="rpg-inventory-subtab ${activeTab === 'onPerson' ? 'active' : ''}" data-tab="onPerson">
                On Person
            </button>
            <button class="rpg-inventory-subtab ${activeTab === 'stored' ? 'active' : ''}" data-tab="stored">
                Stored
            </button>
            <button class="rpg-inventory-subtab ${activeTab === 'assets' ? 'active' : ''}" data-tab="assets">
                Assets
            </button>
        </div>
    `;
}

/**
 * Renders the "On Person" inventory view
 * @param {string} onPersonItems - Current on-person items
 * @returns {string} HTML for on-person view with edit controls
 */
export function renderOnPersonView(onPersonItems) {
    const displayText = onPersonItems || 'None';
    return `
        <div class="rpg-inventory-section" data-section="onPerson">
            <div class="rpg-inventory-header">
                <h4>Items Currently Carried</h4>
            </div>
            <div class="rpg-inventory-content">
                <div class="rpg-inventory-text rpg-editable" contenteditable="true" data-field="onPerson" title="Click to edit">${escapeHtml(displayText)}</div>
            </div>
        </div>
    `;
}

/**
 * Renders the "Stored" inventory view with collapsible locations
 * @param {Object.<string, string>} stored - Stored items by location
 * @param {string[]} collapsedLocations - Array of collapsed location names
 * @returns {string} HTML for stored inventory with all locations
 */
export function renderStoredView(stored, collapsedLocations = []) {
    const locations = Object.keys(stored || {});

    let html = `
        <div class="rpg-inventory-section" data-section="stored">
            <div class="rpg-inventory-header">
                <h4>Storage Locations</h4>
                <button class="rpg-inventory-add-btn" data-action="add-location" title="Add new storage location">
                    <i class="fa-solid fa-plus"></i> Add Location
                </button>
            </div>
            <div class="rpg-inventory-content">
                <div class="rpg-inline-form" id="rpg-add-location-form" style="display: none;">
                    <input type="text" class="rpg-inline-input" id="rpg-new-location-name" placeholder="Enter location name..." />
                    <div class="rpg-inline-buttons">
                        <button class="rpg-inline-btn rpg-inline-cancel" data-action="cancel-add-location">
                            <i class="fa-solid fa-times"></i> Cancel
                        </button>
                        <button class="rpg-inline-btn rpg-inline-save" data-action="save-add-location">
                            <i class="fa-solid fa-check"></i> Save
                        </button>
                    </div>
                </div>
    `;

    if (locations.length === 0) {
        html += `
                <div class="rpg-inventory-empty">
                    No storage locations yet. Click "Add Location" to create one.
                </div>
        `;
    } else {
        for (const location of locations) {
            const items = stored[location];
            const isCollapsed = collapsedLocations.includes(location);
            html += `
                <div class="rpg-storage-location ${isCollapsed ? 'collapsed' : ''}" data-location="${escapeHtml(location)}">
                    <div class="rpg-storage-header">
                        <button class="rpg-storage-toggle" data-action="toggle-location" data-location="${escapeHtml(location)}">
                            <i class="fa-solid fa-chevron-${isCollapsed ? 'right' : 'down'}"></i>
                        </button>
                        <h5 class="rpg-storage-name">${escapeHtml(location)}</h5>
                        <div class="rpg-storage-actions">
                            <button class="rpg-inventory-remove-btn" data-action="remove-location" data-location="${escapeHtml(location)}" title="Remove this storage location">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="rpg-storage-content" ${isCollapsed ? 'style="display:none;"' : ''}>
                        <div class="rpg-inventory-text rpg-editable" contenteditable="true" data-field="stored" data-location="${escapeHtml(location)}" title="Click to edit">${escapeHtml(items || 'None')}</div>
                    </div>
                    <div class="rpg-inline-confirmation" id="rpg-remove-confirm-${escapeHtml(location).replace(/\s+/g, '-')}" style="display: none;">
                        <p>Remove "${escapeHtml(location)}"? This will delete all items stored there.</p>
                        <div class="rpg-inline-buttons">
                            <button class="rpg-inline-btn rpg-inline-cancel" data-action="cancel-remove-location" data-location="${escapeHtml(location)}">
                                <i class="fa-solid fa-times"></i> Cancel
                            </button>
                            <button class="rpg-inline-btn rpg-inline-confirm" data-action="confirm-remove-location" data-location="${escapeHtml(location)}">
                                <i class="fa-solid fa-check"></i> Confirm
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Renders the "Assets" inventory view
 * @param {string} assets - Current assets (vehicles, property, equipment)
 * @returns {string} HTML for assets view with edit controls
 */
export function renderAssetsView(assets) {
    const displayText = assets || 'None';
    return `
        <div class="rpg-inventory-section" data-section="assets">
            <div class="rpg-inventory-header">
                <h4>Vehicles, Property & Major Possessions</h4>
            </div>
            <div class="rpg-inventory-content">
                <div class="rpg-inventory-text rpg-editable" contenteditable="true" data-field="assets" title="Click to edit">${escapeHtml(displayText)}</div>
                <div class="rpg-inventory-hint">
                    <i class="fa-solid fa-info-circle"></i>
                    Assets include vehicles (cars, motorcycles), property (homes, apartments),
                    and major equipment (workshop tools, special items).
                </div>
            </div>
        </div>
    `;
}

/**
 * Generates inventory HTML (internal helper)
 * @param {InventoryV2} inventory - Inventory data to render
 * @param {Object} options - Rendering options
 * @param {string} options.activeSubTab - Currently active sub-tab ('onPerson', 'stored', 'assets')
 * @param {string[]} options.collapsedLocations - Collapsed storage locations
 * @returns {string} Complete HTML for inventory tab content
 */
function generateInventoryHTML(inventory, options = {}) {
    const {
        activeSubTab = 'onPerson',
        collapsedLocations = []
    } = options;

    // Handle legacy v1 format - convert to v2 for display
    let v2Inventory = inventory;
    if (typeof inventory === 'string') {
        v2Inventory = {
            version: 2,
            onPerson: inventory,
            stored: {},
            assets: 'None'
        };
    }

    // Ensure v2 structure has all required fields
    if (!v2Inventory || typeof v2Inventory !== 'object') {
        v2Inventory = {
            version: 2,
            onPerson: 'None',
            stored: {},
            assets: 'None'
        };
    }

    let html = `
        <div class="rpg-inventory-container">
            ${renderInventorySubTabs(activeSubTab)}
            <div class="rpg-inventory-views">
    `;

    // Render the active view
    switch (activeSubTab) {
        case 'onPerson':
            html += renderOnPersonView(v2Inventory.onPerson);
            break;
        case 'stored':
            html += renderStoredView(v2Inventory.stored, collapsedLocations);
            break;
        case 'assets':
            html += renderAssetsView(v2Inventory.assets);
            break;
        default:
            html += renderOnPersonView(v2Inventory.onPerson);
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Updates the inventory display in the DOM (used by inventoryActions)
 * @param {string} containerId - ID of container element to update
 * @param {Object} options - Rendering options (passed to generateInventoryHTML)
 */
export function updateInventoryDisplay(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`[RPG Companion] Inventory container not found: ${containerId}`);
        return;
    }

    const inventory = extensionSettings.userStats.inventory;
    const html = generateInventoryHTML(inventory, options);
    container.innerHTML = html;
}

/**
 * Main inventory rendering function (matches pattern of other render functions)
 * Gets data from state/settings and updates DOM directly.
 * Call this after AI generation, character changes, or swipes.
 */
export function renderInventory() {
    // Early return if container doesn't exist or section is hidden
    if (!$inventoryContainer || !extensionSettings.showInventory) {
        return;
    }

    // Get inventory data from settings
    const inventory = extensionSettings.userStats.inventory;

    // Get current render options (active tab, collapsed locations)
    const options = getInventoryRenderOptions();

    // Generate HTML and update DOM
    const html = generateInventoryHTML(inventory, options);
    $inventoryContainer.html(html);
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
