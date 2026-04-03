import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
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
    // Single object for start and end dates
    dayjs.extend(isSameOrBefore);
    const [selectedDateRange, setSelectedDateRange] = useState({ startDate: null, endDate: null });

    // Sync local selection with parent
    useEffect(() => {
        if (selectedDate) {
            const d = dayjs(selectedDate);
            if (d.isValid()) {
                setSelectedDateRange({ startDate: d, endDate: d }); // store as dayjs object
            }
        } else {
            setSelectedDateRange({ startDate: null, endDate: null });
        }
    }, [selectedDate, packageData]);

    const handleProceed = () => {
        const { startDate, endDate } = selectedDateRange;
        if (!startDate || !endDate) return;

        console.log('Proceeding with date:', startDate, 'and price:', selectedDatePrice);
        onProceed({
            selectedDate: startDate,
            selectedTravelerPrice: selectedDatePrice,
            selectedTravelerRate: selectedDateRate
        });
    };

    const handleCancel = () => {
        setSelectedDateRange({ startDate: null, endDate: null });
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
                <h3 className='choose-date-secondheading'>
                    Available Dates for <span style={{ fontWeight: "bold" }}>{packageData?.packageName}</span>
                </h3>

                <div className="budget-range-section">
                    <div className="budget-cards-container">
                        {packageData?.packageSpecificDate?.map((range) => {
                            const startDate = dayjs(range.startdaterange);
                            const endDate = dayjs(range.enddaterange);

                            const label = `${startDate.format('MMM D')} - ${endDate.format('MMM D')}`;
                            const price = (packageData?.packagePricePerPax || 0) + (range.extrarate || 0);

                            const today = dayjs().startOf('day');
                            const isPastOrToday = startDate.isSameOrBefore(today);

                            const isSelected =
                                selectedDateRange.startDate?.isSame(startDate, 'day') &&
                                selectedDateRange.endDate?.isSame(endDate, 'day');

                            return (
                                <div
                                    key={startDate.format('YYYY-MM-DD') + endDate.format('YYYY-MM-DD')}
                                    className={`budget-card ${isSelected ? 'selected' : ''} ${isPastOrToday ? 'disabled' : ''}`}
                                    onClick={() => {
                                        if (isPastOrToday) return; // prevent selecting today or past dates
                                        const newRange = { startDate, endDate };
                                        setSelectedDateRange(newRange);

                                        onDateChange?.({
                                            date: { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') },
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
                                                ₱{packageData.packagePricePerPax?.toLocaleString()} / pax
                                                <span className='range-price-extrarate'>
                                                    {range.extrarate === 0 ? '' : `+ ₱${range.extrarate?.toLocaleString()} extra`}
                                                </span>
                                            </span>
                                        )}
                                    </div>

                                    <span
                                        className="range-slots"
                                        style={range.slots < 10 ? { color: 'red', fontWeight: 'bold' } : {}}
                                    >
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
                            You have selected: <span style={{ fontWeight: "bold" }}>
                                {selectedDateRange.startDate && selectedDateRange.endDate
                                    ? `${selectedDateRange.startDate.format('MMMM D, YYYY')} - ${selectedDateRange.endDate.format('MMMM D, YYYY')}`
                                    : 'None'}
                            </span>
                        </h3>
                    </div>

                    <div className="right-actions">
                        <Button
                            className="choose-date-proceed"
                            onClick={handleProceed}
                            disabled={!selectedDateRange.startDate || !selectedDateRange.endDate}
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