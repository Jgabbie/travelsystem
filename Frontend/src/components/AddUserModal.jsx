import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Form, message, Select } from 'antd';
import axios from 'axios';

export default function AddUserModal({ isOpen, onClose, roleToAdd, refreshData }) {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            form.resetFields();
        }
    }, [isOpen, form]);

    const handleCreate = async (values) => {
        setLoading(true);
        try {
            // We include the role passed from the parent (Admin or User)
            const payload = { ...values, role: roleToAdd };
            
            await axios.post('http://localhost:8000/api/user/createUsers', payload, {
                withCredentials: true
            });

            message.success(`${roleToAdd} created successfully!`);
            form.resetFields();
            refreshData(); // Refresh the table
            onClose(); // Close modal
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to create user";
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={`Add New ${roleToAdd}`}
            open={isOpen}
            onCancel={onClose}
            footer={null}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleCreate}
                initialValues={{ role: roleToAdd }}
            >
                <Form.Item
                    name="username"
                    label="Username"
                    rules={[{ required: true, message: 'Please input username' }, { min: 8, message: 'Min 8 chars' }]}
                >
                    <Input placeholder="Username" />
                </Form.Item>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <Form.Item
                        name="firstname"
                        label="First Name"
                        style={{ flex: 1 }}
                        rules={[{ required: true }]}
                    >
                        <Input placeholder="First Name" />
                    </Form.Item>
                    <Form.Item
                        name="lastname"
                        label="Last Name"
                        style={{ flex: 1 }}
                        rules={[{ required: true }]}
                    >
                        <Input placeholder="Last Name" />
                    </Form.Item>
                </div>

                <Form.Item
                    name="email"
                    label="Email"
                    rules={[{ required: true, type: 'email' }]}
                >
                    <Input placeholder="Email" />
                </Form.Item>

                <Form.Item
                    name="phone"
                    label="Phone"
                    rules={[{ required: true, len: 11, message: 'Must be 11 digits' }]}
                >
                    <Input placeholder="09xxxxxxxxx" />
                </Form.Item>

                <Form.Item
                    name="password"
                    label="Password"
                    rules={[{ required: true, min: 8, message: 'Min 8 chars' }]}
                >
                    <Input.Password placeholder="Password" />
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    label="Confirm Password"
                    dependencies={['password']}
                    rules={[
                        { required: true },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Passwords do not match!'));
                            },
                        }),
                    ]}
                >
                    <Input.Password placeholder="Confirm Password" />
                </Form.Item>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Create {roleToAdd}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}