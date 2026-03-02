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
            const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
            setSelectedStartDate(dateStr);
        } else {
            setSelectedStartDate(null);
        }
    }, [selectedDate]);

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
            style={{ top: 90 }}
        >
            <div className="choose-date-int-content">
                <h1 className="choose-date-heading">Select Date</h1>

                <div className="budget-range-section">
                    <div className="budget-cards-container">
                        {packageData?.packageSpecificDate?.map((range) => {
                            const startDateStr = dayjs(range[0]).format('YYYY-MM-DD'); // no time
                            const endDateStr = dayjs(range[1]).format('YYYY-MM-DD');   // no time
                            const label = `${dayjs(range[0]).format('MMM D')} - ${dayjs(range[1]).format('MMM D')}`;
                            const price = packageData?.packagePricePerPax;

                            return (
                                <div
                                    key={startDateStr}
                                    className={`budget-card ${selectedStartDate === startDateStr ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedStartDate(startDateStr);
                                        onDateChange?.(startDateStr);
                                    }}
                                >
                                    <span>{label}</span>
                                    {price != null && (
                                        <span className="range-price">
                                            ₱{price.toLocaleString()} / pax
                                        </span>
                                    )}
                                </div>
                            );
                        })}
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