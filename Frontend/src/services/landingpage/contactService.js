import { sendContact } from '../../api/landingpage/contactApi';

export const sendContactService = async (data) => {
    return await sendContact(data);
};