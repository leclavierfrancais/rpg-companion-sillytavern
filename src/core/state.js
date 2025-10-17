/**
 * Core State Management Module
 * Centralizes all extension state variables
 */

// Type imports
/** @typedef {import('../types/inventory.js').InventoryV2} InventoryV2 */

/**
 * Extension settings - persisted to SillyTavern settings
 */
export let extensionSettings = {
    enabled: true,
    autoUpdate: true,
    updateDepth: 4, // How many messages to include in the context
    generationMode: 'together', // 'separate' or 'together' - whether to generate with main response or separately
    showUserStats: true,
    showInfoBox: true,
    showCharacterThoughts: true,
    showThoughtsInChat: true, // Show thoughts overlay in chat
    enableHtmlPrompt: false, // Enable immersive HTML prompt injection
    enablePlotButtons: true, // Show plot progression buttons above chat input
    panelPosition: 'right', // 'left', 'right', or 'top'
    theme: 'default', // Theme: default, sci-fi, fantasy, cyberpunk, custom
    customColors: {
        bg: '#1a1a2e',
        accent: '#16213e',
        text: '#eaeaea',
        highlight: '#e94560'
    },
    statBarColorLow: '#cc3333', // Color for low stat values (red)
    statBarColorHigh: '#33cc66', // Color for high stat values (green)
    enableAnimations: true, // Enable smooth animations for stats and content updates
    mobileFabPosition: {
        top: 'calc(var(--topBarBlockSize) + 60px)',
        right: '12px'
    }, // Saved position for mobile FAB button
    userStats: {
        health: 100,
        satiety: 100,
        energy: 100,
        hygiene: 100,
        arousal: 0,
        mood: '😐',
        conditions: 'None',
        /** @type {InventoryV2} */
        inventory: {
            version: 2,
            onPerson: "None",
            stored: {},
            assets: "None"
        }
    },
    classicStats: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10
    },
    lastDiceRoll: null // Store last dice roll result
};

/**
 * Last generated data from AI response
 */
export let lastGeneratedData = {
    userStats: null,
    infoBox: null,
    characterThoughts: null,
    html: null
};

/**
 * Tracks the "committed" tracker data that should be used as source for next generation
 * This gets updated when user sends a new message or first time generation
 */
export let committedTrackerData = {
    userStats: null,
    infoBox: null,
    characterThoughts: null
};

/**
 * Tracks whether the last action was a swipe (for separate mode)
 * Used to determine whether to commit lastGeneratedData to committedTrackerData
 */
export let lastActionWasSwipe = false;

/**
 * Flag indicating if generation is in progress
 */
export let isGenerating = false;

/**
 * Tracks if we're currently doing a plot progression
 */
export let isPlotProgression = false;

/**
 * Temporary storage for pending dice roll (not saved until user clicks "Save Roll")
 */
export let pendingDiceRoll = null;

/**
 * Feature flags for gradual rollout of new features
 */
export const FEATURE_FLAGS = {
    useNewInventory: true // Enable v2 inventory system with categorized storage
};

/**
 * Fallback avatar image (base64-encoded SVG with "?" icon)
 * Using base64 to avoid quote-encoding issues in HTML attributes
 */
export const FALLBACK_AVATAR_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjY2NjYyIgb3BhY2l0eT0iMC4zIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjQwIj4/PC90ZXh0Pjwvc3ZnPg==';

/**
 * UI Element References (jQuery objects)
 */
export let $panelContainer = null;
export let $userStatsContainer = null;
export let $infoBoxContainer = null;
export let $thoughtsContainer = null;

/**
 * State setters - provide controlled mutation of state variables
 */
export function setExtensionSettings(newSettings) {
    extensionSettings = newSettings;
}

export function updateExtensionSettings(updates) {
    Object.assign(extensionSettings, updates);
}

export function setLastGeneratedData(data) {
    lastGeneratedData = data;
}

export function updateLastGeneratedData(updates) {
    Object.assign(lastGeneratedData, updates);
}

export function setCommittedTrackerData(data) {
    committedTrackerData = data;
}

export function updateCommittedTrackerData(updates) {
    Object.assign(committedTrackerData, updates);
}

export function setLastActionWasSwipe(value) {
    lastActionWasSwipe = value;
}

export function setIsGenerating(value) {
    isGenerating = value;
}

export function setIsPlotProgression(value) {
    isPlotProgression = value;
}

export function setPendingDiceRoll(roll) {
    pendingDiceRoll = roll;
}

export function getPendingDiceRoll() {
    return pendingDiceRoll;
}

export function setPanelContainer($element) {
    $panelContainer = $element;
}

export function setUserStatsContainer($element) {
    $userStatsContainer = $element;
}

export function setInfoBoxContainer($element) {
    $infoBoxContainer = $element;
}

export function setThoughtsContainer($element) {
    $thoughtsContainer = $element;
}
