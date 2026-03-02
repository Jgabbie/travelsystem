import React, { useEffect, useState } from 'react'
import { Modal, Button } from 'antd'
import '../style/fixedorcustomizedmodal.css'

export default function FixedOrCustomized({
    open,
    onCancel,
    onProceed,
    selection,
    onSelect
}) {
    //handle selection
    const handleSelect = (value) => {
        onSelect?.(value)
    }
    //proceed
    const handleProceed = () => {
        if (!selection) return
        onProceed?.(selection)
    }

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            footer={null}
            className="fixed-custom-modal"
            width={900}
        >
            <div className="fixed-custom-content">
                <div className="fixed-custom-cards">
                    <button
                        type="button"
                        className={`fixed-custom-card${selection === 'fixed' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('fixed')}
                    >
                        <div className="fixed-custom-image fixed" aria-hidden="true" />
                        <h3>Fixed Package</h3>
                        <p>Choose the standard itinerary and inclusions prepared by the agency.</p>
                    </button>

                    <button
                        type="button"
                        className={`fixed-custom-card${selection === 'custom' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('custom')}
                    >
                        <div className="fixed-custom-image custom" aria-hidden="true" />
                        <h3>Customized Package</h3>
                        <p>Build a flexible trip by customizing activities, hotels, and add-ons.</p>
                    </button>
                </div>

                <div className="fixed-custom-actions">
                    <Button
                        className="fixed-custom-proceed"
                        onClick={handleProceed}
                        disabled={!selection}
                    >
                        Proceed
                    </Button>
                    <Button className="fixed-custom-cancel" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}