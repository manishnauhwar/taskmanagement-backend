const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password', 
  },
});

/**
 * Send an email notification to a user
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Email text content
 * @param {string} html - Email HTML content (optional)
 * @returns {Promise} - Nodemailer send result
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to,
      subject,
      text,
      html: html || text,
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send a notification email
 * @param {Object} user - User object with email property
 * @param {Object} notification - Notification object
 * @returns {Promise} - Nodemailer send result
 */
const sendNotificationEmail = async (user, notification) => {
  const subject = `New Notification: ${notification.title}`;
  const text = `
    Hello ${user.fullname},
    
    You have a new notification:
    
    ${notification.title}
    
    ${notification.message}
    
    Type: ${notification.type}
    
    This is an automated message, please do not reply.
  `;

  return await sendEmail(user.email, subject, text);
};

module.exports = {
  sendEmail,
  sendNotificationEmail
}; 