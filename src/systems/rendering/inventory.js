/**
 * Inventory Rendering Module
 * Handles UI rendering for inventory v2 system
 */

import { extensionSettings } from '../../core/state.js';

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
                <button class="rpg-inventory-edit-btn" data-action="edit-onperson" title="Edit on-person inventory">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
            </div>
            <div class="rpg-inventory-content">
                <div class="rpg-inventory-text">${escapeHtml(displayText)}</div>
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
                            <button class="rpg-inventory-edit-btn" data-action="edit-location" data-location="${escapeHtml(location)}" title="Edit items at this location">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="rpg-inventory-remove-btn" data-action="remove-location" data-location="${escapeHtml(location)}" title="Remove this storage location">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="rpg-storage-content" ${isCollapsed ? 'style="display:none;"' : ''}>
                        <div class="rpg-inventory-text">${escapeHtml(items || 'None')}</div>
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
                <button class="rpg-inventory-edit-btn" data-action="edit-assets" title="Edit assets">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
            </div>
            <div class="rpg-inventory-content">
                <div class="rpg-inventory-text">${escapeHtml(displayText)}</div>
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
 * Main inventory rendering function
 * @param {InventoryV2} inventory - Inventory data to render
 * @param {Object} options - Rendering options
 * @param {string} options.activeSubTab - Currently active sub-tab ('onPerson', 'stored', 'assets')
 * @param {string[]} options.collapsedLocations - Collapsed storage locations
 * @returns {string} Complete HTML for inventory tab content
 */
export function renderInventory(inventory, options = {}) {
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
 * Updates the inventory display in the DOM
 * @param {string} containerId - ID of container element to update
 * @param {Object} options - Rendering options (passed to renderInventory)
 */
export function updateInventoryDisplay(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`[RPG Companion] Inventory container not found: ${containerId}`);
        return;
    }

    const inventory = extensionSettings.userStats.inventory;
    const html = renderInventory(inventory, options);
    container.innerHTML = html;
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
