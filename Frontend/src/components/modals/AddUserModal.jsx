import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Select, message } from 'antd';
import '../../style/components/modals/addusermodal.css';
import apiFetch from '../../config/fetchConfig';

export default function AddUserModal({ isOpen, onClose, roleToAdd, refreshData }) {
    const [loading, setLoading] = useState(false);
    const [values, setValues] = useState({
        role: roleToAdd || 'User',
        username: '',
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState({
        role: '',
        username: '',
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            const nextRole = roleToAdd || 'User';
            setValues({
                role: nextRole,
                username: '',
                firstname: '',
                lastname: '',
                email: '',
                phone: '',
                password: '',
                confirmPassword: ''
            });
            setError({
                role: '',
                username: '',
                firstname: '',
                lastname: '',
                email: '',
                phone: '',
                password: '',
                confirmPassword: ''
            });
        }
    }, [isOpen, roleToAdd]);

    //proper casing function, first letter is capitalized for each name
    const toProperCase = (value) =>
        value
            .toLowerCase()
            .split(" ")
            .map(word =>
                word
                    .split("-")
                    .map(
                        part =>
                            part.charAt(0).toUpperCase() + part.slice(1)
                    )
                    .join("-")
            )
            .join(" ");

    //input validations (same as SignupModal)
    const validate = (field, value, currentValues = values) => {
        if (field === "role") {
            if (value === "") return "Role is required.";
        }
        if (field === "username") {
            if (value === "") return "Username is required.";
            if (value.length < 8) return "Username must be at least 8 characters";
        }
        if (field === "firstname") {
            if (value === "") return "First name is required.";
            if (value.length < 2) return "First name must be at least 2 characters.";
            if (/[ ]$/.test(value)) return "First name must not end with a space.";
        }
        if (field === "lastname") {
            if (value === "") return "Last name is required.";
            if (value.length < 2) return "Last name must be at least 2 characters.";
            if (/[ -]$/.test(value)) return "Last name must not end with a space or dash.";
        }
        if (field === "email") {
            if (value === "") return "Email is required.";
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return "Invalid Email.";
        }
        if (field === "phone") {
            if (value === "") return "Phone is required.";
            if (value.length < 12) return "Phone must be 10 digits";
            if (value.slice(0, 1) !== "8" && value.slice(0, 1) !== "9") return "Phone number must start with 8 or 9";
        }
        if (field === "password") {
            if (currentValues.role === 'Admin') return "";
            if (value === "") return "Password is required.";
            if (value.length < 8) return "Password must be at least 8 characters.";
            if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter.";
            if (!/[0-9]/.test(value)) return "Password must contain at least one number.";
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Password must contain at least one special character.";
        }
        if (field === "confirmPassword") {
            if (currentValues.role === 'Admin') return "";
            if (value === "") return "Confirm Password is required.";
            if (value !== currentValues.password) return "Passwords do not match";
        }
        return "";
    };

    //handles input changes and the validations
    const valueHandler = (field, value) => {
        const updatedValues = { ...values, [field]: value };
        setValues(updatedValues);
        setError({ ...error, [field]: validate(field, value, updatedValues) });
    };

    //if role is changed to Admin, remove password fields
    const handleRoleChange = (roleValue) => {
        const updatedValues = {
            ...values,
            role: roleValue,
            ...(roleValue === 'Admin' ? { password: '', confirmPassword: '' } : {})
        };
        setValues(updatedValues);
        setError({
            ...error,
            role: validate('role', roleValue, updatedValues),
            password: roleValue === 'Admin' ? '' : error.password,
            confirmPassword: roleValue === 'Admin' ? '' : error.confirmPassword
        });
    };

    //add user
    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...values };
            if (payload.role === 'Admin') {
                delete payload.password;
                delete payload.confirmPassword;
            }

            await apiFetch.post('/user/createUsers', payload, { withCredentials: true });

            message.success(`${values.role} created successfully!`);
            setValues({
                role: roleToAdd || 'User',
                username: '',
                firstname: '',
                lastname: '',
                email: '',
                phone: '',
                password: '',
                confirmPassword: ''
            });
            refreshData(); // Refresh the table
            onClose(); // Close modal
        } catch (err) {
            const errorMsg = err.data?.message || err.data?.error || "Failed to create user";
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // validate the fields before submitting
    const validateAll = () => {
        const fields = ['role', 'username', 'firstname', 'lastname', 'email', 'phone'];
        if (values.role !== 'Admin') {
            fields.push('password', 'confirmPassword');
        }
        const nextErrors = { ...error };
        let hasError = false;

        fields.forEach((field) => {
            const msg = validate(field, values[field], values);
            nextErrors[field] = msg;
            if (msg) hasError = true;
        });

        setError(nextErrors);
        return !hasError;
    };

    // form submit handler
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateAll()) return;
        handleCreate(e);
    };

    return (
        <Modal
            className="adduser-modal"
            title={null}
            open={isOpen}
            onCancel={onClose}
            footer={null}
            destroyOnClose
        >
            <div className="adduser-container">
                <h2 className="adduser-title">Add New {values.role}</h2>
                <p className="adduser-subtitle">Fill out the details below to create a new {values.role?.toLowerCase()}.</p>

                <form className="adduser-form" onSubmit={handleSubmit}>
                    <div className="adduser-field">
                        <label className="adduser-label">Role</label>
                        <Select
                            value={values.role}
                            className="adduser-input adduser-select"
                            onChange={handleRoleChange}
                            options={[
                                { value: 'Admin', label: 'Admin' },
                                { value: 'User', label: 'User' }
                            ]}
                        />
                        <p className="adduser-error">{error.role}</p>
                    </div>

                    <div className="adduser-field">
                        <label className="adduser-label" htmlFor="username">Username</label>
                        <Input
                            id="username"
                            className="adduser-input"
                            value={values.username}
                            status={error.username ? 'error' : ''}
                            maxLength={20}
                            onChange={(e) => valueHandler('username', e.target.value)}
                            onKeyDown={(e) => {
                                if (!/^[A-Za-z0-9]+$/.test(e.key) || (e.key === " " && e.key !== "Backspace")) {
                                    e.preventDefault();
                                }
                            }}
                            autoComplete="off"
                            required
                        />
                        <p className="adduser-error">{error.username}</p>
                    </div>

                    <div className="adduser-row">
                        <div className="adduser-col">
                            <label className="adduser-label" htmlFor="firstname">First Name</label>
                            <Input
                                id="firstname"
                                className="adduser-input"
                                value={values.firstname}
                                status={error.firstname ? 'error' : ''}
                                maxLength={20}
                                onChange={(e) => valueHandler('firstname', toProperCase(e.target.value))}
                                onKeyDown={(e) => {
                                    const value = e.target.value;
                                    if (e.key === " " && value.length === 0) { e.preventDefault(); return; }
                                    if (e.key === " " && value.endsWith(" ")) { e.preventDefault(); return; }

                                    if (
                                        !/^[A-Za-z ]$/.test(e.key) &&
                                        e.key !== "Backspace" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight"
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                                autoComplete="off"
                                required
                            />
                            <p className="adduser-error">{error.firstname}</p>
                        </div>

                        <div className="adduser-col">
                            <label className="adduser-label" htmlFor="lastname">Last Name</label>
                            <Input
                                id="lastname"
                                className="adduser-input"
                                value={values.lastname}
                                status={error.lastname ? 'error' : ''}
                                maxLength={20}
                                onChange={(e) => valueHandler('lastname', toProperCase(e.target.value))}
                                onKeyDown={(e) => {
                                    const value = e.target.value;
                                    if ((e.key === " " || e.key === "-") && value.length === 0) { e.preventDefault(); return; }
                                    if (e.key === " " && value.endsWith(" ")) { e.preventDefault(); return; }
                                    if (e.key === "-" && value.endsWith("-")) { e.preventDefault(); return; }
                                    if (e.key === " " && value.endsWith("-")) { e.preventDefault(); return; }
                                    if (e.key === "-" && value.endsWith(" ")) { e.preventDefault(); return; }
                                    if (
                                        !/^[A-Za-z -]$/.test(e.key) &&
                                        e.key !== "Backspace" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight"
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                                autoComplete="off"
                                required
                            />
                            <p className="adduser-error">{error.lastname}</p>
                        </div>
                    </div>

                    <div className="adduser-field">
                        <label className="adduser-label" htmlFor="email">Email</label>
                        <Input
                            id="email"
                            className="adduser-input"
                            value={values.email}
                            status={error.email ? 'error' : ''}
                            maxLength={40}
                            onChange={(e) => valueHandler('email', e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault();
                                }
                            }}
                            autoComplete="off"
                            required
                        />
                        <p className="adduser-error">{error.email}</p>
                    </div>

                    <div className="adduser-field">
                        <label className="adduser-label" htmlFor="phone">Phone Number</label>
                        <Input
                            id="phone"
                            className="adduser-input"
                            addonBefore="+63"
                            value={values.phone}
                            status={error.phone ? 'error' : ''}
                            maxLength={12}
                            onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, "");

                                let formatted = "";
                                if (value.length > 0) formatted += value.slice(0, 3);
                                if (value.length >= 4) formatted += " " + value.slice(3, 6);
                                if (value.length >= 7) formatted += " " + value.slice(6, 10);

                                valueHandler('phone', formatted);
                            }}
                            onKeyDown={(e) => {
                                if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                    e.preventDefault();
                                }
                            }}
                            autoComplete="off"
                            required
                        />
                        <p className="adduser-error">{error.phone}</p>
                    </div>

                    {values.role !== 'Admin' && (
                        <>
                            <div className="adduser-field">
                                <label className="adduser-label" htmlFor="password">Password</label>
                                <Input.Password
                                    id="password"
                                    className="adduser-input"
                                    value={values.password}
                                    status={error.password ? 'error' : ''}
                                    maxLength={20}
                                    onChange={(e) => valueHandler('password', e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === " " && e.key !== "Backspace") {
                                            e.preventDefault();
                                        }
                                    }}
                                    autoComplete="off"
                                    required
                                />
                                <p className="adduser-error">{error.password}</p>
                            </div>

                            <div className="adduser-field">
                                <label className="adduser-label" htmlFor="confirmPassword">Confirm Password</label>
                                <Input.Password
                                    id="confirmPassword"
                                    className="adduser-input"
                                    value={values.confirmPassword}
                                    status={error.confirmPassword ? 'error' : ''}
                                    maxLength={20}
                                    onChange={(e) => valueHandler('confirmPassword', e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === " " && e.key !== "Backspace") {
                                            e.preventDefault();
                                        }
                                    }}
                                    autoComplete="off"
                                    required
                                />
                                <p className="adduser-error">{error.confirmPassword}</p>
                            </div>
                        </>
                    )}

                    <div className="adduser-actions">
                        <Button className="adduser-cancel-btn" onClick={onClose}>Cancel</Button>
                        <Button className="adduser-submit-btn" type="primary" htmlType="submit" loading={loading}>
                            Create {values.role}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}