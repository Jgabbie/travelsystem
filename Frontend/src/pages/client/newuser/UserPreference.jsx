import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification, Spin, ConfigProvider, Modal } from 'antd';
import { CompassOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';
import apiFetch from '../../../config/fetchConfig';
import '../../../style/client/userpreference.css';

export default function UserPreference() {
    const navigate = useNavigate();
    const [moodOptions, setMoodOptions] = useState([]);

    const tourOptions = useMemo(
        () => [
            'Domestic',
            'International'
        ],
        []
    );

    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        const fetchTags = async () => {
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

        fetchTags();
    }, []);
    const [selections, setSelections] = useState({
        moods: [],
        tours: [],
        pace: []
    });

    const [showNextStepsModal, setShowNextStepsModal] = useState(false);

    const toggleSelection = (key, value, limit) => {
        setSelections((prev) => {
            const current = prev[key];
            const exists = current.includes(value);
            if (!exists && limit && current.length >= limit) {
                return prev;
            }
            const next = exists
                ? current.filter((item) => item !== value)
                : [...current, value];
            return { ...prev, [key]: next };
        });
    };

    const canContinue = selections.moods.length === 3 && selections.tours.length >= 1 && selections.tours.length <= 2;

    const handleContinue = async () => {
        if (!canContinue) return;
        setIsLoading(true);
        try {
            await apiFetch.post('/preferences/save', selections, { withCredentials: true });
            await apiFetch.post('/user/login-once', {}, { withCredentials: true });
            notification.success({ message: 'Preferences saved', placement: 'topRight' });
            console.log('Preferences saved:', selections);
            // Set flag in localStorage to show modal on homepage
            localStorage.setItem('showNextStepsModal', 'true');
            setIsLoading(false);
            // Redirect to home page
            navigate('/home');
        } catch (error) {
            const errorMsg = error?.data?.message || 'Unable to save preferences.';
            notification.error({ message: errorMsg, placement: 'topRight' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalOption = (path) => {
        setShowNextStepsModal(false);
        navigate(path);
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305979',
                }
            }}
        >
            {isLoading && (
                <Spin fullscreen size="large" className="app-loading-spin" style={{ zIndex: 2000 }} />
            )}
            <div className="preference-page">
                <div className="preference-hero">
                    <div className="preference-hero-copy">
                        <p className="preference-eyebrow">New here?</p>
                        <h1 className="preference-title">Let us tailor your travel moodboard</h1>
                        <p className="preference-subtitle">
                            Pick a few vibes and tour styles so we can personalize your feed.
                        </p>
                        <div className="preference-progress">
                            <span>Moods: {selections.moods.length}/3 | Tours: {selections.tours.length}/2</span>
                            <span className="preference-progress-divider" />
                            <span>{canContinue ? '✓ Ready' : 'Complete selections'}</span>
                        </div>
                    </div>
                    <div className="preference-hero-art">
                        <div className="hero-card hero-card-large">
                            <span>Explore the World</span>
                        </div>
                        <div className="hero-card hero-card-top">
                            <span>Choose what you prefer</span>
                        </div>
                        <div className="hero-card hero-card-bottom">
                            <span>We got it for you</span>
                        </div>
                    </div>
                </div>

                <div className="preference-card">
                    <div className="preference-question">
                        <h2>What are you in the mood for?</h2>
                        <p>Choose exactly 3.</p>
                    </div>
                    <div className="preference-chip-grid">
                        {moodOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                className={
                                    selections.moods.includes(option)
                                        ? 'preference-chip is-selected'
                                        : 'preference-chip'
                                }
                                onClick={() => toggleSelection('moods', option, 3)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="preference-card">
                    <div className="preference-question">
                        <h2>What type of tour do you like?</h2>
                        <p>Choose 1 or 2.</p>
                    </div>
                    <div className="preference-chip-grid">
                        {tourOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                className={
                                    selections.tours.includes(option)
                                        ? 'preference-chip is-selected'
                                        : 'preference-chip'
                                }
                                onClick={() => toggleSelection('tours', option, 2)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="preference-footer">
                    <div className="preference-footer-note">
                        Your picks will shape the tours we recommend next.
                    </div>
                    <button
                        type="primary"
                        className={
                            canContinue
                                ? 'preference-cta'
                                : 'preference-cta is-disabled'
                        }
                        onClick={handleContinue}
                        disabled={!canContinue}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </ConfigProvider>
    );
}
