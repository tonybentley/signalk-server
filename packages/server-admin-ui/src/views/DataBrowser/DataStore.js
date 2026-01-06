import moment from 'moment'

const TIME_ONLY_FORMAT = 'HH:mm:ss'
const TIMESTAMP_FORMAT = 'MMM DD HH:mm:ss'

/**
 * DataStore manages per-path native pub/sub for reactive data updates.
 * Mirrors the pattern from server's src/streambundle.ts but uses native JavaScript instead of RxJS.
 *
 * Pattern:
 * - WebSocket delta arrives → pushDelta() → emit to relevant listeners
 * - Each cell subscribes to its path → receives future updates
 * - Parent component doesn't re-render on deltas
 */
class DataStore {
  constructor() {
    this.listeners = new Map() // Map<string, Set<callback>> - key format: "context:pathKey"
  }

  /**
   * Get or create a Subject-like API for a specific context:pathKey combination
   * @param {string} context - Either 'self' or full context path
   * @param {string} pathKey - Format: "path$source" (e.g., "environment.temperature$nmeaFromFile.II")
   * @returns {Object} Subject-like object with subscribe() and next() methods
   */
  getSubject(context, pathKey) {
    const key = `${context}:${pathKey}`

    // Ensure listener Set exists
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }

    const listenerSet = this.listeners.get(key)

    // Return Subject-like API for compatibility
    return {
      next: (data) => {
        // Emit to all subscribers synchronously
        listenerSet.forEach((callback) => callback(data))
      },

      subscribe: (callback) => {
        // Add callback to Set
        listenerSet.add(callback)

        // Return Subscription-like API
        return {
          unsubscribe: () => {
            listenerSet.delete(callback)

            // Cleanup empty Sets to prevent memory leaks
            if (listenerSet.size === 0) {
              this.listeners.delete(key)
            }
          }
        }
      },

      complete: () => {
        // Clear all listeners for this key
        listenerSet.clear()
        this.listeners.delete(key)
      }
    }
  }

  /**
   * Push a WebSocket delta message to relevant Subjects
   * Mirrors streambundle.ts pushDelta pattern
   * @param {object} msg - WebSocket delta message with context and updates
   */
  pushDelta(msg) {
    if (!msg.context || !msg.updates) {
      return
    }

    // Normalize context: convert vessel contexts to 'self' for UI consistency
    // Pattern: "vessels.urn:mrn:signalk:uuid:..." → "self"
    const context = msg.context.startsWith('vessels.') ? 'self' : msg.context

    msg.updates.forEach((update) => {
      if (!update.values) return

      update.values.forEach((vp) => {
        // pathKey format matches DataBrowser's key format: "path$source"
        const pathKey = `${vp.path}$${update.$source}`

        // Format timestamp
        const timestamp = moment(update.timestamp)
        const formattedTimestamp = timestamp.isSame(moment(), 'day')
          ? timestamp.format(TIME_ONLY_FORMAT)
          : timestamp.format(TIMESTAMP_FORMAT)

        // Construct data object matching DataBrowser's state structure
        const data = {
          path: vp.path,
          value: vp.value,
          $source: update.$source,
          timestamp: formattedTimestamp,
          pgn: update.pgn,
          sentence: update.sentence
        }

        // Push to this path's Subject - only subscribed cells will react
        this.getSubject(context, pathKey).next(data)
      })
    })
  }

  /**
   * Cleanup: clear all listeners to prevent memory leaks
   * Call this when DataBrowser component unmounts
   */
  destroy() {
    this.listeners.forEach((listenerSet) => listenerSet.clear())
    this.listeners.clear()
  }
}

// Singleton instance - shared across all DataBrowser instances
export const dataStore = new DataStore()
