import React, { useState, useEffect, useRef } from 'react'
import { Input, Button, message, Card, Space, Rate, DatePicker, Select, ConfigProvider, Tag } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined, FileImageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs'
import apiFetch from '../../config/fetchConfig';
import '../../style/client/profilepage.css'
import '../../style/client/userpreference.css';


export default function ProfilePage() {
    const [userData, setUserData] = useState(null)
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
        phone: '',
        homeAddress: '',
        gender: '',
        birthdate: '',
        nationality: ''
    });

    const [moodOptions, setMoodOptions] = useState([]);

    //preferences options
    const tourOptions = [
        'Domestic',
        'International'
    ];

    const [preferences, setPreferences] = useState({
        moods: [],
        tours: []
    });
    const [editingPreferences, setEditingPreferences] = useState(false);

    const togglePreference = (key, value, limit) => {
        setPreferences(prev => {
            const current = prev[key] || [];
            const exists = current.includes(value);

            if (!exists && limit && current.length >= limit) {
                return prev;
            }

            // toggle selection
            const next = exists
                ? current.filter(item => item !== value)
                : [...current, value];

            return { ...prev, [key]: next };
        });
    };

    const savePreferences = async () => {
        try {
            await apiFetch.post('/preferences/save', {
                userId: userData._id,
                moods: preferences.moods,
                tours: preferences.tours
            }, { withCredentials: true });

            setEditingPreferences(false);
            message.success('Preferences saved successfully!');
        } catch (error) {
            console.error('Error saving preferences:', error);
            const errorMsg = error?.data?.message || 'Failed to save preferences';
            message.error(errorMsg);
        }
    };

    const [recentReviews, setRecentReviews] = useState([])
    const [recentBookings, setRecentBookings] = useState([])
    const [isLoading, setIsLoading] = useState(false);

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
    // Fetch user data on component moun

    useEffect(() => {
        const fetchPackageTags = async () => {
            try {
                const response = await apiFetch.get('/package/get-packages-for-users');
                const unique = new Set();
                (response || []).forEach((pkg) => {
                    pkg.packageTags?.forEach((tag) => unique.add(tag));
                });
                setMoodOptions(Array.from(unique));
            } catch (error) {
                setMoodOptions([]);
            }
        };

        const fetchPreferences = async () => {
            try {
                const response = await apiFetch.get("/preferences/me", { withCredentials: true });
                if (response?.preferrences) {
                    const data = response.preferrences;
                    setPreferences({
                        moods: data.moods || [],
                        tours: data.tours || []
                    });

                    console.log("Fetched preferences:", data);
                    console.log("Set preferences state:", preferences);
                }
            } catch (error) {
                console.error('Error fetching preferences:', error);
                setPreferences({ moods: [], tours: [] });
            }
        };

        const fetchUserData = async () => {
            try {
                const response = await apiFetch.get('/user/data', {
                    withCredentials: true
                })

                if (response?.userData) {
                    const data = response
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
                        phone: data.userData.phone,
                        homeAddress: data.userData.homeAddress || '',
                        gender: data.userData.gender || '',
                        birthdate: data.userData.birthdate || '',
                        nationality: data.userData.nationality || ''
                    })
                } else if (response?.status === 401) {
                    message.error('Please login to view your profile')
                } else {
                    message.error('Failed to fetch user data')
                }
            } catch (error) {
                console.error('Error fetching user data:', error)
                message.error('Error fetching profile')
            }
        }

        const fetchRecentBookings = async () => {
            try {
                const response = await apiFetch.get('/booking/my-bookings')
                const bookings = response.map((b) => ({
                    _id: b._id,
                    key: b._id,
                    ref: b.reference || b._id,
                    packageName: b.packageId?.packageName || 'Tour Package',
                    packageType: b.packageId?.packageType?.toUpperCase() || 'Package Type',
                    travelDate: b.travelDate
                        ? dayjs(
                            typeof b.travelDate === 'string'
                                ? b.travelDate.split(' - ')[0]
                                : b.travelDate.startDate || b.travelDate.endDate
                        ).format('MMM D, YYYY')
                        : 'N/A',
                    bookingDate: dayjs(b.createdAt).format('MMM D, YYYY'),
                    travelersCount: b.travelers || {},
                    status: b.status?.charAt(0).toUpperCase() + b.status?.slice(1) || 'No Status',
                }))

                console.log('Fetched bookings:', bookings)

                setRecentBookings(bookings)
            } catch (error) {
                setRecentBookings([])
            }
        }

        const fetchRecentReviews = async () => {
            try {
                const response = await apiFetch.get('/rating/my-ratings')
                const reviews = response.map((r) => ({
                    key: r._id,
                    packageName: r.packageId?.packageName || 'Untitled Review',
                    rating: r.rating || 0,
                    date: dayjs(r.createdAt).format('MMM D, YYYY'),
                    review: r.review
                }))

                setRecentReviews(reviews)
            } catch (error) {
                setRecentReviews([])
            }
        }

        fetchPackageTags();
        fetchUserData();
        fetchRecentBookings();
        fetchRecentReviews();
        fetchPreferences();
    }, [])




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
                phone: userData.phone,
                homeAddress: userData.homeAddress || '',
                gender: userData.gender || '',
                birthdate: userData.birthdate || '',
                nationality: userData.nationality || ''
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

    const handleImageChange = async (event) => {
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

        try {
            const formData = new FormData()
            formData.append("file", file)

            const res = await apiFetch.post(
                "/upload/upload-profile-picture",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                    withCredentials: true
                }
            )

            const imageUrl = res.url

            // save Cloudinary URL
            setProfileImage(imageUrl)

            message.success("Image uploaded successfully!")

        } catch (error) {
            console.error(error)
            message.error("Upload failed")
        }
    }

    // save profile changes
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
            const response = await apiFetch.put('/user/data', {
                firstname: values.firstname,
                lastname: values.lastname,
                email: values.email,
                phone: values.phone,
                profileImage: profileImage || '',
                homeAddress: values.homeAddress,
                gender: values.gender,
                birthdate: values.birthdate,
                nationality: values.nationality
            }, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const data = response
            setUserData(data.userData)
            setProfileImage(
                data.userData?.profileImageUrl ||
                data.userData?.profileImage ||
                data.userData?.avatarUrl ||
                profileImage ||
                ''
            )
            setValues((prev) => ({
                ...prev,
                homeAddress: data.userData?.homeAddress || '',
                gender: data.userData?.gender || '',
                birthdate: data.userData?.birthdate || '',
                nationality: data.userData?.nationality || ''
            }))
            setEditing(false)
            message.success('Profile updated successfully!')
        } catch (error) {
            console.error('Error updating profile:', error)
            const apiMessage = error?.data?.message
            message.error(apiMessage || 'Error updating profile')
        } finally {
            setSaving(false)
        }
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div className="profile-page" >

                {/* profile */}
                <div className="profile-container" style={{ marginBottom: 40 }}>
                    <div className="profile-content">
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
                                            type="primary"
                                            icon={<FileImageOutlined />}
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

                                <div className="profile-field">
                                    <label className="profile-label">Home Address</label>
                                    <Input
                                        placeholder="Enter your home address"
                                        allowClear
                                        value={values.homeAddress}
                                        disabled={!editing}
                                        onChange={(e) => valueHandler('homeAddress', e.target.value)}
                                    />
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Nationality</label>
                                    <Input
                                        placeholder="Enter your nationality"
                                        allowClear
                                        value={values.nationality}
                                        disabled={!editing}
                                        onChange={(e) => valueHandler('nationality', e.target.value)}
                                    />
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Gender</label>
                                    <Select
                                        placeholder="Select gender"
                                        value={values.gender || undefined}
                                        disabled={!editing}
                                        onChange={(value) => valueHandler('gender', value || '')}
                                        options={[
                                            { value: 'Male', label: 'Male' },
                                            { value: 'Female', label: 'Female' },
                                            { value: 'Other', label: 'Other' },
                                            { value: 'Prefer not to say', label: 'Prefer not to say' }
                                        ]}
                                        allowClear
                                    />
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Birthdate</label>
                                    <DatePicker
                                        placeholder="Select birthdate"
                                        value={values.birthdate ? dayjs(values.birthdate) : null}
                                        disabled={!editing}
                                        onChange={(date) =>
                                            valueHandler('birthdate', date ? date.format('YYYY-MM-DD') : '')
                                        }
                                        format="YYYY-MM-DD"
                                        allowClear
                                        style={{ width: '100%' }}
                                    />
                                </div>




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
                                        onClick={handleSave}
                                    >
                                        Save Changes
                                    </Button>
                                    <Button
                                        type="primary"
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


                        <Card
                            className="profile-card"
                            title=
                            {
                                <div className='profile-card-header'>
                                    <h2>Preferences</h2>
                                    <Button
                                        type="primary"
                                        onClick={() => setEditingPreferences(true)}
                                        icon={<EditOutlined />}
                                        disabled={editingPreferences}
                                        className='profile-action-button'
                                    >
                                        Edit Preferences
                                    </Button>
                                </div>

                            }
                            style={{ marginTop: '20px' }}
                        >
                            <div className="preference-section">

                                {/* MOODS */}
                                <div className="preference-block">
                                    <h3>What are you in the mood for?</h3>
                                    <p>Choose up to 3</p>

                                    <div className="preference-chip-grid">
                                        {moodOptions.map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                disabled={!editingPreferences}
                                                className={
                                                    preferences.moods.includes(option)
                                                        ? 'preference-chip is-selected'
                                                        : 'preference-chip'
                                                }
                                                onClick={() => togglePreference('moods', option, 3)}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* TOURS */}
                                <div className="preference-block" style={{ marginTop: '20px' }}>
                                    <h3>What type of tour do you like?</h3>

                                    <div className="preference-chip-grid">
                                        {tourOptions.map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                disabled={!editingPreferences}
                                                className={
                                                    preferences.tours.includes(option)
                                                        ? 'preference-chip is-selected'
                                                        : 'preference-chip'
                                                }
                                                onClick={() => togglePreference('tours', option)}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>


                                {editingPreferences && (
                                    <div style={{ marginTop: '20px' }}>
                                        <Button
                                            type="primary"
                                            onClick={savePreferences}
                                            icon={<SaveOutlined />}
                                            className="profile-action-button"
                                        >
                                            Save Preferences
                                        </Button>

                                        <Button
                                            type="primary"
                                            style={{ marginLeft: '10px' }}
                                            onClick={() => setEditingPreferences(false)}
                                            icon={<CloseOutlined />}
                                            className="profile-cancel-button"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                )}

                            </div>
                        </Card>

                    </div>




                    {/* recent bookings and reviews */}
                    <div className="profile-side-column">
                        <Card
                            className="profile-side-card"
                            title={<h3>My Recent Reviews</h3>}
                        >
                            {recentReviews.length === 0 ? (
                                <p className="profile-empty-text">No reviews yet.</p>
                            ) : (
                                <div className="profile-review-list">
                                    {recentReviews.slice(0, 3).map((review, index) => (
                                        <div className="profile-review-item" key={review?._id || index}>
                                            <div>
                                                <p className="profile-review-title">{review?.packageName || 'Untitled Review'}</p>
                                                <p className="profile-review-meta">{review?.date || 'Recently'}</p>
                                                <Rate className="profile-review-rating" disabled value={review?.rating || 0} />
                                            </div>
                                            <p className="profile-review-snippet">{review?.review || 'View review details.'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        <Card
                            className="profile-side-card"
                            title={<h3>My Recent Bookings</h3>}
                        >
                            {recentBookings.length === 0 ? (
                                <p className="profile-empty-text">No bookings yet.</p>
                            ) : (
                                <div className="profile-booking-list">
                                    {recentBookings.slice(0, 3).map((booking, index) => (
                                        <div className="profile-booking-item" key={booking?._id || index}>
                                            <div className="profile-booking-header">
                                                <div>
                                                    <p className="profile-booking-title">{booking?.packageName || 'Untitled Booking'}</p>
                                                    <p className="profile-booking-meta">{booking?.bookingDate || 'Recently'}</p>
                                                </div>

                                                <Tag color={
                                                    booking?.status === 'Fully Paid' ? 'green' :
                                                        booking?.status === 'Cancelled' ? 'blue' :
                                                            booking?.status === 'Not Paid' ? 'red' :
                                                                'orange'
                                                }>
                                                    {booking?.status || 'Pending'}
                                                </Tag>

                                            </div>
                                            <p className="profile-booking-details">Reference No. {booking?.ref || 'BK-00000'} • {booking?.packageType}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div >
        </ConfigProvider>
    )
}