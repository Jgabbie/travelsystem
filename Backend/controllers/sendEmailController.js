const transporter = require('../config/nodemailer')

const sendContactEmail = async (req, res) => {
    const { name, email, message } = req.body;
    console.log('Received contact form submission:', { name, email, message });

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        await transporter.sendMail({
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: process.env.SENDER_EMAIL,
            replyTo: email,
            subject: `Contact Form Submission from ${name}`,
            html: `<p><strong>Name:</strong> ${name}</p>
           <p><strong>Email:</strong> ${email}</p>
           <p><strong>Message:</strong><br>${message}</p>`
        });

        await transporter.sendMail({
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: email,
            subject: 'We Received Your Message',
            html: `<p>Dear ${name},</p>
                    <p>Thank you for reaching out to M&RC Travel and Tours. We have received your message and will get back to you as soon as possible.</p>
                    <p>Best regards,<br>M&RC Travel and Tours Team</p>`
        });

        res.status(200).json({ message: 'Email sent successfully' });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send email' });
    }
}

module.exports = { sendContactEmail };