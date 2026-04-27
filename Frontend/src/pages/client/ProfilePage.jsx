import React, { useState, useEffect, useRef } from 'react'
import { Input, Button, message, Card, Space, Rate, DatePicker, Select, ConfigProvider, Tag, Modal, Spin, Typography } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined, FileImageOutlined, CheckCircleFilled } from '@ant-design/icons';
import dayjs from 'dayjs'
import apiFetch from '../../config/fetchConfig';
import '../../style/client/profilepage.css'
import '../../style/client/userpreference.css';


const { Title, Text } = Typography;


export default function ProfilePage() {
    const [userData, setUserData] = useState(null)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [profileImage, setProfileImage] = useState('')
    const [isUserProfileEdited, setIsUserProfileEdited] = useState(false)
    const [isUserPreferencesEdited, setIsUserPreferencesEdited] = useState(false)

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
        if ((preferences.moods || []).length <= 0 && (preferences.moods || []).length > 3) {
            message.error('Please select up to 3 mood preferences.');
            return;
        }

        if ((preferences.tours || []).length < 1) {
            message.error('Please select at least 1 tour type preference.');
            return;
        }

        try {
            await apiFetch.post('/preferences/save', {
                userId: userData._id,
                moods: preferences.moods,
                tours: preferences.tours
            }, { withCredentials: true });

            setEditingPreferences(false);
            setIsUserPreferencesEdited(true);
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
            if (value.length < 13) return "Phone must be 11 digits";
            if (!/^0[9]/.test(value))
                return "Phone number must start with 09";
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

            console.log('Raw bookings response:', response) // Debug log

            const bookings = response.map((b) => ({
                _id: b.bookingItem,
                key: b.bookingItem,
                ref: b.reference,
                packageName: b.packageName || 'Tour Package',
                packageType: b.packageType?.toUpperCase() || 'Package Type',
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

    useEffect(() => {
        const init = async () => {
            try {
                setIsLoading(true);

                await Promise.all([
                    fetchPackageTags(),
                    fetchUserData(),
                    fetchRecentBookings(),
                    fetchRecentReviews(),
                    fetchPreferences()
                ]);

            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);

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
            setIsUserProfileEdited(true);
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


            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <Spin size="large" description="Loading Profile..." />
                </div>
            ) : (
                <div>
                    <div className="profile-page" >
                        {/* profile */}
                        <header className="profile-header">
                            <h2>Profile Page</h2>
                            <p>
                                View and edit your personal information, manage your preferences, and see your recent activity.
                            </p>
                        </header>
                        <div className="profile-container" style={{ marginBottom: 40 }}>
                            <div className="profile-content">
                                <Card className="profile-summary-card">
                                    <div className="profile-summary-body">
                                        <div className="profile-summary-avatar">
                                            {profileImage ? (
                                                <img src={profileImage} alt="Profile" />
                                            ) : (
                                                <div className="profile-summary-initials">{getInitials()}</div>
                                            )}
                                        </div>
                                        <div className="profile-summary-text">
                                            <h3 className="profile-summary-name">
                                                {values.firstname || values.lastname
                                                    ? `${values.firstname} ${values.lastname}`.trim()
                                                    : values.username || 'User'}
                                            </h3>
                                            <p className="profile-summary-meta">
                                                <span>{userData?.role || 'Traveler'}</span>
                                            </p>
                                            <p className="profile-summary-meta">
                                                {values.homeAddress || values.nationality || 'Location not set'}
                                            </p>
                                        </div>
                                    </div>
                                    {editing && (
                                        <div style={{ marginTop: 16 }}>
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
                                        </div>
                                    )}
                                </Card>

                                <Card className="profile-section-card">
                                    <div className="profile-section-header">
                                        <h3 className="profile-section-title">Personal Information</h3>
                                        {!editing && (
                                            <Button
                                                type="primary"
                                                className="profile-action-button"
                                                icon={<EditOutlined />}
                                                onClick={handleEdit}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                    <div className="profile-section-grid">
                                        <div className="profile-section-item">
                                            <span className="profile-section-label">First Name</span>
                                            {editing ? (
                                                <Input
                                                    placeholder="Enter your first name"
                                                    allowClear
                                                    status={error.firstname ? "error" : ""}
                                                    value={values.firstname}
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
                                            ) : (
                                                <p className="profile-section-value">{values.firstname || 'Not set'}</p>
                                            )}
                                            {error.firstname && (
                                                <p className="profile-error-message">{error.firstname}</p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Last Name</span>
                                            {editing ? (
                                                <Input
                                                    placeholder="Enter your last name"
                                                    allowClear
                                                    status={error.lastname ? "error" : ""}
                                                    value={values.lastname}
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
                                            ) : (
                                                <p className="profile-section-value">{values.lastname || 'Not set'}</p>
                                            )}
                                            {error.lastname && (
                                                <p className="profile-error-message">{error.lastname}</p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Date of Birth</span>
                                            {editing ? (
                                                <DatePicker
                                                    placeholder="Select birthdate"
                                                    value={values.birthdate ? dayjs(values.birthdate) : null}
                                                    onChange={(date) =>
                                                        valueHandler('birthdate', date ? date.format('YYYY-MM-DD') : '')
                                                    }
                                                    format="YYYY-MM-DD"
                                                    allowClear
                                                    style={{ width: '100%' }}
                                                />
                                            ) : (
                                                <p className="profile-section-value">{values.birthdate || 'Not set'}</p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Email Address</span>
                                            {editing ? (
                                                <Input
                                                    placeholder="Enter your email"
                                                    type="email"
                                                    allowClear
                                                    status={error.email ? "error" : ""}
                                                    value={values.email}
                                                    onChange={(e) => valueHandler('email', e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === " " && e.key !== "Backspace") {
                                                            e.preventDefault()
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <p className="profile-section-value">{values.email || 'Not set'}</p>
                                            )}
                                            {error.email && (
                                                <p className="profile-error-message">{error.email}</p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Phone Number</span>
                                            {editing ? (
                                                <Input
                                                    maxLength={13}
                                                    placeholder="Enter your phone number"
                                                    allowClear
                                                    addonBefore="+63"
                                                    status={error.phone ? "error" : ""}
                                                    value={values.phone}
                                                    onChange={(e) => {
                                                        let value = e.target.value.replace(/\D/g, "");

                                                        value = value.slice(0, 11);

                                                        let formatted = value;

                                                        if (value.length > 4 && value.length <= 7) {
                                                            formatted =
                                                                value.slice(0, 4) + " " +
                                                                value.slice(4);
                                                        }
                                                        else if (value.length > 7) {
                                                            formatted =
                                                                value.slice(0, 4) + " " +
                                                                value.slice(4, 7) + " " +
                                                                value.slice(7);
                                                        }

                                                        valueHandler("phone", formatted);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                                            e.preventDefault()
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <p className="profile-section-value">{values.phone || 'Not set'}</p>
                                            )}
                                            {error.phone && (
                                                <p className="profile-error-message">{error.phone}</p>
                                            )}
                                        </div>

                                    </div>

                                    {userData?.isAccountVerified && (
                                        <div className="verification-status">
                                            <p>✓ Account Verified</p>
                                        </div>
                                    )}
                                </Card>

                                <Card className="profile-section-card">
                                    <div className="profile-section-header">
                                        <h3 className="profile-section-title">Additional Information</h3>
                                    </div>
                                    <div className="profile-section-grid">
                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Home Address</span>
                                            {editing ? (
                                                <Input
                                                    placeholder="Enter your home address"
                                                    allowClear
                                                    value={values.homeAddress}
                                                    onChange={(e) => valueHandler('homeAddress', e.target.value)}
                                                />
                                            ) : (
                                                <p className="profile-section-value">{values.homeAddress || 'Not set'}</p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Nationality</span>
                                            {editing ? (
                                                <Input
                                                    placeholder="Enter your nationality"
                                                    allowClear
                                                    value={values.nationality}
                                                    onChange={(e) => valueHandler('nationality', e.target.value)}
                                                />
                                            ) : (
                                                <p className="profile-section-value">{values.nationality || 'Not set'}</p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Gender</span>
                                            {editing ? (
                                                <Select
                                                    placeholder="Select gender"
                                                    value={values.gender || undefined}
                                                    onChange={(value) => valueHandler('gender', value || '')}
                                                    options={[
                                                        { value: 'Male', label: 'Male' },
                                                        { value: 'Female', label: 'Female' },
                                                        { value: 'Other', label: 'Other' },
                                                        { value: 'Prefer not to say', label: 'Prefer not to say' }
                                                    ]}
                                                    allowClear
                                                />
                                            ) : (
                                                <p className="profile-section-value">{values.gender || 'Not set'}</p>
                                            )}
                                        </div>
                                    </div>

                                    {editing && (
                                        <Space style={{ marginTop: 16 }}>
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
                                >
                                    <div className="preference-section">
                                        <div className='profile-card-header' style={{ marginBottom: 15 }}>
                                            <h3 className="profile-section-title">My Preferences</h3>
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
                                                        onClick={() => togglePreference('moods', option, 4)}
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
                                    title={<h3 className="profile-section-title">My Recent Reviews</h3>}
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
                                    title={<h3 className="profile-section-title">My Recent Bookings</h3>}
                                >
                                    {recentBookings.length === 0 ? (
                                        <p className="profile-empty-text">No bookings yet.</p>
                                    ) : (
                                        <div className="profile-booking-list">
                                            {recentBookings.slice(0, 3).map((booking, index) => (
                                                <div className="profile-booking-item" key={booking?.bookingItem || index}>
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

                    </div>

                    {/* USER PROFILE HAS BEEN EDITED MODAL */}
                    <Modal
                        open={isUserProfileEdited}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsUserProfileEdited(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>User Profile Edited Successfully!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                            </div>

                            <p className='signup-success-text'>Your user profile has been edited.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsUserProfileEdited(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>


                    {/* USER PREFERENCES HAS BEEN EDITED MODAL */}
                    <Modal
                        open={isUserPreferencesEdited}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsUserPreferencesEdited(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>User Preferences Edited Successfully!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                            </div>

                            <p className='signup-success-text'>Your user preferences has been edited.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsUserPreferencesEdited(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>





                </div >
            )}
        </ConfigProvider>
    )
}