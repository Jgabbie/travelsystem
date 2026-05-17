import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { Input, Button, Modal, Spin, ConfigProvider } from 'antd';
import apiFetch from '../config/fetchConfig';
import '../style/components/newpasswordpage.css'

export default function NewPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    const token = useMemo(() => {
        const params = new URLSearchParams(location.search)
        return params.get('token') || ''
    }, [location.search])

    const [values, setValues] = useState({
        password: '',
        confirmPassword: ''
    })
    const [error, setError] = useState({
        password: [],
        confirmPassword: []
    })
    const [serverError, setServerError] = useState('')

    useEffect(() => {
        if (!token) {
            navigate('/', { replace: true })
        }
    }, [token, navigate])

    const validate = (field, value) => {
        if (field === "password") {
            if (value === "") return ["Password is required."]
            if (value.length < 8) return ["Password must be at least 8 characters."]
            if (!/\d/.test(value)) return ["Password must have at least one number."]
            if (!/[a-z]/.test(value)) return ["Password must have at least one lowercase character."]
            if (!/[A-Z]/.test(value)) return ["Password must have at least one uppercase character."]
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return ["Password must contain a special character."]
            return []
        }

        if (field === "confirmPassword") {
            if (value === "") return ["Confirm Password is required."]
            if (value !== values.password) return ["Passwords do not match."]
            return []
        }
    }

    const valueHandler = (field, value) => {
        setValues({ ...values, [field]: value })
        setError({ ...error, [field]: validate(field, value) })
    }

    const handleSuccessOk = () => {
        setIsSuccessModalOpen(false);
        navigate('/login');
    };

    const handleSuccessCancel = () => {
        setIsSuccessModalOpen(false);
        navigate('/login');
    };

    const submitNewPassword = async (e) => {
        e.preventDefault()
        setServerError('')

        const passwordErrors = validate("password", values.password)
        const confirmErrors = validate("confirmPassword", values.confirmPassword)

        if (passwordErrors.length > 0 || confirmErrors.length > 0) {
            setError({ password: passwordErrors, confirmPassword: confirmErrors })
            return
        }

        if (!token) {
            setServerError('Invalid or missing token.')
            return
        }

        setIsLoading(true)
        try {
            const response = await apiFetch.post('/auth/reset-password', {
                newPassword: values.password,
                token
            })

            if (response?.message) {
                setIsSuccessModalOpen(true)
            } else {
                setServerError('Unexpected response from server')
            }
        } catch (err) {
            const errorMsg = err.data?.message || 'Reset failed'
            setServerError(errorMsg)
            console.error('Error: ', errorMsg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                },
            }}
        >
            <Spin spinning={isLoading} tip="Loading..." size="large">
                <div className='newpasswordpage-page-container'>
                    <div className='newpasswordpage-left-side'>
                        <form className='newpassword-form' onSubmit={submitNewPassword}>
                            <div>
                                <h1 className='newpassword-heading'>Set New Password</h1>
                                <h4 className='newpassword-secondary-heading'>Enter New Password</h4>
                            </div>

                            <div className='div-input-fields'>
                                <label className='newpassword-labels' htmlFor="password">New Password</label>
                                <Input.Password status={error.password.length ? "error" : ""} value={values.password} maxLength={64} onChange={(e) => valueHandler("password", e.target.value)} autoComplete='new-password' onKeyDown={(e) => {
                                    if (e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} type="password" id="password" name="password" className='newpassword-input-fields' required />
                            </div>

                            {error.password.length > 0 && (
                                <p id='error-message'>{error.password[0]}</p>
                            )}

                            <div className='div-input-fields'>
                                <label className='newpassword-labels' htmlFor="confirmPassword">Confirm Password</label>
                                <Input.Password status={error.confirmPassword.length ? "error" : ""} value={values.confirmPassword} maxLength={64} onChange={(e) => valueHandler("confirmPassword", e.target.value)} autoComplete='new-password' onKeyDown={(e) => {
                                    if (e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} type="password" id="confirmPassword" name="confirmPassword" className='newpassword-input-fields' required />
                            </div>

                            {error.confirmPassword.length > 0 && (
                                <p id='error-message'>{error.confirmPassword[0]}</p>
                            )}

                            {serverError && <p id='error-message'>{serverError}</p>}

                            <div id='newpassword-links-container'>
                                <Button className='newpassword-button-links' type='link' onClick={() => navigate('/login')}>Remembered your password? Go to Login</Button>
                            </div>

                            <Button id='newpassword-button' htmlType='submit'> Set Password </Button>
                        </form>
                    </div>

                    <div className='newpasswordpage-right-side'>
                    </div>
                </div>

                <Modal
                    open={isSuccessModalOpen}
                    className='resetpassword-success-modal'
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    footer={null}
                    onOk={handleSuccessOk}
                    onCancel={handleSuccessCancel}
                    centered={true}
                >
                    <div className='resetpassword-success-container'>
                        <h1 className='resetpassword-success-heading'>Password Changed</h1>
                        <p className='resetpassword-success-text'>Your password has been updated successfully.</p>

                        <Button id='resetpassword-success-button' onClick={handleSuccessOk}>Continue</Button>
                    </div>
                </Modal>
            </Spin>
        </ConfigProvider>
    )
}
