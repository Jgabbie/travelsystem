import React, { useEffect, useState } from 'react'
import { Modal, Button } from 'antd'
import '../../style/components/modals/allinorlandarrangementmodal.css'

export default function AllInOrLandArrangementModal({
    open,
    onCancel,
    onProceed,
    onSelect,
    defaultSelection
}) {
    const [selection, setSelection] = useState(defaultSelection || null)

    //reset selection when modal opens
    useEffect(() => {
        if (!open) return
        setSelection(defaultSelection || null)
    }, [open, defaultSelection])

    //toggle function for arrangement selection
    const handleSelect = (value) => {
        setSelection(value)
        if (onSelect) onSelect(value)
    }

    //handle proceed with selected arrangement
    const handleProceed = () => {
        if (!selection) return
        if (onProceed) onProceed(selection)
    }

    //cancel and reset selection
    const handleCancel = () => {
        setSelection(null)
        if (onSelect) onSelect(null)
        if (onCancel) onCancel()
    }

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            footer={null}
            className="arrangement-modal"
            width={900}
        >
            <div className="arrangement-content">
                <h1 className='arrangement-heading'>Select Your Package Arrangement</h1>
                <div className="arrangement-cards">
                    <button
                        type="button"
                        className={`arrangement-card${selection === 'fixed' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('fixed')}
                    >
                        <div className="arrangement-image fixed" aria-hidden="true" />
                        <h3>All in Package</h3>
                        <p>
                            Flights, hotels, transfers, and curated activities bundled for a
                            worry-free trip.
                        </p>
                    </button>

                    <button
                        type="button"
                        className={`arrangement-card${selection === 'private' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('private')}
                    >
                        <div className="arrangement-image private" aria-hidden="true" />
                        <h3>Customized Package</h3>
                        <p>
                            Build your own itinerary by selecting preferred hotels, activities, and other
                            additional inclusions to create a personalized travel experience.
                        </p>
                    </button>
                </div>

                <div className="arrangement-actions">
                    <Button
                        className="arrangement-proceed"
                        onClick={handleProceed}
                        disabled={!selection}
                    >
                        Proceed
                    </Button>
                    <Button
                        className="arrangement-cancel"
                        onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
