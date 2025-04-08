require('dotenv').config();
const { sendEmail } = require('./utils/emailService');

async function testEmail() {
  try {
    console.log('Testing email with these credentials:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '******' : 'Not set');

    const info = await sendEmail(
      'manishchaudhary946@gmail.com',
      'Test Email from Task Manager',
      'This is a test email to verify the email configuration is working properly.'
    );

    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('Failed to send email:');
    console.error(error);
  }
}

testEmail(); 