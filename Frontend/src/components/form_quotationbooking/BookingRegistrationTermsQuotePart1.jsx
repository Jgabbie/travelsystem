import React, { useEffect } from 'react';
import { Form, Input } from 'antd';
import dayjs from 'dayjs';
import apiFetch from '../../config/fetchConfig';
import '../../style/components/mrcregistration.css';

export default function BookingRegistrationTermsQuotePart1({ form, onValuesChange }) {
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await apiFetch.get('/user/data', {
                    withCredentials: true,
                });

                const userData = response?.userData;
                const fullName = `${userData.firstname} ${userData.lastname}`;

                form.setFieldsValue({
                    leadFullName: fullName,
                    leadEmail: userData.email,
                    leadContact: userData.phone,
                    leadAddress: userData.homeAddress,
                    travelersSignature: fullName,
                    termsDate: dayjs().format('MMMM D, YYYY'),
                });
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchUserData();
    }, [form]);

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page mrc-booking-invoice-page mrc-registration-page">
                <div className="mrc-registration-logo-container">
                    <img
                        src="/images/Logo.png"
                        alt="MRC Travel Logo"
                        className="mrc-registration-logo"
                    />
                </div>

                <div className="mrc-registration-header mrc-registration-header--gold">
                    GENERAL PACKAGE DISCLAIMER, TERMS &amp; CONDITIONS
                </div>

                <div className="mrc-registration-terms-grid">
                    <div className="mrc-registration-terms-column">
                        <p className="mrc-registration-red-text">
                            Complete and signed copy this form must be sent together with all
                            the participant&apos;s PASSPORT COPIES (for international) or VALID
                            ID&apos;s (for domestic). Failure to send accomplished form will be
                            subject to penalties or cancellation of your package. Upon
                            completion of your booking process and deposit, you will receive a
                            Booking Confirmation of your purchase and registration.
                        </p>

                        <p className="mrc-registration-red-text">
                            By making any payments or purchase, this shall mean that you have
                            read and agreed to the terms and conditions set forth in the
                            quotation proposed to you before purchasing.
                        </p>

                        <div className="mrc-registration-header mrc-registration-header--blue">
                            PAYMENTS &amp; PENALTIES
                        </div>

                        <p className="mrc-registration-terms-text">
                            If you choose installment, you need to follow the payment schedule
                            and failure to do so will be subject to penalties and/or
                            cancellation of your tour package. We can only acknowledge payments
                            that are directly paid to us by cash (at our office) and bank
                            deposit or online cashless transfers to our official payment
                            channels. Other mode of payments such as payment through a specific
                            person such as M&amp;RC Travel and Tours Staffs will not be
                            honoured.
                        </p>

                        <div className="mrc-registration-header mrc-registration-header--blue">
                            CANCELLATION POLICY
                        </div>

                        <p className="mrc-registration-terms-text">
                            Please refer to the quotation sent to you. All tour packages will
                            not be converted to any travel funds in case the tour will not push
                            through whether it be government mandated, due to natural
                            calamities, etc. Tour package purchase is non-refundable,
                            non-reroutable, non-rebookable, and non-transferable unless
                            otherwise stated and is due to natural calamities and force majeur
                            that is beyond our control otherwise NON-REFUNDABLE.
                        </p>
                    </div>

                    <div className="mrc-registration-terms-column mrc-registration-terms-column--divided">
                        <div className="mrc-registration-header mrc-registration-header--blue mrc-registration-header--flush-top">
                            AMENDMENTS
                        </div>

                        <p className="mrc-registration-terms-text">
                            Any amendment request such as changes in name (MINOR spelling only)
                            date of birth of the passenger may have applicable charges.
                        </p>

                        <div className="mrc-registration-header mrc-registration-header--blue">
                            PASSPORT &amp; VISAS
                        </div>

                        <p className="mrc-registration-terms-text">
                            Make sure your passport/ID is valid at least 6 months PRIOR to your
                            onward and return date to avoid inconvenience. Our travel company
                            is not liable for refusal of boarding due to passport validity. For
                            VISA assistance, failure to comply with the requirements on the
                            deadlines may automatically result to cancellation of package.
                            Submission of VISA applications through travel agencies does not
                            guarantee VISA approval. The discretion still lies upon the consul
                            and company is not liable for such decision. Our travel company will
                            try our best to have your VISA approved but in the event of denied
                            VISA, the amount indicated in the cancellation/refund policy per
                            person is non-refundable since airline, hotel and tour are all
                            confirmed and guaranteed prior to VISA issuance.
                        </p>

                        <p className="mrc-registration-terms-text">
                            We appreciate honest declaration to avoid confusion/disapproval of
                            VISA/Documents and/or prolonged processing. Any fake documents
                            submitted for VISA application processing will be confiscated and
                            payments will be forfeited. This includes tampered and illegally
                            procured documents as verified by respective agencies. Moreover,
                            the company has the right to file charges against you.
                        </p>

                        <p className="mrc-registration-terms-text">
                            Original passport, with approve VISA will be release only once fully
                            paid, once there is a valid travel or reason to secure the passport,
                            client must submit notarized reasons and stating for the compliance
                            and to paid the balance as stated in the due date.
                        </p>
                    </div>
                </div>

                <Form
                    form={form}
                    className="mrc-registration-form"
                    onValuesChange={onValuesChange}
                >
                    <div className="mrc-registration-signature-row mrc-registration-signature-row--terms">
                        <div className="mrc-registration-signature-box">
                            <Form.Item name="leadFullName" noStyle>
                                <Input
                                    className="mrc-registration-signature-input"
                                    readOnly
                                />
                            </Form.Item>
                            <div className="mrc-registration-signature-label">
                                Signature over printed name
                            </div>
                        </div>

                        <div className="mrc-registration-signature-box">
                            <Form.Item name="termsDate" noStyle>
                                <Input
                                    className="mrc-registration-signature-input"
                                    readOnly
                                />
                            </Form.Item>
                            <div className="mrc-registration-signature-label">Date</div>
                        </div>
                    </div>
                </Form>

                <div className="mrc-booking-invoice-footer">
                    <span>M&amp;RC Travel and Tours</span>
                    <span>Page 3 of 4</span>
                </div>
            </div>
        </div>
    );
}