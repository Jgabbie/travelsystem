import React, { useEffect } from 'react';
import { Form, Input } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';

const { TextArea } = Input;

export default function BookingRegistrationDietInvoice({
    form,
    onValuesChange,
    summaryInvoice,
}) {
    const formatTravelDate = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value;

        const start = value.startDate ? dayjs(value.startDate) : null;
        const end = value.endDate ? dayjs(value.endDate) : null;

        if (start?.isValid() && end?.isValid()) {
            return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
        }
        if (start?.isValid()) return start.format('MMM D, YYYY');
        return '';
    };

    useEffect(() => {
        if (!summaryInvoice) return;

        form.setFieldsValue({
            leadFullName: summaryInvoice.leadFullName,
            tourPackageTitle: summaryInvoice.tourPackageTitle,
            travelDate: formatTravelDate(summaryInvoice.travelDate),
            dietaryDetails: summaryInvoice.dietaryDetails,
            dietaryRequest: summaryInvoice.dietaryRequest,
            medicalDetails: summaryInvoice.medicalDetails,
            medicalRequest: summaryInvoice.medicalRequest,
            purchaseInsurance: summaryInvoice.purchaseInsurance,
            ownInsurance: summaryInvoice.ownInsurance,
            emergencyContact: summaryInvoice.emergencyContact,
            emergencyEmail: summaryInvoice.emergencyEmail,
            emergencyName: summaryInvoice.emergencyName,
            emergencyRelation: summaryInvoice.emergencyRelation,
            emergencyTitle: summaryInvoice.emergencyTitle,
            signatureDate: dayjs().format('MMMM D, YYYY'),
        });
    }, [summaryInvoice, form]);

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
                    TRAVEL REGISTRATION DETAILS
                </div>

                <p className="mrc-registration-instructions">
                    Instructions: Please fill-up and write your answers inside each box.
                </p>

                <Form
                    form={form}
                    className="mrc-registration-form"
                    layout="vertical"
                    onValuesChange={onValuesChange}
                >
                    <Form.Item name="ownInsurance" hidden>
                        <Input />
                    </Form.Item>

                    <div className="mrc-registration-package-summary">
                        <div>
                            <strong>TOUR PACKAGE TITLE:</strong>{' '}
                            <span>{summaryInvoice?.tourPackageTitle || '____________________'}</span>
                        </div>
                        <div>
                            <strong>PACKAGE TRAVEL DATE:</strong>{' '}
                            <span>
                                {formatTravelDate(summaryInvoice?.travelDate) || '____________________'}
                            </span>
                        </div>
                    </div>

                    <section className="mrc-registration-question-block">
                        <div className="mrc-registration-question-row">
                            <div className="mrc-registration-question-copy">
                                <strong>Does anyone in your group have any dietary requests?</strong>
                                <span className="mrc-registration-note-text">
                                    (Applicable for tour package with meal inclusions; if not included,
                                    please select N/A)
                                </span>
                            </div>

                            <Form.Item
                                name="dietaryRequest"
                                noStyle
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input className="mrc-registration-yes-no-input" readOnly />
                            </Form.Item>
                        </div>

                        <div className="mrc-registration-detail-row">
                            <span>If yes, please indicate details:</span>
                            <Form.Item
                                name="dietaryDetails"
                                noStyle
                                dependencies={['dietaryRequest']}
                                rules={[
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (getFieldValue('dietaryRequest') === 'Y' && !value) {
                                                return Promise.reject(
                                                    new Error('Please provide dietary details')
                                                );
                                            }
                                            return Promise.resolve();
                                        },
                                    }),
                                ]}
                            >
                                <TextArea
                                    className="mrc-registration-detail-box"
                                    autoSize={{ minRows: 2, maxRows: 2 }}
                                    readOnly
                                />
                            </Form.Item>
                        </div>
                    </section>

                    <section className="mrc-registration-question-block">
                        <div className="mrc-registration-question-row">
                            <div className="mrc-registration-question-copy">
                                <strong>
                                    Does anyone in your group have any Allergies/Medical conditions?
                                </strong>
                                <span className="mrc-registration-note-text">
                                    (Applicable for tour package with meal inclusions; if not included,
                                    please select N/A)
                                </span>
                            </div>

                            <Form.Item
                                name="medicalRequest"
                                noStyle
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input className="mrc-registration-yes-no-input" readOnly />
                            </Form.Item>
                        </div>

                        <div className="mrc-registration-detail-row">
                            <span>If yes, please indicate details:</span>
                            <Form.Item
                                name="medicalDetails"
                                noStyle
                                dependencies={['medicalRequest']}
                                rules={[
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (getFieldValue('medicalRequest') === 'Y' && !value) {
                                                return Promise.reject(
                                                    new Error('Please provide medical details')
                                                );
                                            }
                                            return Promise.resolve();
                                        },
                                    }),
                                ]}
                            >
                                <TextArea
                                    className="mrc-registration-detail-box"
                                    autoSize={{ minRows: 2, maxRows: 2 }}
                                    readOnly
                                />
                            </Form.Item>
                        </div>
                    </section>

                    <section className="mrc-registration-insurance-card">
                        <h4>TRAVEL INSURANCE</h4>
                        <p>
                            We highly encourage <strong>ALL OUR CLIENTS</strong> to have and are covered
                            with travel insurance for health, repatriation, loss of luggage/belongings and
                            in case of cancellation, flight delays, and the like that is why purchasing of
                            travel insurance together with our tour packages is compulsory for your
                            convenience and peace of mind.
                        </p>

                        <div className="mrc-registration-insurance-answer-row">
                            <span>Do you agree to purchase a Travel Insurance from us?</span>
                            <Form.Item
                                name="purchaseInsurance"
                                noStyle
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input className="mrc-registration-yes-no-input" readOnly />
                            </Form.Item>
                        </div>

                        <p className="mrc-registration-note-text">
                            Note: Purchasing of travel insurance from our Travel &amp; Tours company does
                            not hold us liable for any claims and anything about the process of claims from
                            the insurance company. We can only provide the documents from our suppliers,
                            operators, and airlines' end if necessary.
                        </p>

                        <table className="mrc-registration-insurance-table">
                            <tbody>
                                <tr>
                                    <th>If YES, please indicate details:</th>
                                    <td>
                                        Please check the conditions and coverage carefully and send us a
                                        copy of the policy so we can review as well.
                                    </td>
                                </tr>
                                <tr>
                                    <th>If NO but chose not to purchase Travel Insurance from us:</th>
                                    <td>
                                        <strong>
                                            I understand that I am waiving the right of any assistance from
                                            the travel and tours company related to claims.
                                        </strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <div className="mrc-registration-header mrc-registration-header--blue mrc-registration-emergency-title">
                        EMERGENCY CONTACT{' '}
                        <span>
                            (i.e: the person to contact in the event of an emergency while you are away)
                        </span>
                    </div>

                    <div className="mrc-registration-table-wrap">
                        <table className="mrc-registration-emergency-table">
                            <tbody>
                                <tr>
                                    <th>Title:</th>
                                    <td>
                                        <Form.Item name="emergencyTitle" noStyle>
                                            <Input variant="borderless" readOnly />
                                        </Form.Item>
                                    </td>
                                    <th>Full name:</th>
                                    <td colSpan={3}>
                                        <Form.Item name="emergencyName" noStyle>
                                            <Input variant="borderless" readOnly />
                                        </Form.Item>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Email:</th>
                                    <td>
                                        <Form.Item name="emergencyEmail" noStyle>
                                            <Input variant="borderless" readOnly />
                                        </Form.Item>
                                    </td>
                                    <th>Contact Number:</th>
                                    <td>
                                        <Form.Item name="emergencyContact" noStyle>
                                            <Input variant="borderless" readOnly />
                                        </Form.Item>
                                    </td>
                                    <th>Relation:</th>
                                    <td>
                                        <Form.Item name="emergencyRelation" noStyle>
                                            <Input variant="borderless" readOnly />
                                        </Form.Item>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mrc-registration-signature-row">
                        <div className="mrc-registration-signature-box">
                            <Form.Item name="leadFullName" noStyle>
                                <Input className="mrc-registration-signature-input" readOnly />
                            </Form.Item>
                            <div className="mrc-registration-signature-label">
                                Signature over printed name
                            </div>
                        </div>

                        <div className="mrc-registration-signature-box">
                            <Form.Item name="signatureDate" noStyle>
                                <Input className="mrc-registration-signature-input" readOnly />
                            </Form.Item>
                            <div className="mrc-registration-signature-label">Date</div>
                        </div>
                    </div>
                </Form>

                <div className="mrc-booking-invoice-footer">
                    <span>M&amp;RC Travel and Tours</span>
                    <span>Page 2 of 4</span>
                </div>
            </div>
        </div>
    );
}