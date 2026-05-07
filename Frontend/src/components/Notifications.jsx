import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, List, Typography, Empty, Popover, Drawer, notification } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../config/fetchConfig'
import { useAuth } from '../hooks/useAuth'

export default function Notifications() {
    const { auth } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState([])
    const [popoverOpen, setPopoverOpen] = useState(false)

    const notificationActionButtonStyle = {
        background: '#305797',
        borderColor: '#305797',
        color: '#ffffff',
        fontWeight: 600,
        boxShadow: '0 8px 18px rgba(48, 87, 151, 0.18)',
    }

    const notificationSecondaryButtonStyle = {
        background: '#ffffff',
        borderColor: '#305797',
        color: '#305797',
        fontWeight: 600,
    }

    const fetchNotifications = useCallback(async () => {
        if (!auth) {
            setNotifications([])
            return
        }

        try {
            const response = await apiFetch.get('/notifications/my', {
                params: { limit: 25 }
            })
            setNotifications(response || [])
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        }
    }, [auth])

    // Fetch with configurable limit (used by drawer to fetch more)
    const fetchNotificationsWithLimit = useCallback(async (limit = 25) => {
        if (!auth) {
            setNotifications([])
            return
        }
        try {
            const response = await apiFetch.get('/notifications/my', {
                params: { limit }
            })
            setNotifications(response || [])
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        }
    }, [auth])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.isRead).length,
        [notifications]
    )

    const markAsRead = async (notification) => {
        const routeState = notification?.metadata?.routeState
        if (!notification || notification.isRead) {
            if (notification?.link) {
                navigate(notification.link, routeState ? { state: routeState } : undefined)
            }
            return
        }

        try {
            await apiFetch.patch(`/notifications/${notification._id}/read`)
            setNotifications((prev) =>
                prev.map((item) =>
                    item._id === notification._id ? { ...item, isRead: true } : item
                )
            )
            if (notification.link) {
                navigate(notification.link, routeState ? { state: routeState } : undefined)
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error)
        }
    }

    const [drawerOpen, setDrawerOpen] = useState(false)

    const openDrawer = async () => {
        setPopoverOpen(false)
        setDrawerOpen(true)
        // fetch more notifications for the drawer
        await fetchNotificationsWithLimit(200)
    }

    const closeDrawer = () => setDrawerOpen(false)

    const markAllAsRead = async () => {
        try {
            const unread = notifications.filter((n) => !n.isRead)
            if (unread.length === 0) {
                notification.info({
                    message: 'No Unread Notifications',
                    description: 'All your notifications are already marked as read.'
                })
                return
            }

            await Promise.all(unread.map((n) => apiFetch.patch(`/notifications/${n._id}/read`).catch((e) => {
                console.error('Failed to mark notification read:', n._id, e)
            })))

            setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
            notification.success({ message: 'All Notifications Marked as Read' })
        } catch (error) {
            console.error('Failed to mark all as read:', error)
            notification.error({ message: 'Failed to Mark All as Read' })
        }
    }

    const notificationMenu = (
        <div className="notification-panel">
            <div className="notification-panel-header" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Typography.Text className="notification-panel-title">Notifications</Typography.Text>
                    <Badge count={unreadCount} overflowCount={99} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        size="small"
                        shape="round"
                        style={notificationActionButtonStyle}
                        onClick={markAllAsRead}
                    >
                        Mark all as read
                    </Button>
                    <Button
                        size="small"
                        shape="round"
                        style={notificationSecondaryButtonStyle}
                        onClick={openDrawer}
                    >
                        See all
                    </Button>
                </div>
            </div>
            {notifications.length === 0 ? (
                <div style={{ padding: '16px' }}>
                    <Empty description="No notifications yet" />
                </div>
            ) : (
                <List
                    className="notification-list"
                    dataSource={notifications}
                    renderItem={(item) => (
                        <List.Item
                            className="notification-item"
                            onClick={() => markAsRead(item)}
                        >
                            <div className={`notification-dot${item.isRead ? ' notification-dot--read' : ''}`} />
                            <div>
                                <div className="notification-title">{item.title}</div>
                                <div className="notification-meta">{item.message}</div>
                                <div className="notification-time">
                                    {new Date(item.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </List.Item>
                    )}
                />
            )}
        </div>
    )

    return (
        <>
            <Popover
                content={notificationMenu}
                trigger="click"
                placement="bottomRight"
                className="notification-dropdown"
                open={popoverOpen}
                onOpenChange={(open) => {
                    setPopoverOpen(open)
                    if (open) fetchNotifications()
                }}
            >
                <span>
                    <Button className="notification-bell" type="text">
                        <Badge count={unreadCount} size="small">
                            <BellOutlined />
                        </Badge>
                    </Button>
                </span>
            </Popover>

            <Drawer
                title={`All Notifications (${notifications.length})`}
                placement="right"
                width={420}
                onClose={closeDrawer}
                open={drawerOpen}
            >
                {notifications.length === 0 ? (
                    <Empty description="No notifications yet" />
                ) : (
                    <List
                        dataSource={notifications}
                        renderItem={(item) => (
                            <List.Item
                                style={{ cursor: 'pointer', opacity: item.isRead ? 0.6 : 1 }}
                                onClick={() => markAsRead(item)}
                            >
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div className={`notification-dot${item.isRead ? ' notification-dot--read' : ''}`} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                                        <div style={{ color: '#666' }}>{item.message}</div>
                                        <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>{new Date(item.createdAt).toLocaleString()}</div>
                                    </div>
                                </div>
                            </List.Item>
                        )}
                    />
                )}
            </Drawer>
        </>
    )
}
