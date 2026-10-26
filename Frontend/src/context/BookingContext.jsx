import { createContext, useContext, useEffect, useState } from "react";


const BookingContext = createContext();
const STORAGE_KEY = "bookingData";
const storage = typeof window !== "undefined" ? window.sessionStorage : null;

export const BookingProvider = ({ children }) => {
    const [bookingData, setBookingData] = useState(() => {
        try {
            const savedData = storage?.getItem(STORAGE_KEY);
            return savedData ? JSON.parse(savedData) : null;
        } catch (error) {
            console.error("Failed to read booking data from storage:", error);
            return null;
        }
    });

    useEffect(() => {
        try {
            if (bookingData) {
                storage?.setItem(STORAGE_KEY, JSON.stringify(bookingData));
            } else {
                storage?.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error("Failed to write booking data to storage:", error);
        }
    }, [bookingData]);


    const clearBookingData = () => {
        setBookingData(null);
        storage?.removeItem(STORAGE_KEY);
    };



    return (
        <BookingContext.Provider value={{ bookingData, setBookingData, clearBookingData }}>
            {children}
        </BookingContext.Provider>
    );
};

export const useBooking = () => useContext(BookingContext);