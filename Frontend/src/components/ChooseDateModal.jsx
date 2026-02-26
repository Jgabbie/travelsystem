import React, { useEffect, useState } from 'react';
import { Modal, Calendar, Button, Spin } from 'antd';
import dayjs from 'dayjs';
import '../style/choosedatemodal.css';
import axiosInstance from '../config/axiosConfig';


//https://www.searchapi.io/api/v1/search?api_key=ADVN8SdRyVACYcrAVn7Vut41&arrival_id=CEB&departure_id=MNL&engine=google_flights_calendar&flight_type=one_way&outbound_date=2026-03-04&outbound_date_end=2026-03-27&outbound_date_start=2026-03-04

export default function ChooseDateModal({
    open,
    onCancel,
    onProceed,
    packageData,
    selectedDate,
    onDateChange
}) {
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(false);

    const minSelectableDate = dayjs().add(1, 'month').startOf('day');
    const maxSelectableDate = dayjs('2036-12-31');

    const calendarValue = selectedDate || minSelectableDate;

    // Fetch prices for the package when modal opens
    // useEffect(() => {
    //     if (!open || !packageData) return;

    //     const fetchPrices = async () => {
    //         setLoading(true);
    //         try {
    //             // Example: call your backend API
    //             const monthStr = calendarValue.format('YYYY-MM');
    //             const res = await axiosInstance.get('/flights/calendar', {
    //                 params: {
    //                     origin: "MNL",
    //                     destination: "CEB",
    //                     month: monthStr
    //                 }
    //             });

    //             // Convert API data into a map: { '2026-03-01': 2450, ... }
    //             const priceMap = {};
    //             res.data.forEach(item => {
    //                 priceMap[item.date] = item.price;
    //             });

    //             setPrices(priceMap);
    //         } catch (err) {
    //             console.error('Error fetching prices:', err);
    //         } finally {
    //             setLoading(false);
    //         }
    //     };

    //     fetchPrices();
    // }, [open, packageData, calendarValue]);

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

    const minPrice = Object.values(prices).filter(p => p != null).length
        ? Math.min(...Object.values(prices).filter(p => p != null))
        : null;

    const dateRender = (currentDate) => {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const price = prices[dateStr];

        return (
            <div
                className="calendar-cell"
                style={{
                    backgroundColor: price === minPrice ? '#d6f5d6' : undefined, // highlight cheapest
                    borderRadius: 4
                }}
            >
                <div>{currentDate.date()}</div>
                {price !== undefined && (
                    <div className="calendar-price">₱{price}</div>
                )}
            </div>
        );
    };

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
                        disabledDate={(current) => current && current.isBefore(minSelectableDate, 'day')}
                        dateRender={dateRender}   // ✅ the new official prop
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
