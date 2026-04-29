import { createContext, useContext, useEffect, useState } from "react";

// 'storage' is used to persist booking data across page reloads within the same session. It uses sessionStorage, which is cleared when the browser tab is closed.
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

    //CLEAR BOOKING DATA FROM CONTEXT AND STORAGE, USE THIS WHEN BOOKING IS COMPLETED OR CANCELLED TO PREVENT STALE DATA

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