import React, { Component } from 'react'
import { connect } from 'react-redux'
import { JSONTree } from 'react-json-tree'
import Select from 'react-select'
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Form,
  Col,
  Label,
  FormGroup,
  Table
} from 'reactstrap'
import moment from 'moment'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import Meta from './Meta'
import { getValueRenderer, DefaultValueRenderer } from './ValueRenderers'
import { dataStore } from './DataStore'

const TIMESTAMP_FORMAT = 'MM/DD HH:mm:ss'
const TIME_ONLY_FORMAT = 'HH:mm:ss'

const metaStorageKey = 'admin.v1.dataBrowser.meta'
const pauseStorageKey = 'admin.v1.dataBrowser.v1.pause'
const rawStorageKey = 'admin.v1.dataBrowser.v1.raw'
const contextStorageKey = 'admin.v1.dataBrowser.context'
const searchStorageKey = 'admin.v1.dataBrowser.search'
const selectedSourcesStorageKey = 'admin.v1.dataBrowser.selectedSources'
const sourceFilterActiveStorageKey = 'admin.v1.dataBrowser.sourceFilterActive'

function fetchSources() {
  fetch(`/signalk/v1/api/sources`, {
    credentials: 'include'
  })
    .then((response) => response.json())
    .then((sources) => {
      Object.values(sources).forEach((source) => {
        if (source.type === 'NMEA2000') {
          Object.keys(source).forEach((key) => {
            let device = source[key]
            if (device.n2k && device.n2k.modelId) {
              source[
                `${device.n2k.manufacturerCode || ''} ${
                  device.n2k.modelId
                } (${key})`
              ] = device
              delete source[key]
            }
          })
        }
      })
      this.setState({ ...this.state, sources: sources })
    })
}

// PathCell - static, never changes (Step 8a)
const PathCell = React.memo(({ path }) => (
  <td className="path-cell">
    <CopyToClipboardWithFade text={path}>
      <span>
        {path} <i className="far fa-copy"></i>
      </span>
    </CopyToClipboardWithFade>
  </td>
))

// ValueCell - subscribes directly to RxJS (Step 8b)
const ValueCell = ({ context, pathKey, raw, meta, path }) => {
  const [data, setData] = React.useState(null)

  React.useEffect(() => {
    const subscription = dataStore
      .getSubject(context, pathKey)
      .subscribe(newData => {
        setData(newData)
      })

    return () => subscription.unsubscribe()
  }, [context, pathKey])

  if (!data) return <td className="value-cell">Loading...</td>

  const units = meta?.units || ''

  return (
    <td className="value-cell">
      {(() => {
        if (raw) {
          return (
            <div>
              <div className="text-primary">
                value:{' '}
                {JSON.stringify(data.value, null, 2)}
              </div>
              <div className="text-primary">
                meta:{' '}
                {JSON.stringify(
                  meta ? meta : {},
                  null,
                  2
                )}
              </div>
            </div>
          )
        }
        const CustomRenderer = getValueRenderer(path, meta)
        if (CustomRenderer) {
          return (
            <CustomRenderer
              value={data.value}
              units={units}
              {...meta?.renderer?.options}
            />
          )
        }
        return (
          <DefaultValueRenderer
            value={data.value}
            units={units}
          />
        )
      })()}
    </td>
  )
}
// NO React.memo - component manages its own subscription

// SourceCell - static except when checkbox toggled (Step 8a)
const SourceCell = React.memo(({ source, pgn, sentence, selectedSources, onToggleSource }) => (
  <td className="source-cell">
    <input
      type="checkbox"
      onChange={() => onToggleSource(source)}
      checked={selectedSources.has(source)}
      style={{
        marginRight: '5px',
        verticalAlign: 'middle'
      }}
    />
    <CopyToClipboardWithFade text={source}>
      {source} <i className="far fa-copy"></i>
    </CopyToClipboardWithFade>{' '}
    {pgn || ''}
    {sentence || ''}
  </td>
), (prevProps, nextProps) => {
  // Only re-render if source or checkbox state changed
  return prevProps.source === nextProps.source &&
         prevProps.selectedSources === nextProps.selectedSources
})

