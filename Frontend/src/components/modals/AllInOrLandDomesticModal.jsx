import React, { useEffect, useState } from 'react'
import { Modal, Button } from 'antd'
import '../../style/components/modals/allinorlanddomesticmodal.css'

export default function AllInOrLandDomesticModal({
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

    //toggle function for arrangement-domestic selection
    const handleSelect = (value) => {
        setSelection(value)
        if (onSelect) onSelect(value)
    }

    //handle proceed with selected arrangement-domestic
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
            className="arrangement-domestic-modal"
            width={900}
        >
            <div className="arrangement-domestic-content">
                <h1 className='arrangement-domestic-heading'>Select Your Package Arrangement</h1>
                <div className="arrangement-domestic-cards">

                    <button
                        type="button"
                        className={`arrangement-domestic-card${selection === 'customallin' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('customallin')}
                    >
                        <div className="arrangement-domestic-image land" aria-hidden="true" />
                        <h3>Customized All in Package</h3>
                        <p>
                            Focus on accommodations and tours while arranging your own
                            flights.
                        </p>
                    </button>

                    {/* New selection option */}
                    <button
                        type="button"
                        className={`arrangement-domestic-card${selection === 'customland' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('customland')}
                    >
                        <div className="arrangement-domestic-image custom" aria-hidden="true" />
                        <h3>Customized Land Arrangement</h3>
                        <p>
                            Build your own package by selecting flights, hotels, and activities individually.
                        </p>
                    </button>
                </div>

                <div className="arrangement-domestic-actions">
                    <Button
                        className="arrangement-domestic-proceed"
                        onClick={handleProceed}
                        disabled={!selection}
                    >
                        Proceed
                    </Button>
                    <Button className="arrangement-domestic-cancel" onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
