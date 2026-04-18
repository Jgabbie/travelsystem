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
            style={{ top: 55 }}
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
                        <p style={{ textAlign: "justify" }}>
                            In this selection, you will receive a fixed itinerary based on the current package. This allows you to proceed with the booking process without any changes to the package details.
                        </p>
                    </button>

                    <button
                        type="button"
                        className={`arrangement-card${selection === 'private' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('private')}
                    >
                        <div className="arrangement-image private" aria-hidden="true" />
                        <h3>Private Tour</h3>
                        <p style={{ textAlign: "justify" }}>
                            In this selection, you can customize the itinerary of the current package. This allows you to send quotation request for more personalized experience.
                        </p>
                        <p style={{ color: "#FF4D4F", fontWeight: "500", textAlign: "justify" }}>
                            Note: This option may have a higher price than the All in Package arrangement, as it offers more flexibility and customization. The final price will depend on the specific changes you request.
                        </p>
                    </button>
                </div>

                <div className="arrangement-actions">
                    <Button
                        type='primary'
                        className="arrangement-proceed"
                        onClick={handleProceed}
                        disabled={!selection}
                    >
                        Proceed
                    </Button>
                    <Button
                        type='primary'
                        className="arrangement-cancel"
                        onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