// DataRow - completely static shell for cell components (Step 8b)
const DataRow = React.memo(({
  context,
  pathKey,
  path,
  source,
  pgn,
  sentence,
  meta,
  raw,
  isPaused,
  selectedSources,
  onToggleSource
}) => {
  // NO useState - NO data prop - just a static shell
  // Cells subscribe directly to RxJS for live updates

  return (
    <tr>
      <PathCell path={path} />
      <ValueCell
        context={context}
        pathKey={pathKey}
        path={path}
        meta={meta}
        raw={raw}
      />
      <TimestampCell
        context={context}
        pathKey={pathKey}
        isPaused={isPaused}
        className="timestamp-cell"
      />
      <SourceCell
        source={source}
        pgn={pgn}
        sentence={sentence}
        selectedSources={selectedSources}
        onToggleSource={onToggleSource}
      />
    </tr>
  )
}, (prevProps, nextProps) => {
  // Only re-render if static props change (search filter, source filter, pause toggle)
  return (
    prevProps.raw === nextProps.raw &&
    prevProps.isPaused === nextProps.isPaused &&
    prevProps.selectedSources === nextProps.selectedSources
  )
})

// Memoized DataTable component - caches filter/sort operations (Step 8b)
const DataTable = ({
  data,
  meta,
  context,
  search,
  raw,
  pause,
  selectedSources,
  sourceFilterActive,
  toggleSourceFilter,
  toggleSourceSelection
}) => {
  // Memoize the filter and sort operations - only recalculate when dependencies change
  const filteredSortedKeys = React.useMemo(() => {
    return Object.keys(data || {})
      .filter((key) => {
        const rowData = data[key]

        // Search filter
        const pathMatches =
          !search ||
          search.length === 0 ||
          key.toLowerCase().indexOf(search.toLowerCase()) !== -1
        if (!pathMatches) {
          return false
        }

        // Source filter
        if (sourceFilterActive && selectedSources.size > 0) {
          return selectedSources.has(rowData.$source)
        }

        return true
      })
      .sort()
  }, [data, search, sourceFilterActive, selectedSources])

  return (
    <Table
      responsive
      bordered
      striped
      size="sm"
      className="responsive-table"
    >
      <thead>
        <tr>
          <th className="path-cell">Path</th>
          <th className="value-cell">Value</th>
          <th className="timestamp-cell">Timestamp</th>
          <th className="source-cell">
            <input
              type="checkbox"
              onChange={toggleSourceFilter}
              checked={sourceFilterActive}
              disabled={selectedSources.size === 0}
              title={
                selectedSources.size === 0
                  ? 'Check a source in the list to filter by source'
                  : sourceFilterActive
                    ? 'Uncheck to deactivate source filtering'
                    : 'Check to activate source filtering'
              }
              style={{
                marginRight: '5px',
                verticalAlign: 'middle'
              }}
            />
            Source
          </th>
        </tr>
      </thead>
      <tbody>
        {filteredSortedKeys.map((key) => {
          const rowData = data[key]
          const rowMeta = meta[rowData.path]

          return (
            <DataRow
              key={key}
              context={context}
              pathKey={key}
              path={rowData.path}
              source={rowData.$source}
              pgn={rowData.pgn}
              sentence={rowData.sentence}
              meta={rowMeta}
              raw={raw}
              isPaused={pause}
              selectedSources={selectedSources}
              onToggleSource={toggleSourceSelection}
            />
          )
        })}
      </tbody>
    </Table>
  )
}

