import React, { useState, useEffect } from 'react'
import { Input, Button, Form, message, Spin, Card, Space, Modal } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import '../style/profilepage.css'

export default function ProfilePage() {
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()

    // Fetch user data on component mount
    useEffect(() => {
        fetchUserData()
    }, [])

    const fetchUserData = async () => {
        try {
            setLoading(true)
            const response = await fetch('http://localhost:8000/api/user/data', {
                method: 'GET',
                credentials: 'include'
            })

            if (response.ok) {
                const data = await response.json()
                setUserData(data.userData)
                form.setFieldsValue({
                    username: data.userData.username,
                    firstname: data.userData.firstname,
                    lastname: data.userData.lastname,
                    email: data.userData.email,
                    phone: data.userData.phone
                })
            } else if (response.status === 401) {
                message.error('Please login to view your profile')
            } else {
                message.error('Failed to fetch user data')
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
            message.error('Error loading profile')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = () => {
        setEditing(true)
    }

    const handleCancel = () => {
        setEditing(false)
        // Reset form to previous values
        if (userData) {
            form.setFieldsValue({
                username: userData.username,
                firstname: userData.firstname,
                lastname: userData.lastname,
                email: userData.email,
                phone: userData.phone
            })
        }
    }

    const handleSave = async (values) => {
        try {
            setSaving(true)
            const response = await fetch('http://localhost:8000/api/user/data', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstname: values.firstname,
                    lastname: values.lastname,
                    email: values.email,
                    phone: values.phone
                })
            })

            if (response.ok) {
                const data = await response.json()
                setUserData(data.userData)
                setEditing(false)
                message.success('Profile updated successfully!')
            } else if (response.status === 400) {
                const error = await response.json()
                message.error(error.message)
            } else if (response.status === 401) {
                message.error('Session expired. Please login again')
            } else {
                message.error('Failed to update profile')
            }
        } catch (error) {
            console.error('Error updating profile:', error)
            message.error('Error updating profile')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="profile-container">
                <Spin size="large" tip="Loading profile..." />
            </div>
        )
    }

    if (!userData) {
        return (
            <div className="profile-container">
                <Card className="profile-card">
                    <p>Unable to load profile. Please try again.</p>
                </Card>
            </div>
        )
    }

    return (
        <div className="profile-container">
            <Card
                className="profile-card"
                title={
                    <div className="profile-card-header">
                        <h2>My Profile</h2>
                        {!editing && (
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={handleEdit}
                            >
                                Edit Profile
                            </Button>
                        )}
                    </div>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    disabled={!editing}
                    className="profile-form"
                >
                    <Form.Item
                        label="Username"
                        name="username"
                        rules={[{ required: true, message: 'Username is required' }]}
                    >
                        <Input
                            placeholder="Username"
                            disabled
                        />
                    </Form.Item>

                    <Form.Item
                        label="First Name"
                        name="firstname"
                        rules={[
                            { required: true, message: 'First name is required' },
                            { min: 2, message: 'First name must be at least 2 characters' }
                        ]}
                    >
                        <Input
                            placeholder="Enter your first name"
                            allowClear
                        />
                    </Form.Item>

                    <Form.Item
                        label="Last Name"
                        name="lastname"
                        rules={[
                            { required: true, message: 'Last name is required' },
                            { min: 2, message: 'Last name must be at least 2 characters' }
                        ]}
                    >
                        <Input
                            placeholder="Enter your last name"
                            allowClear
                        />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Email is required' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}
                    >
                        <Input
                            placeholder="Enter your email"
                            type="email"
                            allowClear
                        />
                    </Form.Item>

                    <Form.Item
                        label="Phone"
                        name="phone"
                        rules={[
                            { required: true, message: 'Phone number is required' },
                            { pattern: /^[0-9\-\+\s()]*$/, message: 'Please enter a valid phone number' }
                        ]}
                    >
                        <Input
                            placeholder="Enter your phone number"
                            allowClear
                        />
                    </Form.Item>

                    {userData.role && (
                        <Form.Item label="Role">
                            <Input
                                value={userData.role}
                                disabled
                            />
                        </Form.Item>
                    )}

                    {userData.isAccountVerified && (
                        <div className="verification-status">
                            <p>✓ Account Verified</p>
                        </div>
                    )}

                    {editing && (
                        <Form.Item>
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    loading={saving}
                                    htmlType="submit"
                                >
                                    Save Changes
                                </Button>
                                <Button
                                    icon={<CloseOutlined />}
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                            </Space>
                        </Form.Item>
                    )}
                </Form>
            </Card>
        </div>
    )
}