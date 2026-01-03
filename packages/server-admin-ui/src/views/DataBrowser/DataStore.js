import { Subject } from 'rxjs'
import moment from 'moment'

const TIME_ONLY_FORMAT = 'HH:mm:ss'
const TIMESTAMP_FORMAT = 'MMM DD HH:mm:ss'

/**
 * DataStore manages per-path RxJS Subjects for reactive data updates.
 * Mirrors the pattern from server's src/streambundle.ts but uses RxJS instead of BaconJS.
 *
 * Pattern:
 * - WebSocket delta arrives → pushDelta() → push to relevant Subjects
 * - Each DataRow subscribes to its Subject → only that row re-renders on change
 * - Parent component doesn't re-render on deltas
 */
class DataStore {
  constructor() {
    this.subjects = new Map() // Map<string, Subject> - key format: "context:pathKey"
    this.selfContext = null
  }

  /**
   * Set the self context (e.g., "vessels.urn:mrn:signalk:uuid:...")
   * Used to normalize context to 'self' for UI consistency
   */
  setSelfContext(selfContext) {
    this.selfContext = selfContext
  }

  /**
   * Get or create a Subject for a specific context:pathKey combination
   * @param {string} context - Either 'self' or full context path
   * @param {string} pathKey - Format: "path$source" (e.g., "environment.temperature$nmeaFromFile.II")
   * @returns {Subject} RxJS Subject for this specific data stream
   */
  getSubject(context, pathKey) {
    const key = `${context}:${pathKey}`
    if (!this.subjects.has(key)) {
      this.subjects.set(key, new Subject())
    }
    return this.subjects.get(key)
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

    // Normalize context: convert selfContext to 'self' for consistency
    const context = msg.context === this.selfContext ? 'self' : msg.context

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

        // Push to this path's Subject - only subscribed rows will react
        this.getSubject(context, pathKey).next(data)
      })
    })
  }

  /**
   * Cleanup: complete all subjects to prevent memory leaks
   * Call this when DataBrowser component unmounts
   */
  destroy() {
    this.subjects.forEach(subject => subject.complete())
    this.subjects.clear()
  }
}

// Singleton instance - shared across all DataBrowser instances
export const dataStore = new DataStore()
