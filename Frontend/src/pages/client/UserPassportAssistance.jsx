import React from 'react'
import '../../style/client/userpassportassistance.css'
import TopNavUser from '../../components/topnav/TopNavUser'


export default function UserPassportAssistance() {

    return (
        <div>
            <div className="passport-assistance">
                <h2>Passport Assistance</h2>
                <div className="passport-card-grid">
                    <div className="passport-card" role="button" tabIndex={0}>
                        <h3>New Passport</h3>
                        <p>Apply for a passport for first-time applicants.</p>
                    </div>
                    <div className="passport-card" role="button" tabIndex={0}>
                        <h3>Renew Passport</h3>
                        <p>Renew your existing passport quickly.</p>
                    </div>
                </div>
            </div>
        </div>

    )
}
