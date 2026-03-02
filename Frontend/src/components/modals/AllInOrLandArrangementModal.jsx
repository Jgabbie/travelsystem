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
                        className={`arrangement-card${selection === 'all-in' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('all-in')}
                    >
                        <div className="arrangement-image all-in" aria-hidden="true" />
                        <h3>All in Package</h3>
                        <p>
                            Flights, hotels, transfers, and curated activities bundled for a
                            worry-free trip.
                        </p>
                    </button>

                    <button
                        type="button"
                        className={`arrangement-card${selection === 'land' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('land')}
                    >
                        <div className="arrangement-image land" aria-hidden="true" />
                        <h3>Customized All in Package</h3>
                        <p>
                            Focus on accommodations and tours while arranging your own
                            flights.
                        </p>
                    </button>

                    {/* New selection option */}
                    <button
                        type="button"
                        className={`arrangement-card${selection === 'custom' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('custom')}
                    >
                        <div className="arrangement-image custom" aria-hidden="true" />
                        <h3>Customized Land Arrangement</h3>
                        <p>
                            Build your own package by selecting flights, hotels, and activities individually.
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
                    <Button className="arrangement-cancel" onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
