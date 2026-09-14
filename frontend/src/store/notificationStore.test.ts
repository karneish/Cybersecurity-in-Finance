import { beforeEach, describe, it, expect } from 'vitest'
import { useNotificationStore } from './notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll()
  })

  it('adds a notification at the front and bumps unread count', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification('warning', 'Risk spike detected')

    const s = useNotificationStore.getState()
    expect(s.notifications).toHaveLength(1)
    expect(s.notifications[0].message).toBe('Risk spike detected')
    expect(s.notifications[0].type).toBe('warning')
    expect(s.notifications[0].read).toBe(false)
    expect(s.unreadCount).toBe(1)
  })

  it('caps the notification list at 100 entries', () => {
    const { addNotification } = useNotificationStore.getState()
    for (let i = 0; i < 120; i++) addNotification('info', `event ${i}`)

    const s = useNotificationStore.getState()
    expect(s.notifications).toHaveLength(100)
    expect(s.notifications[0].message).toBe('event 119')
  })

  it('marks a single notification as read and decrements unread', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification('info', 'first')
    addNotification('success', 'second')
    const secondId = useNotificationStore.getState().notifications[0].id

    useNotificationStore.getState().markAsRead(secondId)
    const after = useNotificationStore.getState()
    expect(after.unreadCount).toBe(1)
    expect(after.notifications.find((n) => n.id === secondId)?.read).toBe(true)
  })

  it('never decrements unread below zero', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification('info', 'x')
    const id = useNotificationStore.getState().notifications[0].id

    useNotificationStore.getState().markAsRead(id)
    useNotificationStore.getState().markAsRead(id)
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('markAllRead zeroes the counter but keeps entries', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification('warning', 'a')
    addNotification('error', 'b')
    useNotificationStore.getState().markAllRead()

    const after = useNotificationStore.getState()
    expect(after.unreadCount).toBe(0)
    expect(after.notifications).toHaveLength(2)
    expect(after.notifications.every((n) => n.read)).toBe(true)
  })

  it('clearAll empties the list', () => {
    useNotificationStore.getState().addNotification('info', 'x')
    useNotificationStore.getState().clearAll()

    const s = useNotificationStore.getState()
    expect(s.notifications).toHaveLength(0)
    expect(s.unreadCount).toBe(0)
  })
})