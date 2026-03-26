import React, { useState, useEffect, useRef } from 'react'
import { Input, Button, message, Spin, Card, Space, ConfigProvider } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import '../../style/client/profilepage.css'
import axiosInstance from '../../config/axiosConfig';

export default function AdminProfile() {
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [profileImage, setProfileImage] = useState('')
    const fileInputRef = useRef(null)
    const [error, setError] = useState({
        firstname: '',
        lastname: '',
        email: '',
        phone: ''
    })
    const [values, setValues] = useState({
        username: '',
        firstname: '',
        lastname: '',
        email: '',
        phone: ''
    });

    const [recentActions, setRecentActions] = useState([])
    const [pendingApprovals, setPendingApprovals] = useState([])

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

    const validate = (field, value) => {
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
        return "";
    };

    const valueHandler = (field, value) => {
        setValues(prev => ({ ...prev, [field]: value }));
        setError(prev => ({ ...prev, [field]: validate(field, value) }));
    };

    const getInitials = () => {
        const first = values.firstname?.trim() || userData?.firstname?.trim() || ''
        const last = values.lastname?.trim() || userData?.lastname?.trim() || ''
        const fallback = values.username?.trim() || userData?.username?.trim() || ''

        if (first || last) {
            const firstInitial = first ? first[0].toUpperCase() : ''
            const lastInitial = last ? last[0].toUpperCase() : ''
            return `${firstInitial}${lastInitial}` || 'U'
        }
        return fallback ? fallback[0].toUpperCase() : 'U'
    }

    useEffect(() => {
        fetchUserData()
        fetchRecentActions()
        fetchPendingApprovals()
    }, [])

    const fetchUserData = async () => {
        try {
            setLoading(true)
            const response = await axiosInstance.get('/user/data', {
                withCredentials: true
            })

            if (response.status === 200) {
                const data = response.data
                setUserData(data.userData)
                setProfileImage(
                    data.userData?.profileImageUrl ||
                    data.userData?.profileImage ||
                    data.userData?.avatarUrl ||
                    ''
                )
                setValues({
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

    const fetchRecentActions = async () => {
        try {
            const response = await axiosInstance.get('/logs/get-audits')
            const audits = Array.isArray(response.data) ? response.data : []
            const recent = audits.slice(0, 3).map((audit) => ({
                _id: audit?._id,
                title: audit?.action || 'Admin action',
                date: audit?.timestamp
                    ? new Date(audit.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })
                    : 'Recently',
            }))
            setRecentActions(recent)
        } catch (error) {
            console.error('Failed to fetch audit actions:', error)
            setRecentActions([])
        }
    }

    const fetchPendingApprovals = async () => {
        try {
            const response = await axiosInstance.get('/booking/all-bookings')
            const bookings = Array.isArray(response.data) ? response.data : [] //just make sure that it return an array, if not then empty array to avoid crashes
            const pending = bookings
                .filter((booking) => (booking.status || '').toLowerCase() === 'pending')
                .slice(0, 3) //just get 3 recent pending approvals
                .map((booking) => { //get necessary details for display
                    const details = booking.bookingDetails || {}
                    const travelDate = details.travelDate
                    const packageType = details.packageType || ''
                    const date = travelDate
                        ? new Date(travelDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })
                        : 'Recently' //convert date to something like "Sep 15, 2023" or show "Recently" if no date available

                    return { //create new object with necessary details for display
                        _id: booking._id,
                        title: details.packageName || 'Package',
                        date,
                        status: 'Pending',
                        packageType: packageType,
                        reference: booking.reference || 'BK-00000'
                    }
                })
            setPendingApprovals(pending) //set state with the 3 recent pending approvals
        } catch (error) {
            console.error('Failed to fetch pending approvals:', error)
            setPendingApprovals([])
        }
    }

    const handleEdit = () => {
        setEditing(true)
    }

    const handleCancel = () => {
        setEditing(false)
        if (userData) {
            setValues({
                username: userData.username,
                firstname: userData.firstname,
                lastname: userData.lastname,
                email: userData.email,
                phone: userData.phone
            })
            setProfileImage(
                userData?.profileImageUrl ||
                userData?.profileImage ||
                userData?.avatarUrl ||
                ''
            )
        }
        setError({
            firstname: '',
            lastname: '',
            email: '',
            phone: ''
        })
    }

    const handleImageChange = (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            message.error('Please select a valid image file.')
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            message.error('Image must be 2MB or less.')
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            setProfileImage(reader.result?.toString() || '')
        }
        reader.readAsDataURL(file)
    }

    const handleSave = async () => {
        const nextErrors = {
            firstname: validate('firstname', values.firstname),
            lastname: validate('lastname', values.lastname),
            email: validate('email', values.email),
            phone: validate('phone', values.phone)
        }
        setError(nextErrors)
        const hasErrors = Object.values(nextErrors).some(Boolean)
        if (hasErrors) {
            message.error('Please fix the highlighted fields before saving.')
            return
        }
        try {
            setSaving(true)
            const response = await axiosInstance.put('/user/data', {
                firstname: values.firstname,
                lastname: values.lastname,
                email: values.email,
                phone: values.phone,
                profileImage: profileImage || ''
            }, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const data = response.data
            setUserData(data.userData)
            setProfileImage(
                data.userData?.profileImageUrl ||
                data.userData?.profileImage ||
                data.userData?.avatarUrl ||
                profileImage ||
                ''
            )
            setEditing(false)
            message.success('Profile updated successfully!')
        } catch (error) {
            console.error('Error updating profile:', error)
            const apiMessage = error?.response?.data?.message
            message.error(apiMessage || 'Error updating profile')
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
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797'
                }
            }}
        >
            <div className="profile-page admin-profile-page">
                <div className="profile-container" style={{ marginBottom: 40 }}>
                    <div className="profile-content">
                        <Card
                            className="profile-card"
                            title={
                                <div className="profile-card-header">
                                    <h2>Admin Profile</h2>
                                    {!editing && (
                                        <Button
                                            type="primary"
                                            className="profile-action-button"
                                            icon={<EditOutlined />}
                                            onClick={handleEdit}
                                        >
                                            Edit Profile
                                        </Button>
                                    )}
                                </div>
                            }
                        >
                            <div className="profile-avatar-section">
                                <div className="profile-avatar">
                                    {profileImage ? (
                                        <img src={profileImage} alt="Profile" />
                                    ) : (
                                        <div className="profile-avatar-placeholder">{getInitials()}</div>
                                    )}
                                </div>
                                {editing && (
                                    <>
                                        <input
                                            ref={fileInputRef}
                                            className="profile-avatar-input"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                        <Button
                                            className="profile-action-button"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Change Photo
                                        </Button>
                                        <p className="profile-avatar-help">PNG/JPG up to 2MB.</p>
                                    </>
                                )}
                            </div>

                            <div className="profile-fields">
                                <div className="profile-field">
                                    <label className="profile-label">Username</label>
                                    <Input
                                        placeholder="Username"
                                        value={values.username}
                                        disabled
                                    />
                                </div>

                                {userData?.role && (
                                    <div className="profile-field">
                                        <label className="profile-label">Role</label>
                                        <Input value={userData.role} disabled />
                                    </div>
                                )}


                                <div className="profile-field">
                                    <label className="profile-label">First Name</label>
                                    <Input
                                        placeholder="Enter your first name"
                                        allowClear
                                        status={error.firstname ? "error" : ""}
                                        value={values.firstname}
                                        disabled={!editing}
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
                                    />
                                    {error.firstname && (
                                        <p className="profile-error-message">{error.firstname}</p>
                                    )}
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Last Name</label>
                                    <Input
                                        placeholder="Enter your last name"
                                        allowClear
                                        status={error.lastname ? "error" : ""}
                                        value={values.lastname}
                                        disabled={!editing}
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
                                    />
                                    {error.lastname && (
                                        <p className="profile-error-message">{error.lastname}</p>
                                    )}
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Email Address</label>
                                    <Input
                                        placeholder="Enter your email"
                                        type="email"
                                        allowClear
                                        status={error.email ? "error" : ""}
                                        value={values.email}
                                        disabled={!editing}
                                        onChange={(e) => valueHandler('email', e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === " " && e.key !== "Backspace") {
                                                e.preventDefault()
                                            }
                                        }}
                                    />
                                    {error.email && (
                                        <p className="profile-error-message">{error.email}</p>
                                    )}
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Phone Number</label>
                                    <Input
                                        placeholder="Enter your phone number"
                                        allowClear
                                        addonBefore="+63"
                                        status={error.phone ? "error" : ""}
                                        value={values.phone}
                                        disabled={!editing}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(/\D/g, "");

                                            let formatted = "";
                                            if (value.length > 0) formatted += value.slice(0, 3);
                                            if (value.length >= 4) formatted += " " + value.slice(3, 6);
                                            if (value.length >= 7) formatted += " " + value.slice(6, 10);

                                            valueHandler("phone", formatted)
                                        }}
                                        onKeyDown={(e) => {
                                            if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                                e.preventDefault()
                                            }
                                        }}
                                    />
                                    {error.phone && (
                                        <p className="profile-error-message">{error.phone}</p>
                                    )}
                                </div>


                            </div>

                            {userData?.isAccountVerified && (
                                <div className="verification-status">
                                    <p>Account Verified</p>
                                </div>
                            )}

                            {editing && (
                                <Space>
                                    <Button
                                        type="primary"
                                        className="profile-action-button"
                                        icon={<SaveOutlined />}
                                        loading={saving}
                                        onClick={handleSave}
                                    >
                                        Save Changes
                                    </Button>
                                    <Button
                                        className="profile-cancel-button"
                                        icon={<CloseOutlined />}
                                        onClick={handleCancel}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                </Space>
                            )}
                        </Card>
                    </div>

                    <div className="profile-side-column">
                        <Card
                            className="profile-side-card"
                            title={<h3>Pending Approvals</h3>}
                        >
                            {pendingApprovals.length === 0 ? (
                                <p className="profile-empty-text">No pending approvals.</p>
                            ) : (
                                <div className="profile-booking-list">
                                    {pendingApprovals.map((booking, index) => (
                                        <div className="profile-booking-item" key={booking?._id || index}>
                                            <div className="profile-booking-header">
                                                <div>
                                                    <p className="profile-booking-title">{booking?.title || 'Untitled Request'}</p>
                                                    <p className="profile-booking-meta">{booking?.date || 'Recently'}</p>
                                                </div>
                                                <span className={`profile-booking-status profile-booking-${(booking?.status || 'Pending').toLowerCase()}`}>
                                                    {booking?.status || 'Pending'}
                                                </span>
                                            </div>
                                            <p className="profile-booking-details">Ref: {booking?.reference || 'BK-00000'} • {booking?.packageType === 'fixed' ? 'Fixed Booking' : 'Customized'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        <Card
                            className="profile-side-card"
                            title={<h3>Recent Admin Actions</h3>}
                        >
                            {recentActions.length === 0 ? (
                                <p className="profile-empty-text">No recent activity.</p>
                            ) : (
                                <div className="profile-review-list">
                                    {recentActions.map((action, index) => (
                                        <div className="profile-review-item" key={action?._id || index}>
                                            <div>
                                                <p className="profile-review-title">{action?.title || 'Untitled Action'}</p>
                                                <p className="profile-review-meta">{action?.date || 'Recently'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    )
}
