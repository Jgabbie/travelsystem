import React, { useEffect, useState } from 'react'
import { Modal, Button } from 'antd'
import '../style/addonsmodal.css'

const ADD_ONS = [
    {
        key: 'extra-baggage',
        title: 'Extra baggage',
        description: 'Add more luggage allowance for a smoother trip.',
        image: '/images/extrabaggage.jpg'
    },
    {
        key: 'flight-meals',
        title: 'Flight meals',
        description: 'Pre-select meals and dietary preferences for your flight.',
        image: '/images/flightmeals.jpg'
    },
    {
        key: 'airportpickup',
        title: 'Airport pickup',
        description: 'Get a convenient pickup service at the airport.',
        image: '/images/flightentertainment.jpg'
    },
    {
        key: 'optional-tours',
        title: 'Optional tours',
        description: 'Add guided activities or day trips to your itinerary.',
        image: '/images/optionaltour.jpg'
    }
]

export default function AddOnsModal({
    open,
    onCancel,
    onProceed,
    onSelect,
    defaultSelection
}) {
    const [selection, setSelection] = useState(defaultSelection || [])

    // to reset the selection when modal opens
    useEffect(() => {
        if (!open) return
        setSelection(defaultSelection || [])
    }, [open, defaultSelection])

    // toggle function for add-ons
    const handleToggle = (value) => {
        const nextSelection = selection.includes(value)
            ? selection.filter((item) => item !== value)
            : [...selection, value]
        setSelection(nextSelection)
        if (onSelect) onSelect(nextSelection)
    }

    //proceed with the add-ons values that were selected
    const handleProceed = () => {
        if (onProceed) onProceed(selection)
    }

    //cancel and resets the collection
    const handleCancel = () => {
        setSelection([])
        if (onSelect) onSelect([])
        if (onCancel) onCancel()
    }

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            footer={null}
            centered
            className="addons-modal"
            width={900}
        >
            <div className="addons-content">
                <div className="addons-cards">
                    {ADD_ONS.map((addOn) => (
                        <button
                            key={addOn.key}
                            type="button"
                            className={`addons-card${selection.includes(addOn.key) ? ' is-selected' : ''
                                }`}
                            onClick={() => handleToggle(addOn.key)}
                        >
                            <div className="addons-image" style={{ backgroundImage: `url(${addOn.image})` }} aria-hidden="true" />
                            <h3>{addOn.title}</h3>
                            <p>{addOn.description}</p>
                        </button>
                    ))}
                </div>

                <div className="addons-actions">
                    <Button className="addons-proceed" onClick={handleProceed}>
                        Proceed
                    </Button>
                    <Button className="addons-cancel" onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
