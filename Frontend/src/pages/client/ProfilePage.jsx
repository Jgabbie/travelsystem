import React, { useState, useEffect, useRef } from 'react'
import { Input, Button, notification, Card, Space, Rate, DatePicker, Select, ConfigProvider, Tag, Modal, Spin } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined, FileImageOutlined, CheckCircleFilled, DeleteOutlined, StarFilled } from '@ant-design/icons';
import dayjs from 'dayjs'
import apiFetch from '../../config/fetchConfig';
import '../../style/client/profilepage.css'
import '../../style/client/userpreference.css';


export default function ProfilePage() {
    const [userData, setUserData] = useState(null)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [profileImage, setProfileImage] = useState('')
    const [isUserProfileEdited, setIsUserProfileEdited] = useState(false)
    const [isUserPreferencesEdited, setIsUserPreferencesEdited] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isRatingDeletedModalOpen, setIsRatingDeletedModalOpen] = useState(false)
    const [reviewToDelete, setReviewToDelete] = useState(null)
    const [nationalitySearch, setNationalitySearch] = useState('');

    const [notificationApi, notificationContextHolder] =
        notification.useNotification();

    const fileInputRef = useRef(null)


    //error states for input validation
    const [error, setError] = useState({
        firstname: '',
        lastname: '',
        email: '',
        phone: ''
    })


    //values for user profile
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

    //nationalities
    const nationalities = [
        'Afghan',
        'Albanian',
        'Algerian',
        'American',
        'Andorran',
        'Angolan',
        'Argentine',
        'Armenian',
        'Australian',
        'Austrian',
        'Azerbaijani',
        'Bahraini',
        'Bangladeshi',
        'Barbadian',
        'Belarusian',
        'Belgian',
        'Belizean',
        'Beninese',
        'Bhutanese',
        'Bolivian',
        'Bosnian',
        'Botswanan',
        'Brazilian',
        'British',
        'Bruneian',
        'Bulgarian',
        'Burkinabe',
        'Burmese',
        'Burundian',
        'Cambodian',
        'Cameroonian',
        'Canadian',
        'Chilean',
        'Chinese',
        'Colombian',
        'Congolese',
        'Costa Rican',
        'Croatian',
        'Cuban',
        'Cypriot',
        'Czech',
        'Danish',
        'Dominican',
        'Dutch',
        'Ecuadorian',
        'Egyptian',
        'English',
        'Estonian',
        'Ethiopian',
        'Fijian',
        'Filipino',
        'Finnish',
        'French',
        'Georgian',
        'German',
        'Ghanaian',
        'Greek',
        'Guatemalan',
        'Haitian',
        'Honduran',
        'Hungarian',
        'Icelandic',
        'Indian',
        'Indonesian',
        'Iranian',
        'Iraqi',
        'Irish',
        'Israeli',
        'Italian',
        'Jamaican',
        'Japanese',
        'Jordanian',
        'Kazakh',
        'Kenyan',
        'Kuwaiti',
        'Laotian',
        'Latvian',
        'Lebanese',
        'Liberian',
        'Libyan',
        'Lithuanian',
        'Luxembourgish',
        'Malaysian',
        'Malian',
        'Maltese',
        'Mexican',
        'Mongolian',
        'Moroccan',
        'Nepalese',
        'New Zealander',
        'Nigerian',
        'Norwegian',
        'Omani',
        'Pakistani',
        'Panamanian',
        'Paraguayan',
        'Peruvian',
        'Polish',
        'Portuguese',
        'Qatari',
        'Romanian',
        'Russian',
        'Saudi',
        'Scottish',
        'Senegalese',
        'Serbian',
        'Singaporean',
        'Slovak',
        'Slovenian',
        'Somali',
        'South African',
        'South Korean',
        'Spanish',
        'Sri Lankan',
        'Sudanese',
        'Swedish',
        'Swiss',
        'Syrian',
        'Taiwanese',
        'Tanzanian',
        'Thai',
        'Tunisian',
        'Turkish',
        'Ukrainian',
        'Uruguayan',
        'Venezuelan',
        'Vietnamese',
        'Welsh',
        'Yemeni',
        'Zambian',
        'Zimbabwean'
    ];


    //mood options
    const [moodOptions, setMoodOptions] = useState([]);


    //tour type options
    const tourOptions = [
        'Domestic',
        'International'
    ];


    //user preferences
    const [preferences, setPreferences] = useState({
        moods: [],
        tours: []
    });
    const [editingPreferences, setEditingPreferences] = useState(false);

    // Removes invalid, duplicated, or outdated saved selections
    const cleanSavedSelections = (selections, availableOptions, limit) => {
        const optionMap = new Map(
            availableOptions.map((option) => [
                String(option).trim().toLowerCase(),
                String(option).trim()
            ])
        );

        const cleaned = (Array.isArray(selections) ? selections : [])
            .map((selection) =>
                optionMap.get(String(selection).trim().toLowerCase())
            )
            .filter(Boolean);

        return [...new Set(cleaned)].slice(0, limit);
    };

    //toggle preferences
    const togglePreference = (key, value, limit) => {
        setPreferences((prev) => {
            const current = Array.isArray(prev[key]) ? prev[key] : [];
            const normalizedValue = String(value).trim();
            const normalizedKey = normalizedValue.toLowerCase();

            const exists = current.some(
                (item) => String(item).trim().toLowerCase() === normalizedKey
            );

            if (!exists && limit && current.length >= limit) {
                notificationApi.warning({
                    title: `You can only select up to ${limit} options.`,
                    placement: 'topRight'
                });

                return prev;
            }

            const next = exists
                ? current.filter(
                    (item) =>
                        String(item).trim().toLowerCase() !== normalizedKey
                )
                : [...current, normalizedValue];

            return {
                ...prev,
                [key]: next
            };
        });
    };


    //save preferences
    const savePreferences = async () => {
        if ((preferences.moods || []).length !== 3) {
            notificationApi.error({
                title: 'Please select exactly 3 mood preferences.',
                placement: 'topRight'
            });
            return;
        }

        if ((preferences.tours || []).length < 1) {
            notificationApi.error({
                title: 'Please select at least 1 tour type preference.',
                placement: 'topRight'
            });
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
            notificationApi.success({ title: 'Preferences saved successfully!', placement: 'topRight' });
        } catch (error) {
            console.error('Error saving preferences:', error);
            const errorMsg = error?.data?.message || 'Failed to save preferences';
            notificationApi.error({ title: errorMsg, placement: 'topRight' });
        }
    };


    //recent reviews and bookings
    const [recentReviews, setRecentReviews] = useState([])
    const [recentBookings, setRecentBookings] = useState([])
    const [isLoading, setIsLoading] = useState(false);


    //format phone number
    const formatPhoneNumber = (phoneStr) => {
        if (!phoneStr) return '';
        const cleaned = phoneStr.replace(/\D/g, '').slice(0, 13);

        if (cleaned.length > 4 && cleaned.length <= 7) {
            return cleaned.slice(0, 4) + " " + cleaned.slice(4);
        }
        if (cleaned.length > 7) {
            return cleaned.slice(0, 4) + " " + cleaned.slice(4, 7) + " " + cleaned.slice(7);
        }
        return cleaned;
    };


    //uppercase first letter of each word and lowercase the rest
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


    //validation function for input fields
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


    //value handler for input fields
    const valueHandler = (field, value) => {
        setValues(prev => ({ ...prev, [field]: value }));
        setError(prev => ({ ...prev, [field]: validate(field, value) }));
    };


    //get initials for profile avatar
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


    //get package tags for mood options
    const fetchPackageTags = async () => {
        try {
            const response = await apiFetch.get(
                '/package/get-packages-for-users'
            );

            const uniqueTags = new Map();

            (Array.isArray(response) ? response : []).forEach((pkg) => {
                (pkg.packageTags || []).forEach((tag) => {
                    const cleanedTag = String(tag || '').trim();

                    if (!cleanedTag) return;

                    const normalizedTag = cleanedTag.toLowerCase();

                    if (!uniqueTags.has(normalizedTag)) {
                        uniqueTags.set(normalizedTag, cleanedTag);
                    }
                });
            });

            const options = Array.from(uniqueTags.values());

            setMoodOptions(options);

            return options;
        } catch (error) {
            console.error('Error fetching mood options:', error);
            setMoodOptions([]);
            return [];
        }
    };


    //get user preferences
    const fetchPreferences = async () => {
        try {
            const response = await apiFetch.get(
                '/preferences/me',
                { withCredentials: true }
            );

            const data = response?.preferrences;

            return {
                moods: Array.isArray(data?.moods) ? data.moods : [],
                tours: Array.isArray(data?.tours) ? data.tours : []
            };
        } catch (error) {
            console.error('Error fetching preferences:', error);

            return {
                moods: [],
                tours: []
            };
        }
    };


    //get user data
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
                    phone: formatPhoneNumber(data.userData.phone),
                    homeAddress: data.userData.homeAddress || '',
                    gender: data.userData.gender || '',
                    birthdate: data.userData.birthdate || '',
                    nationality: data.userData.nationality || ''
                })
            } else if (response?.status === 401) {
                notificationApi.error({ title: 'Please login to view your profile', placement: 'topRight' })
            } else {
                notificationApi.error({ title: 'Failed to fetch user data', placement: 'topRight' })
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
            notificationApi.error({ title: 'Error fetching profile', placement: 'topRight' })
        }
    }


    //get user bookings
    const fetchRecentBookings = async () => {
        try {
            const response = await apiFetch.get('/booking/my-bookings')

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


    //get user reviews
    const fetchRecentReviews = async () => {
        try {
            const response = await apiFetch.get('/rating/my-ratings')
            const reviews = response.map((r) => ({
                key: r._id,
                id: r._id,
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


    //delete review modal
    const handleOpenDeleteModal = (review) => {
        if (!review?.id) {
            notificationApi.error({ title: 'No review to delete.', placement: 'topRight' })
            return
        }

        setReviewToDelete(review)
        setIsDeleteModalOpen(true)
    }


    //delete review handler
    const handleDeleteReview = async () => {
        if (!reviewToDelete?.id) {
            notificationApi.error({ title: 'No review to delete.', placement: 'topRight' })
            return
        }

        try {
            await apiFetch.delete(`/rating/${reviewToDelete.id}`)
            setRecentReviews((prev) => prev.filter((review) => review.id !== reviewToDelete.id))
            setIsDeleteModalOpen(false)
            setReviewToDelete(null)
            setIsRatingDeletedModalOpen(true)
        } catch (error) {
            console.error('Error deleting review:', error)
            notificationApi.error({ title: 'Unable to delete review', placement: 'topRight' })
        }
    }


    //run all the fetch functions on page load
    useEffect(() => {
        const init = async () => {
            try {
                setIsLoading(true);

                const results = await Promise.all([
                    fetchPackageTags(),
                    fetchUserData(),
                    fetchRecentBookings(),
                    fetchRecentReviews(),
                    fetchPreferences()
                ]);

                const availableMoods = results[0] || [];
                const savedPreferences = results[4] || {
                    moods: [],
                    tours: []
                };

                setPreferences({
                    moods: cleanSavedSelections(
                        savedPreferences.moods,
                        availableMoods,
                        3
                    ),
                    tours: cleanSavedSelections(
                        savedPreferences.tours,
                        tourOptions,
                        2
                    )
                });
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);


    //edit handler
    const handleEdit = () => {
        setEditing(true)
    }


    //cancel handler
    const handleCancel = () => {
        setEditing(false)
        // Reset form to previous values
        if (userData) {
            setValues({
                username: userData.username,
                firstname: userData.firstname,
                lastname: userData.lastname,
                email: userData.email,
                phone: formatPhoneNumber(userData.phone),
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


    //image change handler
    const handleImageChange = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            notificationApi.error({ title: 'Please select a valid image file.', placement: 'topRight' })
            return
        }

        if (file.size > 2 * 1024 * 1024) {
            notificationApi.error({ title: 'Image must be 2MB or less.', placement: 'topRight' })
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

            notificationApi.success({ title: "Image uploaded successfully!", placement: 'topRight' })

        } catch (error) {
            console.error(error)
            notificationApi.error({ title: "Upload failed", placement: 'topRight' })
        }
    }


    // save handler
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
            notificationApi.error({ title: 'Please fix the highlighted fields before saving.', placement: 'topRight' })
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
            notificationApi.error({ title: apiMessage || 'Error updating profile', placement: 'topRight' })
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
            {notificationContextHolder}
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
                                Manage your personal information, travel preferences, reviews, and recent bookings.
                            </p>
                        </header>
                        <div className="profile-container" style={{ marginBottom: 40 }}>
                            <div className="profile-content">
                                <Card className="profile-summary-card">
                                    <div className="profile-summary-body">
                                        <div className="profile-summary-main">
                                            <div className="profile-summary-avatar">
                                                {profileImage ? (
                                                    <img src={profileImage} alt="Profile" />
                                                ) : (
                                                    <div className="profile-summary-initials">
                                                        {getInitials()}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="profile-summary-text">
                                                <div className="profile-summary-name-row">
                                                    <h3 className="profile-summary-name">
                                                        {values.firstname || values.lastname
                                                            ? `${values.firstname} ${values.lastname}`.trim()
                                                            : values.username || 'User'}
                                                    </h3>

                                                    {userData?.isAccountVerified && (
                                                        <span className="profile-verified-badge">
                                                            <CheckCircleFilled />
                                                            Verified
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="profile-summary-badges">
                                                    <span className="profile-role-badge">
                                                        {userData?.role || 'Traveler'}
                                                    </span>
                                                </div>

                                                <p className="profile-summary-location">
                                                    {values.homeAddress ||
                                                        values.nationality ||
                                                        'Location not set'}
                                                </p>
                                            </div>
                                        </div>

                                        {!editing && (
                                            <Button
                                                type="primary"
                                                className="profile-action-button profile-summary-edit-button"
                                                icon={<EditOutlined />}
                                                onClick={handleEdit}
                                            >
                                                Edit Profile
                                            </Button>
                                        )}
                                    </div>

                                    {editing && (
                                        <div className="profile-photo-actions">
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

                                            <p className="profile-avatar-help">
                                                PNG or JPG, maximum file size of 2MB.
                                            </p>
                                        </div>
                                    )}
                                </Card>

                                <Card className="profile-section-card">
                                    <div className="profile-section-header">
                                        <h3 className="profile-section-title">Personal Information</h3>
                                    </div>
                                    <div className="profile-section-grid">
                                        <div className="profile-section-item">
                                            <span className="profile-section-label">First Name</span>
                                            {editing ? (
                                                <Input
                                                    maxLength={30}
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
                                            {editing && error.firstname && (
                                                <p className="profile-error-message">
                                                    {error.firstname}
                                                </p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Last Name</span>
                                            {editing ? (
                                                <Input
                                                    maxLength={30}
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
                                            {editing && error.lastname && (
                                                <p className="profile-error-message">
                                                    {error.lastname}
                                                </p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Date of Birth</span>
                                            {editing ? (
                                                <DatePicker
                                                    placeholder="Select birthdate"
                                                    value={values.birthdate
                                                        ? dayjs(values.birthdate)
                                                        : dayjs('2000-01-01')
                                                    }
                                                    onChange={(date) =>
                                                        valueHandler('birthdate', date ? date.format('YYYY-MM-DD') : '')
                                                    }
                                                    format="YYYY-MM-DD"
                                                    allowClear
                                                    inputReadOnly
                                                    showToday={false}
                                                    disabledDate={(current) =>
                                                        current && current > dayjs().subtract(18, 'years').endOf('day')
                                                    }
                                                    style={{ width: '100%' }}
                                                />
                                            ) : (
                                                <p className="profile-section-value">
                                                    {values.birthdate
                                                        ? dayjs(values.birthdate).format('MMMM D, YYYY')
                                                        : 'Not set'}
                                                </p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Email Address</span>
                                            {editing ? (
                                                <Input
                                                    maxLength={50}
                                                    placeholder="Enter your email"
                                                    type="email"
                                                    allowClear
                                                    status={error.email ? "error" : ""}
                                                    value={values.email}
                                                    onChange={(e) => {
                                                        const cleanedValue = e.target.value
                                                            .replace(/\s/g, '')
                                                            .replace(/[^a-zA-Z0-9@._+-]/g, '');

                                                        valueHandler('email', cleanedValue);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === " " && e.key !== "Backspace") {
                                                            e.preventDefault()
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <p className="profile-section-value">{values.email || 'Not set'}</p>
                                            )}
                                            {editing && error.email && (
                                                <p className="profile-error-message">
                                                    {error.email}
                                                </p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Phone Number</span>
                                            {editing ? (
                                                <Input
                                                    maxLength={13}
                                                    placeholder="Enter your phone number"
                                                    allowClear
                                                    status={error.phone ? "error" : ""}
                                                    value={values.phone}
                                                    onChange={(e) => {
                                                        const formatted = formatPhoneNumber(e.target.value);
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
                                            {editing && error.phone && (
                                                <p className="profile-error-message">
                                                    {error.phone}
                                                </p>
                                            )}
                                        </div>

                                    </div>
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
                                                    maxLength={100}
                                                    placeholder="Enter your home address"
                                                    allowClear
                                                    value={values.homeAddress}
                                                    onChange={(e) => {
                                                        const cleanedValue = e.target.value
                                                            .replace(/[^a-zA-Z0-9\s]/g, '')
                                                            .replace(/\s{2,}/g, ' ')
                                                            .replace(/^\s+/, '');

                                                        valueHandler('homeAddress', cleanedValue);
                                                    }}
                                                />
                                            ) : (
                                                <p className="profile-section-value">{values.homeAddress || 'Not set'}</p>
                                            )}
                                        </div>

                                        <div className="profile-section-item">
                                            <span className="profile-section-label">Nationality</span>
                                            {editing ? (
                                                <Select
                                                    showSearch
                                                    allowClear
                                                    placeholder="Select nationality"
                                                    value={values.nationality || undefined}
                                                    searchValue={nationalitySearch}
                                                    onSearch={(value) => {
                                                        const cleanedValue = value
                                                            .replace(/[^a-zA-Z\s]/g, '')
                                                            .replace(/\s{2,}/g, ' ')
                                                            .replace(/^\s+/, '')
                                                            .slice(0, 30);

                                                        setNationalitySearch(cleanedValue);
                                                    }}
                                                    onChange={(value) => {
                                                        valueHandler('nationality', value);
                                                        setNationalitySearch('');
                                                    }}
                                                    onClear={() => {
                                                        valueHandler('nationality', undefined);
                                                        setNationalitySearch('');
                                                    }}
                                                    style={{ width: '100%' }}
                                                    options={nationalities.map((nationality) => ({
                                                        label: nationality,
                                                        value: nationality,
                                                    }))}
                                                    filterOption={(input, option) =>
                                                        option?.label
                                                            ?.toLowerCase()
                                                            .includes(input.toLowerCase())
                                                    }
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
                                        <div className='profile-section-header' style={{ marginBottom: 15 }}>
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
                                            <p>Choose exactly 3 ({preferences.moods.length}/3 selected)</p>

                                            <div className="preference-chip-grid">
                                                {moodOptions.map((option) => {
                                                    const isSelected = preferences.moods.some(
                                                        (mood) =>
                                                            String(mood).trim().toLowerCase() ===
                                                            String(option).trim().toLowerCase()
                                                    );

                                                    const limitReached = preferences.moods.length >= 3;

                                                    return (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            disabled={
                                                                !editingPreferences ||
                                                                (!isSelected && limitReached)
                                                            }
                                                            className={
                                                                isSelected
                                                                    ? 'preference-chip is-selected'
                                                                    : 'preference-chip'
                                                            }
                                                            onClick={() =>
                                                                togglePreference('moods', option, 3)
                                                            }
                                                        >
                                                            {option}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* TOURS */}
                                        <div className="preference-block" style={{ marginTop: '20px' }}>
                                            <h3>What type of tour do you like?</h3>
                                            <p>Choose 1 or 2</p>

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
                                                        onClick={() => togglePreference('tours', option, 2)}
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
                                                <div className="profile-review-item" key={review?.id || index}>
                                                    <div className="profile-review-header">
                                                        <div className="profile-review-heading">
                                                            <p className="profile-review-title">
                                                                {review?.packageName || 'Untitled Review'}
                                                            </p>

                                                            <p className="profile-review-meta">
                                                                {review?.date || 'Recently'}
                                                            </p>
                                                        </div>

                                                        <div className="profile-review-score">
                                                            <span>
                                                                <StarFilled style={{ color: '#fadb14', marginRight: '4px' }} />
                                                                {Number(review?.rating || 0).toFixed(1)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <Rate
                                                        className="profile-review-rating"
                                                        disabled
                                                        value={review?.rating || 0}
                                                    />

                                                    <p className="profile-review-snippet">
                                                        {review?.review || 'No written review provided.'}
                                                    </p>

                                                    <div className="profile-review-actions">
                                                        <Button
                                                            danger
                                                            className="profile-delete-button"
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => handleOpenDeleteModal(review)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
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


                    <Modal
                        open={isDeleteModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        centered={true}
                        onCancel={() => {
                            setIsDeleteModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Delete Review?</h1>
                            <p className='signup-success-text'>Are you sure you want to delete this review?</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        handleDeleteReview();
                                    }}
                                >
                                    Delete
                                </Button>
                                <Button
                                    type='primary'
                                    className='logout-cancel-btn'
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                    }}
                                >
                                    Cancel
                                </Button>

                            </div>

                        </div>
                    </Modal>



                    <Modal
                        open={isRatingDeletedModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        centered={true}
                        onCancel={() => {
                            setIsRatingDeletedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Review Deleted!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                            </div>

                            <p className='signup-success-text'>Your review has been successfully deleted.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsRatingDeletedModalOpen(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>

















                    {/* USER PROFILE HAS BEEN EDITED MODAL */}
                    <Modal
                        open={isUserProfileEdited}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        centered={true}
                        onCancel={() => {
                            setIsUserProfileEdited(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>User Profile Edited Successfully!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
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
                        centered={true}
                        onCancel={() => {
                            setIsUserPreferencesEdited(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>User Preferences Edited Successfully!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
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