import React, { useMemo, useState } from 'react'
import { Modal, Button } from 'antd'
import '../style/customizebookingmodal.css'

const AIRLINE_OPTIONS = [
    'Cebu Pacific Air',
    'AirAsia',
    'Philippine Airlines',
    'Singapore Airlines',
    'Emirates',
    'Qatar Airways'
]

const HOTEL_OPTIONS = [
    {
        stars: '3 Star Hotels',
        options: ['Bloom Hotel', 'Pine Lodge Inn', 'Garden View Lodge']
    },
    {
        stars: '4 Star Hotels',
        options: ['Summit Hotel', 'Aura One Hotel', 'Ridgewood Hotel']
    },
    {
        stars: '5 Star Hotels',
        options: ['Plaza Garden Hotel', 'Grand Baguio Resort']
    }
]

//toggle selection with limit
const togglePick = (current, value, limit) => {
    if (current.includes(value)) {
        return current.filter((item) => item !== value)
    }
    if (current.length >= limit) {
        return current
    }
    return [...current, value]
}

export default function CustomizeBookingModal({
    open,
    onCancel,
    onProceed,
    defaultAirlines = [],
    defaultHotels = []
}) {

    const [airlinePicks, setAirlinePicks] = useState(defaultAirlines)
    const [hotelPicks, setHotelPicks] = useState(defaultHotels)

    //if airlines or hotels picks change, update the state
    const airlineHint = useMemo(() => (
        airlinePicks.length ? `Selected ${airlinePicks.length}/3` : 'Select up to 3'
    ), [airlinePicks.length])

    const hotelHint = useMemo(() => (
        hotelPicks.length ? `Selected ${hotelPicks.length}/3` : 'Select up to 3'
    ), [hotelPicks.length])

    //proceed with selected airlines and hotels and make sure the user selected 3 of each
    const handleProceed = () => {
        if (airlinePicks.length !== 3 || hotelPicks.length !== 3) return
        if (onProceed) onProceed({ airlines: airlinePicks, hotels: hotelPicks })
        setAirlinePicks([])
        setHotelPicks([])
    }

    //cancel and reset selections
    const handleCancel = () => {
        setAirlinePicks([])
        setHotelPicks([])
        if (onCancel) onCancel()
    }

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            footer={null}
            centered
            className="customize-booking-modal"
            width={980}
        >
            <div className="customize-booking-content">
                <div className="customize-booking-grid">
                    <div className="customize-card">
                        <div className="customize-card-header">
                            <h3>Airlines</h3>
                            <span>{airlineHint}</span>
                        </div>
                        <p className="customize-card-subtext">
                            Pick your top 3 airlines. The order you select sets your preference.
                        </p>
                        <div className="customize-options">
                            {AIRLINE_OPTIONS.map((airline) => {
                                const rank = airlinePicks.indexOf(airline)
                                return (
                                    <button
                                        key={airline}
                                        type="button"
                                        className={`customize-option${rank >= 0 ? ' is-selected' : ''}`}
                                        onClick={() =>
                                            setAirlinePicks((prev) => togglePick(prev, airline, 3))
                                        }
                                    >
                                        <span className="customize-option-label">{airline}</span>
                                        {rank >= 0 && (
                                            <span className="customize-option-rank">#{rank + 1}</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="customize-card">
                        <div className="customize-card-header">
                            <h3>Hotels</h3>
                            <span>{hotelHint}</span>
                        </div>
                        <p className="customize-card-subtext">
                            Choose up to 3 hotels. The order you select sets your preference.
                        </p>
                        <div className="customize-hotels">
                            {HOTEL_OPTIONS.map((group) => (
                                <div key={group.stars} className="customize-hotel-group">
                                    <h4>{group.stars}</h4>
                                    <div className="customize-options">
                                        {group.options.map((hotel) => {
                                            const rank = hotelPicks.indexOf(hotel)
                                            return (
                                                <button
                                                    key={hotel}
                                                    type="button"
                                                    className={`customize-option${rank >= 0 ? ' is-selected' : ''}`}
                                                    onClick={() =>
                                                        setHotelPicks((prev) => togglePick(prev, hotel, 3))
                                                    }
                                                >
                                                    <span className="customize-option-label">{hotel}</span>
                                                    {rank >= 0 && (
                                                        <span className="customize-option-rank">#{rank + 1}</span>
                                                    )}
                                                </button>
                                            )
                                        }
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="customize-booking-actions">
                    <Button
                        className="customize-booking-proceed"
                        onClick={handleProceed}
                        disabled={airlinePicks.length !== 3 || hotelPicks.length !== 3}
                    >
                        Proceed
                    </Button>
                    <Button className="customize-booking-cancel" onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
