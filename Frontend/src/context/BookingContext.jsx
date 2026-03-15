import { createContext, useContext, useEffect, useState } from "react";

const BookingContext = createContext();
const STORAGE_KEY = "bookingData";

export const BookingProvider = ({ children }) => {
    const [bookingData, setBookingData] = useState(() => {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            return savedData ? JSON.parse(savedData) : null;
        } catch (error) {
            console.error("Failed to read booking data from storage:", error);
            return null;
        }
    });

    useEffect(() => {
        try {
            if (bookingData) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(bookingData));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error("Failed to write booking data to storage:", error);
        }
    }, [bookingData]);

    return (
        <BookingContext.Provider value={{ bookingData, setBookingData }}>
            {children}
        </BookingContext.Provider>
    );
};

export const useBooking = () => useContext(BookingContext);