import { createContext, useContext, useEffect, useState } from "react";

const BookingQuotationContext = createContext();
const STORAGE_KEY = "quotation_booking_session";

export const QuotationBookingProvider = ({ children }) => {
    const [quotationBookingData, setQuotationBookingData] = useState(() => {
        try {
            const savedData = sessionStorage.getItem(STORAGE_KEY);
            return savedData ? JSON.parse(savedData) : null;
        } catch (error) {
            console.error("Failed to read quotation booking data from storage:", error);
            return null;
        }
    });

    useEffect(() => {
        try {
            if (quotationBookingData) {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(quotationBookingData));
            } else {
                sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error("Failed to write quotation booking data to storage:", error);
        }
    }, [quotationBookingData]);

    const clearQuotationBookingData = () => {
        setQuotationBookingData(null);
        sessionStorage.removeItem(STORAGE_KEY);
    };

    return (
        <BookingQuotationContext.Provider value={{ quotationBookingData, setQuotationBookingData, clearQuotationBookingData }}>
            {children}
        </BookingQuotationContext.Provider>
    );
};

export const useQuotationBooking = () => useContext(BookingQuotationContext);