import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  const isSecure = (process.env.SMTP_PORT || '587') === '465';
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Only disable certificate validation in development
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });

  return transporter;
};

// Initialize transporter
const transporter = createTransporter();

// Verify transporter at startup to surface config issues early
transporter.verify()
  .then(() => {
    console.log('SMTP transporter ready');
    console.log(`Using SMTP server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  })
  .catch(err => {
    console.error('SMTP transporter verification failed. Please check your SMTP configuration.');
    console.error('Error details:', err?.message || err);
    console.log('Using fallback to console.log for email sending');
  });

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #26c66e;">Password Reset Request</h2>
      <p>You requested to reset your password for your Connections account.</p>
      <p>Your OTP (One-Time Password) is:</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #26c66e; letter-spacing: 8px; margin: 0;">${otp}</h1>
      </div>
      <p>This OTP will expire in <strong>5 minutes</strong>.</p>
      <p>If you didn't request this password reset, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated email. Please do not reply to this email.
      </p>
    </div>
  `;

  // In development, log the email to console for testing
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n===== EMAIL PREVIEW =====');
    console.log(`To: ${email}`);
    console.log(`Subject: Password Reset OTP - Connections`);
    console.log(`OTP: ${otp}`);
    console.log('========================\n');
  }

  try {
    const from = `"Connections" <${process.env.SMTP_USER}>`;
    
    const info = await transporter.sendMail({
      from,
      to: email,
      subject: 'Password Reset OTP - Connections',
      html: emailContent,
    });

    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending email via SMTP:', error);
    console.log('Falling back to console.log for email content');
    
    // Fallback to console.log if SMTP fails
    console.log('\n===== EMAIL SEND FAILED - CONTENT BELOW =====');
    console.log(`To: ${email}`);
    console.log(`Subject: Password Reset OTP - Connections`);
    console.log(`OTP: ${otp}`);
    console.log('==========================================\n');
    
    // Don't throw error in development to allow testing the flow
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to send OTP email');
    }
  }
};

export const sendVerificationEmail = async (email: string, otp: string): Promise<void> => {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #26c66e;">Verify Your Email</h2>
      <p>Welcome to Connections! Use the code below to verify your email address.</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #26c66e; letter-spacing: 8px; margin: 0;">${otp}</h1>
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated email. Please do not reply to this email.
      </p>
    </div>
  `;

  if (process.env.NODE_ENV !== 'production') {
    console.log('\n===== EMAIL VERIFICATION PREVIEW =====');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your email - Connections`);
    console.log(`OTP: ${otp}`);
    console.log('=====================================\n');
  }

  try {
    const from = `"Connections" <${process.env.SMTP_USER}>`;
    const info = await transporter.sendMail({
      from,
      to: email,
      subject: 'Verify your email - Connections',
      html: emailContent,
    });
    console.log('Verification email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending verification email via SMTP:', error);
    console.log('Falling back to console.log for email content');
    console.log('\n===== EMAIL VERIFICATION SEND FAILED - CONTENT BELOW =====');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your email - Connections`);
    console.log(`OTP: ${otp}`);
    console.log('========================================================\n');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to send verification email');
    }
  }
};
