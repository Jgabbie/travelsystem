import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, List, Typography, Empty, Popover } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../config/axiosConfig'
import { useAuth } from '../hooks/useAuth'

export default function Notifications() {
    const { auth } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState([])

    const fetchNotifications = useCallback(async () => {
        if (!auth) {
            setNotifications([])
            return
        }

        try {
            const response = await axiosInstance.get('/notifications/my', {
                params: { limit: 25 }
            })
            setNotifications(response.data || [])
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
        if (!notification || notification.isRead) {
            if (notification?.link) {
                navigate(notification.link)
            }
            return
        }

        try {
            await axiosInstance.patch(`/notifications/${notification._id}/read`)
            setNotifications((prev) =>
                prev.map((item) =>
                    item._id === notification._id ? { ...item, isRead: true } : item
                )
            )
            if (notification.link) {
                navigate(notification.link)
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error)
        }
    }

    const notificationMenu = (
        <div className="notification-panel">
            <div className="notification-panel-header">
                <Typography.Text className="notification-panel-title">Notifications</Typography.Text>
                <Badge count={unreadCount} overflowCount={99} />
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
        <Popover
            content={notificationMenu}
            trigger="click"
            placement="bottomRight"
            className="notification-dropdown"
            onOpenChange={(open) => {
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
    )
}
