import React, { useState } from 'react'
import { Modal, Button, message } from 'antd'
import '../../style/components/modals/travelersmodal.css'

const INITIAL_COUNTS = {
    adult: 1,
    child: 0,
    infant: 0,
    senior: 0
}

export default function TravelersModal({
    open,
    onCancel,
    onProceed,
    defaultCounts
}) {
    const [counts, setCounts] = useState(defaultCounts || INITIAL_COUNTS)


    //if minus or pluse button is clicked, update the counts state accordingly and make sure adult count is at least 1 and child, infant, senior counts are at least 0
    const increaseAdult = () =>
        setCounts(prev => ({ ...prev, adult: prev.adult + 1 }))

    const decreaseAdult = () =>
        setCounts(prev => ({ ...prev, adult: Math.max(1, prev.adult - 1) }))

    const increaseChild = () =>
        setCounts(prev => ({ ...prev, child: prev.child + 1 }))

    const decreaseChild = () =>
        setCounts(prev => ({ ...prev, child: Math.max(0, prev.child - 1) }))

    const increaseInfant = () =>
        setCounts(prev => ({ ...prev, infant: prev.infant + 1 }))

    const decreaseInfant = () =>
        setCounts(prev => ({ ...prev, infant: Math.max(0, prev.infant - 1) }))

    const increaseSenior = () =>
        setCounts(prev => ({ ...prev, senior: prev.senior + 1 }))

    const decreaseSenior = () =>
        setCounts(prev => ({ ...prev, senior: Math.max(0, prev.senior - 1) }))

    const handleProceed = () => {
        if (counts.adult < 2) {
            message.error('At least 2 adults required')
            return
        }
        if (onProceed) onProceed(counts)
        setCounts(INITIAL_COUNTS)
    }

    const handleCancel = () => {
        setCounts(INITIAL_COUNTS)
        if (onCancel) onCancel()
    }

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            footer={null}
            centered
            className="travelers-modal"
            width={980}
        >
            <div className="travelers-content">
                <h3 className="travelers-title">Travelers</h3>
                <div className="travelers-header">
                    <span>Passengers</span>
                    <span>Quantity</span>
                </div>
                <div className="travelers-cards">
                    <div className="traveler-card">
                        <h3>Adult</h3>
                        <p>Age 18+</p>
                        <div className="traveler-counter">
                            <button type="button" onClick={decreaseAdult}>-</button>
                            <span>{counts.adult}</span>
                            <button type="button" onClick={increaseAdult}>+</button>
                        </div>
                    </div>

                    <div className="traveler-card">
                        <h3>Child</h3>
                        <p>Age 3-17</p>
                        <div className="traveler-counter">
                            <button type="button" onClick={decreaseChild}>-</button>
                            <span>{counts.child}</span>
                            <button type="button" onClick={increaseChild}>+</button>
                        </div>
                    </div>

                    <div className="traveler-card">
                        <h3>Infant</h3>
                        <p>Age 0-2</p>
                        <div className="traveler-counter">
                            <button type="button" onClick={decreaseInfant}>-</button>
                            <span>{counts.infant}</span>
                            <button type="button" onClick={increaseInfant}>+</button>
                        </div>
                    </div>

                    <div className="traveler-card">
                        <h3>Senior/PWD</h3>
                        <p>60+ or PWD</p>
                        <div className="traveler-counter">
                            <button type="button" onClick={decreaseSenior}>-</button>
                            <span>{counts.senior}</span>
                            <button type="button" onClick={increaseSenior}>+</button>
                        </div>
                    </div>
                </div>

                <div className="travelers-actions">
                    <Button
                        className="travelers-proceed"
                        onClick={handleProceed}
                    >
                        Proceed
                    </Button>
                    <Button className="travelers-cancel" onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