class DataBrowser extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasData: false,
      webSocket: null,
      didSubscribe: false,
      pause: localStorage.getItem(pauseStorageKey) === 'true',
      includeMeta: localStorage.getItem(metaStorageKey) === 'true',
      raw: localStorage.getItem(rawStorageKey) === 'true',
      data: {},
      meta: {},
      context: localStorage.getItem(contextStorageKey) || 'self',
      search: localStorage.getItem(searchStorageKey) || '',
      selectedSources: new Set(
        JSON.parse(localStorage.getItem(selectedSourcesStorageKey) || '[]')
      ),
      sourceFilterActive:
        localStorage.getItem(sourceFilterActiveStorageKey) === 'true'
    }

    this.fetchSources = fetchSources.bind(this)
    this.handlePause = this.handlePause.bind(this)
    this.handleMessage = this.handleMessage.bind(this)
    this.handleContextChange = this.handleContextChange.bind(this)
    this.handleSearch = this.handleSearch.bind(this)
    this.toggleMeta = this.toggleMeta.bind(this)
    this.toggleRaw = this.toggleRaw.bind(this)
    this.toggleSourceSelection = this.toggleSourceSelection.bind(this)
    this.toggleSourceFilter = this.toggleSourceFilter.bind(this)
  }

  handleMessage(msg) {
    if (this.state.pause) {
      return
    }

    if (msg.context && msg.updates) {
      // ALWAYS push to RxJS for reactive cell subscriptions (Step 8b)
      dataStore.pushDelta(msg)

      const key =
        msg.context === this.state.webSocket.skSelf ? 'self' : msg.context

      // Keep setState for backwards compatibility and initial data load
      // Cell-level RxJS subscriptions are the real optimization
      // Parent may re-render, but DataRow is memoized and cells manage their own updates
      this.setState((prevState) => {
        const newDataForContext = { ...(prevState.data[key] || {}) }
        const newMetaForContext = { ...(prevState.meta[key] || {}) }

        msg.updates.forEach((update) => {
          if (update.values) {
            const pgn =
              update.source && update.source.pgn && `(${update.source.pgn})`
            const sentence =
              update.source &&
              update.source.sentence &&
              `(${update.source.sentence})`

            update.values.forEach((vp) => {
              const timestamp = moment(update.timestamp)
              const formattedTimestamp = timestamp.isSame(moment(), 'day')
                ? timestamp.format(TIME_ONLY_FORMAT)
                : timestamp.format(TIMESTAMP_FORMAT)

              if (vp.path === '') {
                // Empty path - spread object keys
                Object.keys(vp.value).forEach((k) => {
                  newDataForContext[k] = {
                    path: k,
                    value: vp.value[k],
                    $source: update.$source,
                    pgn,
                    sentence,
                    timestamp: formattedTimestamp
                  }
                })
              } else {
                // Normal path
                const pathKey = vp.path + '$' + update.$source
                newDataForContext[pathKey] = {
                  path: vp.path,
                  $source: update.$source,
                  value: vp.value,
                  pgn,
                  sentence,
                  timestamp: formattedTimestamp
                }
              }
            })
          }

          if (update.meta) {
            update.meta.forEach((vp) => {
              newMetaForContext[vp.path] = {
                ...newMetaForContext[vp.path],
                ...vp.value
              }
            })
          }
        })

        return {
          hasData: true,
          data: {
            ...prevState.data,
            [key]: newDataForContext
          },
          meta: {
            ...prevState.meta,
            [key]: newMetaForContext
          }
        }
      })
    }
  }

  subscribeToDataIfNeeded() {
    if (
      !this.state.pause &&
      this.props.webSocket &&
      (this.props.webSocket !== this.state.webSocket ||
        this.state.didSubscribe === false)
    ) {
      const sub = {
        context: '*',
        subscribe: [
          {
            path: '*',
            period: 2000
          }
        ]
      }

      this.props.webSocket.send(JSON.stringify(sub))
      this.state.webSocket = this.props.webSocket
      this.state.didSubscribe = true
      this.state.webSocket.messageHandler = this.handleMessage
    }
  }

  unsubscribeToData() {
    if (this.props.webSocket) {
      const sub = {
        context: '*',
        unsubscribe: [
          {
            path: '*'
          }
        ]
      }
      this.props.webSocket.send(JSON.stringify(sub))
      this.state.didSubscribe = false
      this.props.webSocket.messageHandler = null
    }
  }

  componentDidMount() {
    this.fetchSources()
    this.subscribeToDataIfNeeded()
  }

  componentDidUpdate() {
    this.subscribeToDataIfNeeded()
  }

  componentWillUnmount() {
    this.unsubscribeToData()
    // Cleanup DataStore subscriptions to prevent memory leaks
    dataStore.destroy()
  }

  handleContextChange(selectedOption) {
    const value = selectedOption ? selectedOption.value : 'none'

    localStorage.setItem(selectedSourcesStorageKey, JSON.stringify([]))
    localStorage.setItem(sourceFilterActiveStorageKey, false)

    this.setState({
      ...this.state,
      context: value,
      selectedSources: new Set(),
      sourceFilterActive: false
    })
    localStorage.setItem(contextStorageKey, value)
  }

  getContextLabel(contextKey) {
    const contextData = this.state.data[contextKey]
    const contextName = contextData?.name?.value
    return `${contextName || ''} ${contextKey}`
  }

  getContextOptions() {
    const contexts = Object.keys(this.state.data || {}).sort()

    const options = []

    if (contexts.includes('self')) {
      const selfLabel = this.getContextLabel('self')
      options.push({ value: 'self', label: selfLabel })
    }

    contexts.forEach((key) => {
      if (key !== 'self') {
        const contextLabel = this.getContextLabel(key)
        options.push({ value: key, label: contextLabel })
      }
    })

    return options
  }

  getCurrentContextValue() {
    const options = this.getContextOptions()
    return options.find((option) => option.value === this.state.context) || null
  }

  handleSearch(event) {
    this.setState({ ...this.state, search: event.target.value })
    localStorage.setItem(searchStorageKey, event.target.value)
  }

  toggleMeta(event) {
    this.setState({ ...this.state, includeMeta: event.target.checked })
    localStorage.setItem(metaStorageKey, event.target.checked)
  }

  toggleRaw(event) {
    this.setState({ ...this.state, raw: event.target.checked })
    localStorage.setItem(rawStorageKey, event.target.checked)
  }
  resetAllTimestampAnimations() {
    const cells = document.querySelectorAll('.timestamp-updated')
    cells.forEach((cell) => {
      cell.classList.remove('timestamp-updated')
    })
  }

  handlePause(event) {
    this.state.pause = event.target.checked
    this.setState(this.state)
    localStorage.setItem(pauseStorageKey, this.state.pause)
    if (this.state.pause) {
      this.unsubscribeToData()
      this.resetAllTimestampAnimations()
    } else {
      this.fetchSources()
      this.subscribeToDataIfNeeded()
    }
  }

  toggleSourceSelection(source) {
    const newSelectedSources = new Set(this.state.selectedSources)
    const wasEmpty = newSelectedSources.size === 0

    if (newSelectedSources.has(source)) {
      newSelectedSources.delete(source)
    } else {
      newSelectedSources.add(source)
    }

    // Auto-activate filtering when first source is selected, deactivate when none selected
    const shouldActivateFilter = wasEmpty && newSelectedSources.size === 1
    const shouldDeactivateFilter = newSelectedSources.size === 0

    const newSourceFilterActive = shouldActivateFilter
      ? true
      : shouldDeactivateFilter
        ? false
        : this.state.sourceFilterActive

    localStorage.setItem(
      selectedSourcesStorageKey,
      JSON.stringify([...newSelectedSources])
    )
    localStorage.setItem(sourceFilterActiveStorageKey, newSourceFilterActive)

    this.setState({
      ...this.state,
      selectedSources: newSelectedSources,
      sourceFilterActive: newSourceFilterActive
    })
  }

  toggleSourceFilter(event) {
    const newSourceFilterActive = event.target.checked
    localStorage.setItem(sourceFilterActiveStorageKey, newSourceFilterActive)

    this.setState({
      ...this.state,
      sourceFilterActive: newSourceFilterActive
    })
  }

  render() {
    const contextOptions = this.getContextOptions()
    const currentContext = this.getCurrentContextValue()

    return (
      <div className="animated fadeIn">
        <style>
          {`
            .timestamp-updated {
              position: relative;
            }

            .timestamp-updated::before {
              content: '';
              position: absolute;
              left: 0;
              top: 0;
              bottom: 0;
              width: 3px;
              background-color: #28a745;
              animation: highlightFade 15s ease-out;
            }

            @keyframes highlightFade {
              0% {
                opacity: 1;
              }
              100% {
                opacity: 0;
              }
            }

            .responsive-table {
              font-size: 0.875rem;
            }

            .responsive-table td {
              padding: 0.5rem 0.25rem;
              vertical-align: top;
              word-wrap: break-word;
              word-break: break-word;
            }

            .responsive-table th {
              padding: 0.5rem 0.25rem;
              font-size: 0.8rem;
              font-weight: 600;
            }

            .responsive-table .path-cell {
              min-width: 150px;
              max-width: 200px;
            }

            .responsive-table .value-cell {
              min-width: 120px;
              max-width: 300px;
            }

            .responsive-table .timestamp-cell {
              min-width: 80px;
              max-width: 100px;
              white-space: nowrap;
            }

            .responsive-table .source-cell {
              min-width: 120px;
              max-width: 170px;
            }

            .responsive-table pre {
              margin: 0;
              padding: 0;
              font-size: 0.8rem;
              white-space: pre-wrap;
              word-wrap: break-word;
              word-break: break-word;
            }

            @media (max-width: 1200px) {
              .responsive-table {
                font-size: 0.8rem;
              }

              .responsive-table td {
                padding: 0.4rem 0.2rem;
              }

              .responsive-table th {
                padding: 0.4rem 0.2rem;
                font-size: 0.75rem;
              }
            }

            @media (max-width: 992px) {
              .responsive-table .path-cell {
                max-width: 150px;
              }

              .responsive-table .value-cell {
                max-width: 200px;
              }

              .responsive-table .source-cell {
                max-width: 140px;
              }
            }

            @media (max-width: 768px) {
              .responsive-table {
                font-size: 0.75rem;
              }

              .responsive-table td {
                padding: 0.3rem 0.15rem;
              }

              .responsive-table th {
                padding: 0.3rem 0.15rem;
                font-size: 0.7rem;
              }

              .responsive-table .path-cell {
                max-width: 120px;
              }

              .responsive-table .value-cell {
                max-width: 150px;
              }

              .responsive-table .source-cell {
                max-width: 120px;
              }

              .responsive-table pre {
                font-size: 0.7rem;
              }
            }

            @media (max-width: 576px) {
              .responsive-table {
                font-size: 0.7rem;
              }

              .responsive-table td {
                padding: 0.25rem 0.1rem;
              }

              .responsive-table th {
                padding: 0.25rem 0.1rem;
                font-size: 0.65rem;
              }

              .responsive-table .timestamp-cell {
                min-width: 70px;
                max-width: 80px;
              }
            }
          `}
        </style>
        <Card>
          <CardBody>
            <Form
              action=""
              method="post"
              encType="multipart/form-data"
              className="form-horizontal"
              onSubmit={(e) => {
                e.preventDefault()
              }}
            >
              <FormGroup row>
                <Col xs="12" md="4">
                  <Select
                    value={currentContext}
                    onChange={this.handleContextChange}
                    options={contextOptions}
                    placeholder="Select a context"
                    isSearchable={true}
                    isClearable={true}
                    noOptionsMessage={() => 'No contexts available'}
                  />
                </Col>
                <Col xs="6" md="2">
                  <Label className="switch switch-text switch-primary">
                    <Input
                      type="checkbox"
                      id="Meta"
                      name="meta"
                      className="switch-input"
                      onChange={this.toggleMeta}
                      checked={this.state.includeMeta}
                    />
                    <span
                      className="switch-label"
                      data-on="Yes"
                      data-off="No"
                    />
                    <span className="switch-handle" />
                  </Label>{' '}
                  <span style={{ whiteSpace: 'nowrap' }}>Meta data</span>
                </Col>
                <Col xs="6" md="2">
                  <Label className="switch switch-text switch-primary">
                    <Input
                      type="checkbox"
                      id="Pause"
                      name="pause"
                      className="switch-input"
                      onChange={this.handlePause}
                      checked={this.state.pause}
                    />
                    <span
                      className="switch-label"
                      data-on="Yes"
                      data-off="No"
                    />
                    <span className="switch-handle" />
                  </Label>{' '}
                  Pause
                </Col>
                <Col xs="6" md="2">
                  <Label className="switch switch-text switch-primary">
                    <Input
                      type="checkbox"
                      id="Raw"
                      name="raw"
                      className="switch-input"
                      onChange={this.toggleRaw}
                      checked={this.state.raw}
                    />
                    <span
                      className="switch-label"
                      data-on="Yes"
                      data-off="No"
                    />
                    <span className="switch-handle" />
                  </Label>{' '}
                  <span style={{ whiteSpace: 'nowrap' }}>Raw Values</span>
                </Col>
              </FormGroup>
              {this.state.context && this.state.context !== 'none' && (
                <FormGroup row>
                  <Col xs="3" md="2">
                    <Label htmlFor="select">Search</Label>
                  </Col>
                  <Col xs="12" md="12">
                    <Input
                      type="text"
                      name="search"
                      onChange={this.handleSearch}
                      value={this.state.search}
                    />
                  </Col>
                </FormGroup>
              )}

              {!this.state.includeMeta &&
                this.state.context &&
                this.state.context !== 'none' && (
                  <DataTable
                    data={this.state.data[this.state.context] || {}}
                    meta={this.state.meta[this.state.context] || {}}
                    context={
                      this.state.context === this.props.webSocket?.skSelf
                        ? 'self'
                        : this.state.context
                    }
                    search={this.state.search}
                    raw={this.state.raw}
                    pause={this.state.pause}
                    selectedSources={this.state.selectedSources}
                    sourceFilterActive={this.state.sourceFilterActive}
                    toggleSourceFilter={this.toggleSourceFilter}
                    toggleSourceSelection={this.toggleSourceSelection}
                  />
                )}

              {this.state.includeMeta &&
                this.state.context &&
                this.state.context !== 'none' && (
                  <Table responsive bordered striped size="sm">
                    <thead>
                      <tr>
                        <th>Path</th>
                        <th>Meta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(this.state.data[this.state.context] || {})
                        .filter((key) => {
                          return (
                            !this.state.search ||
                            this.state.search.length === 0 ||
                            key
                              .toLowerCase()
                              .indexOf(this.state.search.toLowerCase()) !== -1
                          )
                        })
                        .map(
                          (key) => this.state.data[this.state.context][key].path
                        )
                        .filter((path, index, array) => {
                          return array.indexOf(path) === index
                        })
                        .sort()
                        .map((path) => {
                          const meta = this.state.meta[this.state.context][path]
                          return (
                            <tr key={path}>
                              <td>{path}</td>
                              <td>
                                {!path.startsWith('notifications') && (
                                  <Meta meta={meta || {}} path={path} />
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </Table>
                )}
            </Form>
          </CardBody>
        </Card>

        {this.state.sources && (
          <Card>
            <CardHeader>Sources</CardHeader>
            <CardBody>
              <JSONTree
                data={this.state.sources}
                theme="default"
                invertTheme={true}
                sortObjectKeys
                hideRoot
              />
            </CardBody>
          </Card>
        )}
      </div>
    )
  }
}

// TimestampCell - subscribes directly to RxJS with animation (Step 8b)
const TimestampCell = ({ context, pathKey, isPaused, className }) => {
  const [timestamp, setTimestamp] = React.useState(null)
  const [isUpdated, setIsUpdated] = React.useState(false)
  const [animationKey, setAnimationKey] = React.useState(0)
  const timeoutRef = React.useRef(null)

  React.useEffect(() => {
    const subscription = dataStore
      .getSubject(context, pathKey)
      .subscribe(data => {
        setTimestamp(data.timestamp)

        // Trigger animation
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        setIsUpdated(true)
        setAnimationKey(prev => prev + 1)

        timeoutRef.current = setTimeout(() => {
          if (!isPaused) {
            setIsUpdated(false)
          }
        }, 15000)
      })

    return () => {
      subscription.unsubscribe()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [context, pathKey, isPaused])

  React.useEffect(() => {
    if (isPaused) {
      setIsUpdated(false)
    }
  }, [isPaused])

  if (!timestamp) return <td className={className || 'timestamp-cell'}>--:--:--</td>

  return (
    <td
      className={`${className || ''} ${
        isUpdated && !isPaused ? 'timestamp-updated' : ''
      }`}
      key={animationKey}
    >
      {timestamp}
    </td>
  )
}
// NO React.memo - component manages its own subscription

class CopyToClipboardWithFade extends Component {
  constructor() {
    super()
    this.state = {
      opacity: 1
    }
  }

  render() {
    const { opacity } = this.state
    const onCopy = function () {
      this.setState({ opacity: 0.5 })
      setTimeout(() => {
        this.setState({ opacity: 1 })
      }, 500)
    }.bind(this)
    return (
      <CopyToClipboard text={this.props.text} onCopy={onCopy}>
        <span style={{ opacity }}> {this.props.children}</span>
      </CopyToClipboard>
    )
  }
}

export default connect(({ webSocket }) => ({ webSocket }))(DataBrowser)
