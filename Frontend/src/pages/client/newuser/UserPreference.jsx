import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Spin, ConfigProvider } from 'antd';
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

    const totalSelections =
        selections.moods.length + selections.tours.length + selections.pace.length;

    const canContinue = totalSelections >= 3;

    const handleContinue = async () => {
        if (!canContinue) return;
        setIsLoading(true);
        try {
            await apiFetch.post('/preferences/save', selections, { withCredentials: true });
            await apiFetch.post('/user/login-once', {}, { withCredentials: true });
            message.success('Preferences saved');
            console.log('Preferences saved:', selections);
            window.location.assign('/home');
            setIsLoading(false);
        } catch (error) {
            const errorMsg = error?.data?.message || 'Unable to save preferences.';
            message.error(errorMsg);
        } finally {
            setIsLoading(false);
        }

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
                            <span>{totalSelections} selected</span>
                            <span className="preference-progress-divider" />
                            <span>Choose at least 3</span>
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
                        <p>Choose up to 3.</p>
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
                        <p>Pick as many as you want.</p>
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
                                onClick={() => toggleSelection('tours', option)}
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
