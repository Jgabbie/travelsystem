import React, { useState, useEffect, useRef } from 'react'
import { Input, Button, message, Spin, Card, Space, Rate } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import '../style/profilepage.css'
import axiosInstance from '../config/axiosConfig';
import TopNavUser from '../components/TopNavUser';

export default function ProfilePage() {
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

    const recentReviews = [
        {
            _id: 'rev-1',
            title: 'El Nido Island Hopping',
            date: 'Jan 22, 2026',
            snippet: 'Amazing tour guides and crystal-clear water. Highly recommended!',
            rating: 5
        },
        {
            _id: 'rev-2',
            title: 'Baguio City Weekend',
            date: 'Jan 10, 2026',
            snippet: 'Cool weather, great food, and smooth booking experience.',
            rating: 4
        },
        {
            _id: 'rev-3',
            title: 'Bohol Countryside Tour',
            date: 'Dec 28, 2025',
            snippet: 'Loved the Chocolate Hills and river cruise. Worth every peso.',
            rating: 5
        }
    ]

    const recentBookings = [
        {
            _id: 'book-1',
            title: 'Cebu City Heritage Tour',
            date: 'Feb 1, 2026',
            status: 'Confirmed',
            amount: '₱3,500',
            reference: 'BK-10231'
        },
        {
            _id: 'book-2',
            title: 'Siargao Surf Adventure',
            date: 'Jan 18, 2026',
            status: 'Pending',
            amount: '₱6,200',
            reference: 'BK-10189'
        },
        {
            _id: 'book-3',
            title: 'Vigan Day Trip',
            date: 'Dec 30, 2025',
            status: 'Completed',
            amount: '₱2,400',
            reference: 'BK-10102'
        }
    ]

    //proper case function
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

    //input validations
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
            const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com)$/;
            if (value === "") return "Email is required.";
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return "Invalid Email.";
            if (!emailRegex.test(value)) {
                return "Please use a valid email domain (e.g. gmail.com).";
            }
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
    // Fetch user data on component mount
    useEffect(() => {
        fetchUserData()
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

    const handleEdit = () => {
        setEditing(true)
    }

    const handleCancel = () => {
        setEditing(false)
        // Reset form to previous values
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
        <div className="profile-page">
            <TopNavUser />

            <div className="profile-container">
                <div className="profile-content">
                    <div className="profile-side-column">
                        <Card
                            className="profile-side-card"
                            title={<h3>My Recent Bookings</h3>}
                        >
                            {recentBookings.length === 0 ? (
                                <p className="profile-empty-text">No bookings yet.</p>
                            ) : (
                                <div className="profile-booking-list">
                                    {recentBookings.map((booking, index) => (
                                        <div className="profile-booking-item" key={booking?._id || index}>
                                            <div className="profile-booking-header">
                                                <div>
                                                    <p className="profile-booking-title">{booking?.title || 'Untitled Booking'}</p>
                                                    <p className="profile-booking-meta">{booking?.date || 'Recently'}</p>
                                                </div>
                                                <span className={`profile-booking-status profile-booking-${(booking?.status || 'Pending').toLowerCase()}`}>
                                                    {booking?.status || 'Pending'}
                                                </span>
                                            </div>
                                            <p className="profile-booking-details">Ref: {booking?.reference || 'BK-00000'} • {booking?.amount || '₱0'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    <Card
                        className="profile-card"
                        title={
                            <div className="profile-card-header">
                                <h2>My Profile</h2>
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

                            {userData?.role && (
                                <div className="profile-field">
                                    <label className="profile-label">Role</label>
                                    <Input value={userData.role} disabled />
                                </div>
                            )}
                        </div>

                        {userData?.isAccountVerified && (
                            <div className="verification-status">
                                <p>✓ Account Verified</p>
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

                    <div className="profile-side-column">
                        <Card
                            className="profile-side-card"
                            title={<h3>My Recent Reviews</h3>}
                        >
                            {recentReviews.length === 0 ? (
                                <p className="profile-empty-text">No reviews yet.</p>
                            ) : (
                                <div className="profile-review-list">
                                    {recentReviews.map((review, index) => (
                                        <div className="profile-review-item" key={review?._id || index}>
                                            <div>
                                                <p className="profile-review-title">{review?.title || 'Untitled Review'}</p>
                                                <p className="profile-review-meta">{review?.date || 'Recently'}</p>
                                                <Rate className="profile-review-rating" disabled value={review?.rating || 0} />
                                            </div>
                                            <p className="profile-review-snippet">{review?.snippet || review?.comment || 'View review details.'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </div >
    )
}