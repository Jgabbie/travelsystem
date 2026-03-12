import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/modals/choosedateintmodal.css';

export default function ChooseDateIntModal({
    open,
    onCancel,
    onProceed,
    packageData,
    selectedDate,
    onDateChange
}) {
    const [selectedStartDate, setSelectedStartDate] = useState(null);

    // Sync local selection with parent (dayjs object) — only date
    useEffect(() => {
        if (selectedDate) {
            // Use the parent-provided selectedDate
            setSelectedStartDate(dayjs(selectedDate).format('YYYY-MM-DD'));
        } else {
            setSelectedStartDate(null);
        }
    }, [selectedDate, packageData]);


    const handleProceed = () => {
        if (!selectedStartDate) return;
        onProceed({ selectedDate: selectedStartDate }); // only date string
    };

    const handleCancel = () => {
        setSelectedStartDate(null);
        onCancel?.();
    };

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            footer={null}
            rootClassName="choose-date-int-modal"
            width={860}
            style={{ top: 30 }}
        >
            <div className="choose-date-int-content">
                <h1 className="choose-date-heading">Select Preferred Date</h1>
                <h3 className='choose-date-secondheading'>Available Dates</h3>

                <div className="budget-range-section">
                    <div className="budget-cards-container">
                        {packageData?.packageSpecificDate?.map((range) => {
                            const startDateStr = dayjs(range.startdaterange).format('YYYY-MM-DD');

                            const label = `${dayjs(range.startdaterange).format('MMM D')} - ${dayjs(range.enddaterange).format('MMM D')}`;

                            const price =
                                (packageData?.packagePricePerPax || 0) + (range.extrarate || 0);

                            return (
                                <div
                                    key={startDateStr}
                                    className={`budget-card ${selectedStartDate === startDateStr ? 'selected' : ''
                                        }`}
                                    onClick={() => {
                                        setSelectedStartDate(startDateStr);
                                        onDateChange?.(startDateStr);
                                    }}
                                >
                                    <div className="budget-card-info">
                                        <span className='budget-card-daterange'> <span className='budget-card-daterange-dates'>Dates:</span> {label}</span>

                                        {price != null && (
                                            <span className="range-price">
                                                ₱{price.toLocaleString()} / pax
                                            </span>
                                        )}
                                    </div>


                                    <span className="range-slots">
                                        {range.slots} slots left
                                    </span>
                                </div>
                            );
                        })}

                        <div>
                            <h3>
                                You have selected: {selectedStartDate ? dayjs(selectedStartDate).format('MMMM D, YYYY') : 'None'}
                            </h3>
                        </div>
                    </div>


                </div>



                <div className="choose-date-actions">
                    <Button
                        className="choose-date-proceed"
                        onClick={handleProceed}
                        disabled={!selectedStartDate}
                    >
                        Proceed
                    </Button>
                    <Button
                        className="choose-date-cancel"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}