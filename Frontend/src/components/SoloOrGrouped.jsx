import React, { useState } from 'react'
import { Modal, Button } from 'antd'
import '../style/soloorgroupedmodal.css'

export default function SoloOrGrouped({
    open,
    onCancel,
    onProceed,
    onSelect,
    selection
}) {

    //select function
    const handleSelect = (value) => {
        onSelect?.(value)
    }

    const handleProceed = () => {
        if (!selection) return
        onProceed?.(selection)
    }

    const handleCancel = () => {
        if (onSelect) onSelect(null)
        if (onCancel) onCancel()
    }

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            footer={null}
            className="solo-group-modal"
            width={900}
        >
            <div className="solo-group-content">
                <div className="solo-group-cards">
                    <button
                        type="button"
                        className={`solo-group-card${selection === 'solo' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('solo')}
                    >
                        <div className="solo-group-image solo" aria-hidden="true" />
                        <h3>Solo Booking</h3>
                        <p>
                            Book for yourself with a single traveler setup and dedicated itinerary.
                        </p>
                    </button>

                    <button
                        type="button"
                        className={`solo-group-card${selection === 'group' ? ' is-selected' : ''}`}
                        onClick={() => handleSelect('group')}
                    >
                        <div className="solo-group-image group" aria-hidden="true" />
                        <h3>Grouped Booking</h3>
                        <p>
                            Plan a trip for a group with shared activities and split arrangements.
                        </p>
                    </button>
                </div>

                <div className="solo-group-actions">
                    <Button
                        className="solo-group-proceed"
                        onClick={handleProceed}
                        disabled={!selection}
                    >
                        Proceed
                    </Button>
                    <Button className="solo-group-cancel" onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
