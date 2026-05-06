import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, DatePicker, Switch, Space } from 'antd';
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
    const [searchText, setSearchText] = useState('');
    const [filterDate, setFilterDate] = useState(null);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);

    const onClearFilters = () => {
        setSearchText('');
        setFilterDate(null);
        setShowAvailableOnly(false);
    }

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
            centered={true}
        >
            <div className="choose-date-int-content">
                <h1 className="choose-date-heading">Select Preferred Date</h1>
                <h3 className='choose-date-secondheading'>
                    Available Dates for <span style={{ fontWeight: "bold" }}>{packageData?.packageName}</span>
                </h3>

                <div style={{ marginBottom: 12 }} className="choose-date-filters">
                    <Space direction="horizontal" size="small">
                        <Input.Search
                            placeholder="Search dates (e.g. Mar, Apr)"
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 220 }}
                        />

                        <DatePicker
                            placeholder="Filter by date"
                            value={filterDate}
                            onChange={(d) => setFilterDate(d)}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Switch checked={showAvailableOnly} onChange={(v) => setShowAvailableOnly(v)} />
                            <span style={{ fontSize: 12 }}>Show available only</span>
                        </div>

                        <Button type="primary" className="choose-date-clear" onClick={onClearFilters}>Clear</Button>
                    </Space>
                </div>

                <div className="budget-range-section">
                    <div className="budget-cards-container">
                        {(packageData?.packageSpecificDate || []).filter((range) => {
                            const startDate = dayjs(range.startdaterange);
                            const endDate = dayjs(range.enddaterange);

                            // search filter (matches the label)
                            const label = `${startDate.format('MMM D')} - ${endDate.format('MMM D')}`;
                            if (searchText && !label.toLowerCase().includes(searchText.toLowerCase())) return false;

                            // date filter: keep ranges that include the selected date
                            if (filterDate) {
                                const d = dayjs(filterDate).startOf('day');
                                if (!(d.isSame(startDate, 'day') || d.isSame(endDate, 'day') || (d.isAfter(startDate, 'day') && d.isBefore(endDate, 'day')))) {
                                    return false;
                                }
                            }

                            // availability filter (robust: check multiple possible slot fields and date validity)
                            if (showAvailableOnly) {
                                const availableCount = Number(
                                    (range.slots !== undefined && range.slots !== null && range.slots !== '') ? range.slots
                                        : (range.availableSlots !== undefined && range.availableSlots !== null && range.availableSlots !== '') ? range.availableSlots
                                            : (range.available !== undefined && range.available !== null && range.available !== '') ? range.available
                                                : 0
                                );

                                const today = dayjs().startOf('day');
                                const startDate = dayjs(range.startdaterange);
                                // treat ranges that start today or earlier as unavailable
                                const isPastOrToday = startDate.isSameOrBefore(today);

                                if (Number.isNaN(availableCount) || availableCount <= 0 || isPastOrToday) return false;
                            }

                            return true;
                        }).map((range) => {
                            const startDate = dayjs(range.startdaterange);
                            const endDate = dayjs(range.enddaterange);

                            const label = `${startDate.format('MMM D')} - ${endDate.format('MMM D')}`;
                            const price = (packageData?.packagePricePerPax || 0) + (range.extrarate || 0);

                            const today = dayjs().startOf('day');
                            const isPastOrToday = startDate.isSameOrBefore(today);
                            const isSoldOut = Number(range.slots || 0) <= 0;

                            const isSelected =
                                selectedDateRange.startDate?.isSame(startDate, 'day') &&
                                selectedDateRange.endDate?.isSame(endDate, 'day');

                            return (
                                <div
                                    key={startDate.format('YYYY-MM-DD') + endDate.format('YYYY-MM-DD')}
                                    className={`budget-card ${isSelected ? 'selected' : ''} ${(isPastOrToday || isSoldOut) ? 'disabled' : ''}`}
                                    onClick={() => {
                                        if (isPastOrToday || isSoldOut) return; // prevent selecting today, past dates, or sold out
                                        const newRange = { startDate, endDate };
                                        setSelectedDateRange(newRange);

                                        onDateChange?.({
                                            date: { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') },
                                            price: price,
                                            rate: range.extrarate || 0,
                                            slots: Number(range.slots || 0)
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
                        <h3 style={{ fontSize: 12 }}>
                            You have selected: <span style={{ fontWeight: "bold" }}>
                                {selectedDateRange.startDate && selectedDateRange.endDate
                                    ? `${selectedDateRange.startDate.format('MMMM D, YYYY')} - ${selectedDateRange.endDate.format('MMMM D, YYYY')}`
                                    : 'None'}
                            </span>
                        </h3>
                    </div>

                    <div className="right-actions">
                        <Button
                            type='primary'
                            className="choose-date-proceed"
                            onClick={handleProceed}
                            disabled={!selectedDateRange.startDate || !selectedDateRange.endDate}
                        >
                            Proceed
                        </Button>
                        <Button
                            type='primary'
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