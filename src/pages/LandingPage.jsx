import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/LandingPage.css';

export default function LandingPage() {
    const navigate = useNavigate();

   
    const [isVerified, setIsVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Default true to avoid flash
    const [budget, setBudget] = useState(16000); // For the slider

    useEffect(() => {
        const checkVerification = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/auth/is-auth', {
                    method: "POST",
                    credentials: "include"
                });
                if (response.ok) {
                    setIsVerified(true);
                } else {
                    setIsVerified(false);
                }
            } catch (err) {
                setIsVerified(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkVerification();
    }, []);

    const logout = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8000/api/auth/logoutUser', {}, { withCredentials: true });
            alert("Logout Successful");
            navigate('/login');
        } catch (err) {
            console.error("Error logging out", err);
        }
    };

    const goToSignup = () => navigate('/signup');
    const goToLogin = () => navigate('/login');

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="landing-container">
            {/* --- 1. NAVBAR --- */}
            <nav className="navbar">
                <div className="logo-section">
                    <img src="" alt="Logo" className="logo-img" />
                    <span>M&RC Travel and Tours</span>
                </div>
                
                <div className="nav-links">
                    <span className="regsignin">REGISTER | SIGN IN</span>
                    
                 
                
                </div>
            </nav>

            
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                <h1>TEXT HERE!!!</h1>
                <p>TEXT HERE!!!!!!!!!!!!!!!!!!!!!!!!</p>
                </div>

                
                <div className="search-widget">
                    
                    
                    <div className="search-row">
                        <input type="text" placeholder="Search here..." className="search-input" />
                        <button className="search-btn">🔍</button>
                    </div>

                    
                    <div className="filter-row">
                        
                       
                        <div className="filter-group">
                            <label>ACTIVITIES</label>
                            <select className="filter-select">
                                <option>Adventure Type</option>
                                <option>Beach</option>
                                <option>Hiking</option>
                                <option>City Tour</option>
                            </select>
                        </div>

                        
                        <div className="filter-group">
                            <label>DURATION</label>
                            <select className="filter-select">
                                <option>Length of Stay</option>
                                <option>1 day</option>
                                <option>67 years</option>
                                <option>forever</option>
                            </select>
                        </div>

                        
                        <div className="filter-group">
                            <label>PAX</label>
                            <select className="filter-select">
                                <option>Number of Travelers</option>
                                <option>1 Person</option>
                                <option>Group (2+)</option>
                            </select>
                        </div>

                       
                        <div className="filter-group" style={{minWidth: '200px'}}>
                            <label>BUDGET</label>
                            <div className="budget-labels">
                                <span>₱12,000</span>
                                <span>₱{budget.toLocaleString()}</span>
                            </div>
                            <input 
                                type="range" 
                                min="12000" 
                                max="50000" 
                                step="1000"
                                value={budget}
                                onChange={(e) => setBudget(Number(e.target.value))}
                                className="budget-slider" 
                            />
                        </div>

                    </div>
                </div>
            </div>

           
            <div style={{ textAlign: 'center', marginTop: '80px', paddingBottom: '50px' }}>
                <a href="#packages" style={{ margin: '0 20px', fontWeight: 'bold', color: '#0056b3', textDecoration: 'none' }}>Popular Packages</a>
                <a href="#explore" style={{ margin: '0 20px', fontWeight: 'bold', color: '#0056b3', textDecoration: 'none' }}>Explore Now!</a>
            </div>
            
         
           
        </div>
    );
}