// services/email.js
const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Sends an email using SendGrid or logs it if no API key is present.
 * 
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 * @returns {Promise<boolean>} - True if sent, false otherwise
 */
async function sendEmail(to, subject, text, html = "") {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
    console.log(`[Email Mock] Body: ${text}`);
    return true;
  }

  try {
    const msg = {
      to,
      from: process.env.EMAIL_FROM || 'noreply@ailucius.com', // Use verified sender
      subject,
      text,
      html: html || text,
    };

    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return false;
  }
}

module.exports = { sendEmail };
