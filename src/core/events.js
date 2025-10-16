/**
 * Core Events Module
 * Wrapper for SillyTavern event system
 */

import { eventSource, event_types } from '../../../../../../script.js';

/**
 * Register an event handler
 * @param {string} eventType - Event type from event_types
 * @param {Function} handler - Event handler function
 */
export function on(eventType, handler) {
    eventSource.on(eventType, handler);
}

/**
 * Register a one-time event handler
 * @param {string} eventType - Event type from event_types
 * @param {Function} handler - Event handler function
 */
export function once(eventType, handler) {
    eventSource.once(eventType, handler);
}

/**
 * Remove an event handler
 * @param {string} eventType - Event type from event_types
 * @param {Function} handler - Event handler function to remove
 */
export function off(eventType, handler) {
    eventSource.off(eventType, handler);
}

/**
 * Emit an event
 * @param {string} eventType - Event type to emit
 * @param {...*} args - Arguments to pass to handlers
 */
export function emit(eventType, ...args) {
    eventSource.emit(eventType, ...args);
}

/**
 * Re-export event types for convenience
 */
export { event_types };
