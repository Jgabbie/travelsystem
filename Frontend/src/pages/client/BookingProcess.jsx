import React, { useEffect, useState } from 'react'
import { Modal, Button, message, Upload, DatePicker, Row, Col, Form, Input, Select } from 'antd'
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { PDFDocument, rgb } from 'pdf-lib';
import dayjs from 'dayjs';
import '../../style/components/modals/bookingsummarymodal.css'
import '../../style/components/modals/travelersmodal.css'
import '../../style/client/bookingprocess.css'

const { TextArea } = Input;
const { Option } = Select;

const getDisplayDate = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (value instanceof Date && !Number.isNaN(value.valueOf())) {
        return value.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }
    return String(value)
}

const INITIAL_COUNTS = {
    adult: 1,
    child: 0,
    infant: 0,
}

export default function BookingProcess() {
    const { bookingData } = useBooking();
    const navigate = useNavigate();

    const [selectedSoloGrouped, setSelectedSoloGrouped] = useState(null)
    const [counts, setCounts] = useState(INITIAL_COUNTS)

    const summary = bookingData || {}
    const data = summary
    const travelers = data.travelers?.length ? data.travelers : ['None selected']
    const hotelOptions = data.hotelOptions?.length ? data.hotelOptions : []
    const airlineOptions = data.airlineOptions?.length ? data.airlineOptions : []
    const travelDate = getDisplayDate(data.travelDate)
    const travelersCount = data.groupType === 'solo'
        ? 1
        : (counts.adult + counts.child + counts.infant)

    const packagePricePerPax = data.packagePricePerPax || 0
    const totalPrice = packagePricePerPax * travelersCount
    const packageName = data.packageName || 'Tour Package'
    const packageType = data.packageType || 'fixed'
    const images = data.images || []

    const [fileLists, setFileLists] = useState(Array(travelers).fill([]));
    const [previews, setPreviews] = useState(Array(travelers).fill(null));
    const [pdfUrl, setPdfUrl] = useState(null);




    const handleProceed = () => {
        const allUploaded = fileLists.every(list => list.length > 0);
        if (!allUploaded) {
            message.warning('Please upload passport images for all travelers before proceeding.');
            return;
        }
    };

    const handleCancel = () => {
        setFileLists(Array(travelers).fill([]));
        setPreviews(Array(travelers).fill(null));
    };

    const handleChange = (index) => ({ fileList: nextList }) => {
        const newFileLists = [...fileLists];
        newFileLists[index] = nextList;
        setFileLists(newFileLists);

        const newPreviews = [...previews];
        if (nextList.length > 0) {
            newPreviews[index] = URL.createObjectURL(nextList[0].originFileObj);
        } else {
            newPreviews[index] = null;
        }
        setPreviews(newPreviews);
    };

    // Helper function to trigger browser download
    const download = (data, filename, type) => {
        const file = new Blob([data], { type: type });
        const a = document.createElement("a");
        const url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }

    const generatePreview = async () => {
        // 1. Load your existing template
        const existingPdfBytes = await fetch('/template.pdf').then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();

        // 2. Pre-fill data from your React state
        form.getTextField('tour_name').setText(bookingData.packageName);

        // 3. Generate the PDF bytes
        const pdfBytes = await pdfDoc.save();

        // 4. Create a URL that the iframe can see
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
    };

    const createFillablePdf = async () => {
        try {
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([600, 500]);
            const form = pdfDoc.getForm();

            page.drawText('Booking Confirmation & Application', { x: 50, y: 450, size: 20 });

            // Pre-filling data from your state
            page.drawText(`Package: ${summary.packageName || 'N/A'}`, { x: 50, y: 410, size: 12 });
            page.drawText(`Date: ${travelDate ? dayjs(travelDate).format('MMMM D, YYYY') : 'Not set'}`, { x: 50, y: 390, size: 12 });

            page.drawText('Please enter your full name below:', { x: 50, y: 350, size: 12, color: rgb(0, 0.5, 0.5) });

            // Create Interactive Field
            const nameField = form.createTextField('user_full_name');
            nameField.setPlaceholder('Click here to type your name...');
            nameField.addToPage(page, {
                x: 50,
                y: 310,
                width: 300,
                height: 30,
                borderWidth: 1,
            });

            const pdfBytes = await pdfDoc.save();
            download(pdfBytes, `Booking_${summary.packageName}.pdf`, "application/pdf");
        } catch (error) {
            console.error("Error generating PDF:", error);
        }
    };

    const increaseAdult = () => setCounts(prev => ({ ...prev, adult: prev.adult + 1 }))
    const decreaseAdult = () => setCounts(prev => ({ ...prev, adult: Math.max(1, prev.adult - 1) }))
    const increaseChild = () => setCounts(prev => ({ ...prev, child: prev.child + 1 }))
    const decreaseChild = () => setCounts(prev => ({ ...prev, child: Math.max(0, prev.child - 1) }))
    const increaseInfant = () => setCounts(prev => ({ ...prev, infant: prev.infant + 1 }))
    const decreaseInfant = () => setCounts(prev => ({ ...prev, infant: Math.max(0, prev.infant - 1) }))

    useEffect(() => {
        if (!bookingData) {
            navigate('/home', { replace: true });
        }
    }, [bookingData, navigate]);

    if (!bookingData) return null;

    return (
        <div className='bookingprocess-container'>
            {/* Solo/Group Selection */}
            <div className='bookingprocess-sologroup-container'>
                <div className="solo-group-content">
                    <h1 className='solo-group-heading'>Select Your Package Arrangement</h1>
                    <div className="solo-group-cards">
                        <button
                            type="button"
                            className={`solo-group-card${selectedSoloGrouped === 'solo' ? ' is-selected' : ''}`}
                            onClick={() => setSelectedSoloGrouped('solo')}
                        >
                            <div className="solo-group-image solo" />
                            <h3>Solo Booking</h3>
                            <p>Book for yourself with a single traveler setup.</p>
                        </button>

                        <button
                            type="button"
                            className={`solo-group-card${selectedSoloGrouped === 'group' ? ' is-selected' : ''}`}
                            onClick={() => setSelectedSoloGrouped('group')}
                        >
                            <div className="solo-group-image group" />
                            <h3>Grouped Booking</h3>
                            <p>Plan a trip for a group with shared activities.</p>
                        </button>
                    </div>
                </div>
            </div>

            {/* Traveler Counters (conditionally rendered) */}
            {selectedSoloGrouped === 'group' && (
                <div className="travelers-content">
                    <h3 className="travelers-title">Number of Travelers</h3>
                    <div className="travelers-cards">
                        <div className="traveler-card">
                            <h3>Adult</h3>
                            <div className="traveler-counter">
                                <button type="button" onClick={decreaseAdult}>-</button>
                                <span>{counts.adult}</span>
                                <button type="button" onClick={increaseAdult}>+</button>
                            </div>
                        </div>
                        {/* Repeat for Child/Infant as needed */}
                    </div>
                </div>
            )}

            <h2 className='booking-summary-title'>Booking Summary</h2>
            <div className="booking-summary-wrapper">
                <div className="booking-summary-images">
                    {images.map((img, index) => (
                        <img key={index} className="booking-summary-image" src={img} alt="tour" />
                    ))}
                </div>

                <div className="booking-summary-details">
                    <div className="booking-summary-card">
                        <h2>Booking Details</h2>

                        <div className="booking-summary-row">
                            <span className="booking-summary-label">Tour Package</span>
                            <span className="booking-summary-value">{packageName}</span>
                        </div>

                        <div className="booking-summary-row">
                            <span className="booking-summary-label">Travel Date</span>
                            <span className="booking-summary-value">
                                {travelDate ? dayjs(travelDate).format('MMMM D, YYYY') : 'Not set'}
                            </span>
                        </div>

                        <div className="booking-summary-row">
                            <span className="booking-summary-label">Total Price</span>
                            <span className="booking-summary-value">
                                ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* --- PDF INTERACTIVE SECTION --- */}
                        <div className='booking-summary-divider'></div>
                        <div style={{ padding: '20px 0', textAlign: 'center' }}>
                            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                                Need to provide additional details offline?
                            </p>
                            <Button
                                type="primary"
                                onClick={createFillablePdf}
                                style={{ backgroundColor: '#1890ff', width: '100%' }}
                            >
                                Download Fillable PDF Form
                            </Button>
                        </div>
                        {/* --- END PDF SECTION --- */}
                    </div>
                </div>

                <div className="pdf-preview-container" style={{ height: '500px', marginTop: '20px' }}>
                    <h3>Complete your details in the form below:</h3>
                    {pdfUrl ? (
                        <iframe
                            src={`${pdfUrl}#toolbar=0`}
                            width="100%"
                            height="100%"
                            title="PDF Preview"
                        />
                    ) : (
                        <p>Loading PDF Preview...</p>
                    )}
                </div>




                <h2 className="upload-passport-title">Upload Passport</h2>
                <div className="upload-passport-wrapper">
                    <p className="upload-passport-text">
                        Please upload a clear image of your passport bio page for each traveler.
                    </p>

                    {Array.from({ length: travelers }).map((_, index) => (
                        <div key={index} className="upload-card">

                            <div className='upload-passport-left'>
                                <h4>Traveler {index + 1}</h4>
                                <Upload
                                    fileList={fileLists[index]}
                                    beforeUpload={() => false}
                                    onChange={handleChange(index)}
                                    accept="image/*,application/pdf"
                                    maxCount={1}
                                    showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                                >
                                    <Button type="default">
                                        {fileLists[index]?.length > 0 ? 'Change File' : 'Upload File'}
                                    </Button>
                                </Upload>
                            </div>

                            <div className="upload-passport-right">
                                {previews[index] && (
                                    <div className="passport-preview" style={{ marginTop: '10px' }}>
                                        <img
                                            src={previews[index]}
                                            alt={`Passport Preview ${index + 1}`}
                                            className="passport-preview-image"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>


            <div className="mrc-overlay-wrapper">
                {/* --- HTML form mimic --- */}
                <div className="mrc-form-page">
                    <div className="mrc-form-header">
                        <img
                            src="/images/mrc_logo.png" // Use your logo asset path
                            alt="MRC Travel Logo"
                            className="mrc-logo"
                        />
                        <div className="mrc-header-title">TRAVEL REGISTRATION DETAILS</div>
                        <p className="mrc-instructions">
                            Instructions: Please fill-up and write your answers inside each box.
                        </p>
                    </div>

                    {/* <Form
                        form={form}
                        layout="vertical"
                        className="mrc-main-form"
                        onValuesChange={handleValuesChange}
                        initialValues={{
                            tourPackageTitle: summary?.packageName,
                            packageTravelDate: summary?.travelDate
                        }}
                    >

                        <div className="mrc-input-row is-static">
                            <label>TOUR PACKAGE TITLE:</label>
                            <div className="mrc-data-display">{summary?.packageName || '—'}</div>
                        </div>

                        <div className="mrc-input-row is-static">
                            <label>PACKAGE TRAVEL DATE:</label>
                            <div className="mrc-data-display">{summary?.travelDate || '—'}</div>
                        </div>


                        <div className="mrc-section-block">
                            <div className="mrc-section-question">
                                Does anyone in your group have any dietary requests?
                                <Form.Item name="dietaryRequest" className="mrc-yn-dropdown">
                                    <Select placeholder="N">
                                        <Option value="Y">Yes</Option>
                                        <Option value="N">No</Option>
                                    </Select>
                                </Form.Item>
                            </div>
                            <Form.Item label="If yes, please indicate details" name="dietaryDetails">
                                <TextArea rows={3} placeholder="Applicable for tour package with meal inclusions..." />
                            </Form.Item>
                        </div>

                        <div className="mrc-section-block">
                            <div className="mrc-section-question">
                                Does anyone in your group have any Allergies/Medical conditions?
                                <Form.Item name="medicalRequest" className="mrc-yn-dropdown">
                                    <Select placeholder="N">
                                        <Option value="Y">Yes</Option>
                                        <Option value="N">No</Option>
                                    </Select>
                                </Form.Item>
                            </div>
                            <Form.Item label="If yes, please indicate details" name="medicalDetails">
                                <TextArea rows={3} />
                            </Form.Item>
                        </div>


                        <div className="mrc-insurance-section">
                            <h4>TRAVEL INSURANCE</h4>
                            <p className="mrc-fine-print">
                                We highly encourage ALL OUR CLIENTS to have and be covered with travel insurance...
                            </p>

                            <Row gutter={16}>
                                <Col span={18}>
                                    <Form.Item label="Do you agree to purchase a Travel Insurance from us?" name="purchaseInsurance">
                                        <Select placeholder="Y/N">
                                            <Option value="Y">Yes</Option>
                                            <Option value="N">No</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <p className="mrc-insurance-note">Note: Purchasing of travel insurance from...[the full note from form]</p>

                            <Row gutter={16}>
                                <Col span={18}>
                                    <Form.Item label="If NO, do you have your own Travel Insurance?" name="haveOwnInsurance">
                                        <Select placeholder="Y/N">
                                            <Option value="Y">Yes</Option>
                                            <Option value="N">No</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item label="If YES, please indicate details" name="ownInsuranceDetails">
                                <Input />
                            </Form.Item>
                        </div>


                        <div className="mrc-emergency-contact-table">
                            <h4>EMERGENCY CONTACT (I or the person to contact...)</h4>

                            <div className="mrc-table-header">
                                <div className="mrc-col-title">Title</div>
                                <div className="mrc-col-name">Full name</div>
                            </div>
                            <div className="mrc-table-inputs">
                                <div className="mrc-col-title-input">
                                    <Form.Item name="emergencyTitle">
                                        <Input placeholder="SISTER" />
                                    </Form.Item>
                                </div>
                                <div className="mrc-col-name-input">
                                    <Form.Item name="emergencyName">
                                        <Input />
                                    </Form.Item>
                                </div>
                            </div>

                            <div className="mrc-table-row">
                                <div className="mrc-table-cell labell">Email Add</div>
                                <div className="mrc-table-cell inputt"><Form.Item name="emergencyEmail"><Input /></Form.Item></div>
                                <div className="mrc-table-cell labell">Contact no</div>
                                <div className="mrc-table-cell inputt"><Form.Item name="emergencyContact"><Input /></Form.Item></div>
                                <div className="mrc-table-cell labell">Relation</div>
                                <div className="mrc-table-cell inputt"><Form.Item name="emergencyRelation"><Input /></Form.Item></div>
                            </div>
                        </div>


                        <div className="mrc-signature-area">
                            <Row gutter={24}>
                                <Col span={16}>
                                    <Form.Item label="Signature over printed name:" name="signature">
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Date:" name="signatureDate">
                                        <DatePicker className="ant-input" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>
                    </Form>

                     */}
                </div>

                {/* <div className="mrc-action-bar">
                    <Button type="primary" size="large" onClick={handleSubmitForDownload}>
                        Download Completed Registration Form (PDF)
                    </Button>
                </div> */}
            </div>
        </div>
    )
}