import { useEffect, useRef, useCallback, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { useAuthStore } from '@/store/authStore'

export type WSMessage = {
  type: string
  payload: unknown
}

export type WSConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'LIVE'

type WSCallback = (msg: WSMessage) => void

const listeners = new Set<WSCallback>()

let client: Client | null = null

const connectionListeners = new Set<(state: WSConnectionState) => void>()

let reconnectAttempts = 0

export const WS_BASE_DELAY_MS = 1000
export const WS_MAX_DELAY_MS = 30000

/**
 * Exponential backoff with full jitter: delay grows 1s, 2s, 4s ... capped at
 * 30s, then randomly scaled within [0.5x, 1.0x] so a fleet of clients does not
 * reconnect in lockstep.
 */
export function computeBackoffDelay(attempt: number): number {
  if (attempt <= 0) return 0
  const exponential = Math.min(
    WS_BASE_DELAY_MS * 2 ** (attempt - 1),
    WS_MAX_DELAY_MS
  )
  return Math.round(exponential * (0.5 + Math.random() * 0.5))
}

function emitConnectionState(state: WSConnectionState) {
  connectionListeners.forEach((cb) => cb(state))
}

export function useWSConnectionState(): WSConnectionState {
  const [state, setState] = useState<WSConnectionState>('DISCONNECTED')

  useEffect(() => {
    const cb = (s: WSConnectionState) => setState(s)
    connectionListeners.add(cb)
    if (client) {
      if (client.connected) setState('LIVE')
      else if (client.active) setState('RECONNECTING')
    }
    return () => {
      connectionListeners.delete(cb)
    }
  }, [])

  return state
}

function connect() {
  const token = useAuthStore.getState().token
  const wsUrl = import.meta.env.VITE_WS_URL
  const brokerURL = wsUrl
    ? wsUrl
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`

  client = new Client({
    brokerURL,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: WS_BASE_DELAY_MS,
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,
    debug: () => {},
    onConnect: () => {
      reconnectAttempts = 0
      emitConnectionState('LIVE')
      client?.subscribe('/topic/risk/updated', (message) => {
        try {
          const payload = JSON.parse(message.body)
          listeners.forEach((cb) => cb({ type: 'risk:updated', payload }))
        } catch {}
      })
      client?.subscribe('/topic/ingestion/event', (message) => {
        try {
          const payload = JSON.parse(message.body)
          listeners.forEach((cb) => cb({ type: 'ingestion:event', payload }))
        } catch {}
      })
    },
    onWebSocketClose: () => {
      reconnectAttempts += 1
      if (client) client.reconnectDelay = computeBackoffDelay(reconnectAttempts)
      emitConnectionState('RECONNECTING')
    },
    onStompError: () => {
      reconnectAttempts += 1
      if (client) client.reconnectDelay = computeBackoffDelay(reconnectAttempts)
      emitConnectionState('RECONNECTING')
    },
  })
  emitConnectionState('CONNECTING')
  client.activate()
}

function disconnect() {
  emitConnectionState('DISCONNECTED')
  client?.deactivate()
  client = null
}

export function useWebSocket(onMessage?: WSCallback) {
  const initialized = useRef(false)

  useEffect(() => {
    if (onMessage) listeners.add(onMessage)
    if (!initialized.current) {
      initialized.current = true
      connect()
    }
    return () => {
      if (onMessage) listeners.delete(onMessage)
    }
  }, [onMessage])

  useEffect(() => {
    return () => {
      if (listeners.size === 0) disconnect()
    }
  }, [])

  const send = useCallback((msg: WSMessage) => {
    client?.publish({ destination: '/app/subscribe', body: JSON.stringify(msg.payload ?? msg.type) })
  }, [])

  return { send }
}