import React, { useEffect, useState } from 'react';
import { Modal, Button, Space } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import '../../style/components/modals/choosedateintmodal.css';

export default function ChooseDateIntModal({
    open,
    onCancel,
    onProceed,
    packageData,
    selectedDate,
    selectedDatePrice,
    selectedDateRate,
    onDateChange
}) {
    const [selectedStartDate, setSelectedStartDate] = useState(null);
    const [selectedEndDate, setSelectedEndDate] = useState(null);

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
        if (!selectedStartDate || !selectedEndDate) return;
        console.log('Proceeding with date:', selectedStartDate, 'and price:', selectedDatePrice);
        onProceed({ selectedDate: selectedStartDate, selectedTravelerPrice: selectedDatePrice, selectedTravelerRate: selectedDateRate });
    };

    const handleCancel = () => {
        setSelectedStartDate(null);
        setSelectedEndDate(null);
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
                <h3 className='choose-date-secondheading'>Available Dates for <span style={{ fontWeight: "bold" }}>{packageData?.packageName}</span></h3>

                <div className="budget-range-section">
                    <div className="budget-cards-container">
                        {packageData?.packageSpecificDate?.map((range) => {
                            const startDateStr = dayjs(range.startdaterange).format('YYYY-MM-DD');
                            const endDateStr = dayjs(range.enddaterange).format('YYYY-MM-DD');

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
                                        setSelectedEndDate(endDateStr);

                                        onDateChange?.({
                                            date: startDateStr,
                                            price: price,
                                            rate: range.extrarate || 0
                                        });
                                    }}
                                >
                                    <div className="budget-card-info">
                                        <span className='budget-card-daterange'>
                                            <span className="budget-card-icon">
                                                <CalendarOutlined />
                                            </span>
                                            <span className='budget-card-daterange-dates'>Dates:</span> {label}
                                        </span>

                                        {price != null && (
                                            <span className="range-price">
                                                ₱{packageData.packagePricePerPax?.toLocaleString()} / pax  <span className='range-price-extrarate'>{range.extrarate === 0 ? '' : `+ ₱${range.extrarate?.toLocaleString()} extra`}</span>
                                            </span>
                                        )}
                                    </div>


                                    <span className="range-slots">
                                        {range.slots} slots left
                                    </span>
                                </div>
                            );
                        })}

                    </div>


                </div>



                <div className="choose-date-actions">
                    <div className="left-content">
                        <h3>
                            You have selected: <span style={{ fontWeight: "bold" }}>{selectedStartDate ? dayjs(selectedStartDate).format('MMMM D, YYYY') + ' - ' + dayjs(selectedEndDate).format('MMMM D, YYYY') : 'None'}</span>
                        </h3>
                    </div>

                    <div className="right-actions">
                        <Button
                            className="choose-date-proceed"
                            onClick={handleProceed}
                            disabled={!selectedStartDate || !selectedEndDate}
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
            </div>
        </Modal>
    );
}