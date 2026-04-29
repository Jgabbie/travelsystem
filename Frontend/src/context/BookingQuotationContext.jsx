import { createContext, useContext, useEffect, useState } from "react";

const BookingQuotationContext = createContext();
const STORAGE_KEY = "quotation_booking_session";
const storage = typeof window !== "undefined" ? window.sessionStorage : null;

export const QuotationBookingProvider = ({ children }) => {
    const [quotationBookingData, setQuotationBookingData] = useState(() => {
        try {
            const savedData = storage?.getItem(STORAGE_KEY);
            return savedData ? JSON.parse(savedData) : null;
        } catch (error) {
            console.error("Failed to read quotation booking data from storage:", error);
            return null;
        }
    });

    useEffect(() => {
        try {
            if (quotationBookingData) {
                storage?.setItem(STORAGE_KEY, JSON.stringify(quotationBookingData));
            } else {
                storage?.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error("Failed to write quotation booking data to storage:", error);
        }
    }, [quotationBookingData]);

    const clearQuotationBookingData = () => {
        setQuotationBookingData(null);
        storage?.removeItem(STORAGE_KEY);
    };

    const clearBookingData = clearQuotationBookingData;

    return (
        <BookingQuotationContext.Provider value={{ quotationBookingData, setQuotationBookingData, clearQuotationBookingData, clearBookingData }}>
            {children}
        </BookingQuotationContext.Provider>
    );
};

export const useQuotationBooking = () => useContext(BookingQuotationContext);