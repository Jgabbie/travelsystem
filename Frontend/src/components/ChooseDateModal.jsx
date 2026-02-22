import React from 'react';
import { Modal, Calendar, Button } from 'antd';
import dayjs from 'dayjs';
import '../style/choosedatemodal.css';

export default function ChooseDateModal({
    open,
    onCancel,
    onProceed,
    packageData,
    selectedDate,
    onDateChange
}) {
    //disable dates before one month from today
    const minSelectableDate = dayjs().add(1, 'month').startOf('day');
    const maxSelectableDate = dayjs('2036-12-31');

    const handleDateChange = (value) => {
        if (value.isBefore(minSelectableDate, 'day')) return;
        onDateChange(value);
    };

    //proceed with selected date
    const handleProceed = () => {
        if (!selectedDate) return;
        onProceed();
    };

    //cancel and reset selected date
    const handleCancel = () => {
        onDateChange(null);
        onCancel?.();
    };

    //value of the calendar
    const calendarValue = selectedDate || minSelectableDate;

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            footer={null}
            className="choose-date-modal"
            width={860}
        >
            <div className="choose-date-content">
                <div className="choose-date-left">
                    <Calendar
                        fullscreen={false}
                        value={calendarValue}
                        onSelect={handleDateChange}
                        validRange={[minSelectableDate, maxSelectableDate]}
                        disabledDate={(current) =>
                            current && current.isBefore(minSelectableDate, 'day')
                        }
                    />
                </div>
                <div className="choose-date-right">
                    <h3 className="choose-date-title">{packageData?.packageName || 'Package'}</h3>
                    <p className="choose-date-description">
                        {packageData?.packageDescription || 'No description available.'}
                    </p>
                    <p className="choose-date-selected">
                        Selected date: {selectedDate ? selectedDate.format('MMM D, YYYY') : 'None'}
                    </p>
                    <div className="choose-date-actions">
                        <Button
                            className="choose-date-proceed"
                            onClick={handleProceed}
                            disabled={!selectedDate}
                        >
                            Proceed
                        </Button>
                        <Button className="choose-date-cancel" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
