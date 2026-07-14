import transporter from '../config/nodemailer.js';
import { buildBrandedEmail } from '../utils/emailTemplate.js';


//send contact email function
const sendContactEmail = async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        await transporter.sendMail({
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: process.env.COMPANY_EMAIL, //use actual company email here
            replyTo: process.env.COMPANY_EMAIL, //use actual company email here
            subject,
            html: buildBrandedEmail({
                title: 'New Inquiry Details',
                introHtml: `
                    A new inquiry has been submitted through the
                    M&RC Travel and Tours website.
                `,
                bodyHtml: `
                    <div
                        style="
                            margin:8px 0 14px;
                            background:#f8fafc;
                            border:1px solid #e2e8f0;
                            border-radius:10px;
                            overflow:hidden;
                        "
                    >
                        <div
                            style="
                                padding:12px 16px;
                                border-bottom:1px solid #e2e8f0;
                            "
                        >
                            <p
                                style="
                                    margin:0;
                                    font-size:13px;
                                    color:#64748b;
                                "
                            >
                                Subject
                            </p>

                            <p
                                style="
                                    margin:4px 0 0;
                                    font-weight:700;
                                    color:#1e293b;
                                "
                            >
                                ${subject}
                            </p>
                        </div>

                        <div
                            style="
                                padding:12px 16px;
                                border-bottom:1px solid #e2e8f0;
                            "
                        >
                            <p
                                style="
                                    margin:0;
                                    font-size:13px;
                                    color:#64748b;
                                "
                            >
                                Name
                            </p>

                            <p
                                style="
                                    margin:4px 0 0;
                                    color:#1e293b;
                                "
                            >
                                ${name}
                            </p>
                        </div>

                        <div
                            style="
                                padding:12px 16px;
                                border-bottom:1px solid #e2e8f0;
                            "
                        >
                            <p
                                style="
                                    margin:0;
                                    font-size:13px;
                                    color:#64748b;
                                "
                            >
                                Email Address
                            </p>

                            <p
                                style="
                                    margin:4px 0 0;
                                    color:#1e293b;
                                "
                            >
                                ${email}
                            </p>
                        </div>

                        <div style="padding:12px 16px;">
                            <p
                                style="
                                    margin:0 0 8px;
                                    font-size:13px;
                                    color:#64748b;
                                "
                            >
                                Message
                            </p>

                            <div
                                style="
                                    margin:0;
                                    padding:14px 16px;
                                    background:#ffffff;
                                    border-left:4px solid #992A46;
                                    border-radius:6px;
                                    color:#334155;
                                    line-height:1.6;
                                    white-space:pre-wrap;
                                "
                            >
                                ${message}
                            </div>
                        </div>
                    </div> 

                    <p style="margin:0; font-size:13px; color:#64748b;"
                    >
                        You may reply directly to this email to contact
                        the sender.
                    </p>
                `,
            })
        });

        await transporter.sendMail({
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: email,
            subject: 'Email Received - M&RC Travel and Tours',
            html: buildBrandedEmail({
                title: 'Inquiry Received',
                introHtml: `Hello <strong>${name}</strong>,`,
                bodyHtml: `
                    <p style="margin:0 0 12px;">
                        Thank you for contacting M&RC Travel and Tours.
                    </p>

                    <p style="margin:0 0 12px;">
                        Your inquiry has been received successfully.
                        Our team will review your message and get back
                        to you as soon as possible.
                    </p>

                    <div
                        style="
                            margin:16px 0;
                            padding:14px 16px;
                            background:#f8fafc;
                            border:1px solid #e2e8f0;
                            border-radius:10px;
                        "
                    >
                        <p
                            style="
                                margin:0 0 6px;
                                font-size:13px;
                                color:#64748b;
                            "
                        >
                            Inquiry Subject
                        </p>

                        <p
                            style="
                                margin:0;
                                font-weight:700;
                                color:#1e293b;
                            "
                        >
                            ${subject}
                        </p>
                    </div>

                    <p
                        style="
                            margin:18px 0 0;
                            font-size:13px;
                            color:#64748b;
                        "
                    >
                        If you did not submit this inquiry, please ignore
                        this email.
                    </p>
                `,
            })
        });

        res.status(200).json({ message: 'Email sent successfully' });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send email' });
    }
}


export {
    sendContactEmail
};
