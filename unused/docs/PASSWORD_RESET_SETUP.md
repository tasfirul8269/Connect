# Password Reset & Remember Me Features - Setup Guide

## 🎉 What's Been Implemented

### 1. **Remember Me** ✅
- Checkbox on login page saves email to localStorage
- Email auto-fills on next visit if "Remember Me" was checked
- Clears saved email when unchecked

### 2. **Forgot Password Flow** ✅
Complete 3-step password reset process:
- **Step 1:** Enter email address
- **Step 2:** Enter 6-digit OTP (sent via email)
- **Step 3:** Create new password

## 📋 Setup Instructions

### Step 1: Run Database Migration

```sql
-- Copy and paste this into your Neon SQL Editor:

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);
```

### Step 2: Configure SMTP for Email Sending

#### Option A: Using Gmail (Recommended for testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password

3. **Add to your `.env` file:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password_here
```

#### Option B: Using Other SMTP Providers

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your_mailgun_username
SMTP_PASS=your_mailgun_password
```

**AWS SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_aws_access_key
SMTP_PASS=your_aws_secret_key
```

### Step 3: Restart Backend

```bash
cd backend
npm run dev
```

## 🧪 Testing the Features

### Testing Remember Me

1. Go to login page
2. Enter email and password
3. Check "Remember Me"
4. Log in successfully
5. Log out
6. Return to login page
7. **Expected:** Email field is pre-filled

### Testing Forgot Password

#### Step 1: Request OTP
1. Go to `/forgot-password`
2. Enter a registered email
3. Click "Send OTP"
4. **Expected:** 
   - Success message
   - OTP sent to email
   - Move to Step 2

#### Step 2: Verify OTP
1. Check your email for 6-digit OTP
2. Enter the OTP in the 6 boxes
3. Click "Verify OTP"
4. **Expected:**
   - OTP verified
   - Move to Step 3

#### Step 3: Reset Password
1. Enter new password
2. Confirm new password
3. Click "Reset Password"
4. **Expected:**
   - Success message on login page
   - Can log in with new password

### Testing OTP Expiry
1. Request OTP
2. Wait more than 5 minutes
3. Try to verify OTP
4. **Expected:** "Invalid or expired OTP" error

### Testing OTP Resend
1. Request OTP
2. On OTP screen, click "Resend OTP"
3. Check email for new OTP
4. **Expected:** New OTP received

## 🔒 Security Features

### OTP System
- ✅ 6-digit numeric code
- ✅ 5-minute expiry
- ✅ One-time use (marked as used after verification)
- ✅ Deleted after successful password reset
- ✅ Old OTPs deleted when new one is requested

### Password Reset
- ✅ Temporary reset token (10-minute validity)
- ✅ Minimum 6-character password requirement
- ✅ Password confirmation validation
- ✅ Bcrypt hashing

### Auth Provider Protection
- ✅ Users with Google/Facebook auth cannot reset password via email
- ✅ Clear error messages directing to correct auth method

## 📧 Email Template

The OTP email includes:
- Professional design with your brand color (#26c66e)
- Clear 6-digit OTP display
- 5-minute expiry warning
- Security notice

## 🎨 UI Features

### Forgot Password Page
- **Step Indicator:** Clear title/description for each step
- **OTP Input:** 6 separate boxes with auto-focus
- **Error Handling:** Red error messages for all failures
- **Loading States:** Disabled buttons during API calls
- **Resend OTP:** Easy resend button on OTP step
- **Password Visibility:** Toggle icons for password fields
- **Back to Login:** Link on all steps

### Remember Me
- **Clean Checkbox:** Native checkbox with custom styling
- **Persistent:** Survives browser refreshes
- **Secure:** Only stores email, not password

## 🐛 Troubleshooting

### SMTP Errors

**"Failed to send OTP"**
- Check SMTP credentials in `.env`
- For Gmail: Ensure App Password is used (not regular password)
- Check internet connection
- Verify SMTP host and port

**"Invalid credentials"**
- For Gmail: Make sure 2FA is enabled and App Password is generated
- For other providers: Verify API keys/credentials

### Database Errors

**"password_reset_otps table doesn't exist"**
- Run the migration SQL from Step 1
- Check database connection

### OTP Not Received

**Check:**
1. Spam/Junk folder
2. SMTP_USER matches sender email
3. Backend console for errors
4. Email provider quotas (Gmail: 500/day)

## 📊 Backend Endpoints

### Send OTP
```
POST /auth/forgot-password/send-otp
Body: { "email": "user@example.com" }
Response: { "message": "OTP sent successfully to your email" }
```

### Verify OTP
```
POST /auth/forgot-password/verify-otp
Body: { "email": "user@example.com", "otp": "123456" }
Response: { "message": "OTP verified successfully", "resetToken": "jwt_token" }
```

### Reset Password
```
POST /auth/forgot-password/reset-password
Body: { "resetToken": "jwt_token", "newPassword": "newpass123" }
Response: { "message": "Password reset successfully" }
```

## 🔐 Environment Variables Summary

Add these to `backend/.env`:

```env
# Existing variables...
DATABASE_URL=...
JWT_SECRET=...
PORT=5000

# Add these for password reset:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_16_char_app_password
```

## ✨ Features Summary

| Feature | Status |
|---------|--------|
| Remember Me checkbox | ✅ Working |
| Email persistence | ✅ Working |
| Forgot Password link | ✅ Working |
| 3-step reset flow | ✅ Working |
| OTP generation | ✅ Working |
| Email sending | ✅ Working |
| OTP verification | ✅ Working |
| Password reset | ✅ Working |
| 5-minute OTP expiry | ✅ Working |
| Resend OTP | ✅ Working |
| Security validations | ✅ Working |

## 🚀 You're All Set!

Both features are now fully functional. Just configure your SMTP settings and run the migration!
