# Real-Time Email Validation - Testing Guide

## What's Been Implemented

Real-time email validation that checks if an email is already registered as the user types and leaves the email field (onBlur event).

## Features

1. **Instant Feedback**: When user enters an email and moves to the next field, the system checks if the email exists
2. **Loading Indicator**: Shows a spinner while checking email availability
3. **Visual Feedback**: 
   - Red border on email field if error exists
   - Error message appears below the email field
4. **Provider-Specific Messages**: 
   - If email exists with Google: "An account with this email already exists. Please sign in with Google."
   - If email exists with Facebook: "An account with this email already exists. Please sign in with Facebook."
   - If email exists with email/password: "This email is already registered."
5. **Prevents Form Submission**: Cannot proceed to next step if email error exists

## Files Modified

### Backend
- `backend/src/routes/auth.ts` - Added `/auth/check-email` endpoint

### Frontend
- `src/services/auth.ts` - Added `checkEmail()` function
- `src/pages/Signup.tsx` - Added real-time validation logic and UI

## How to Test

### Test 1: Email Registered with Google
1. First, sign up with Google using test1@example.com
2. Log out
3. Go to signup page and enter test1@example.com in the email field
4. Click on the password field (or press Tab)
5. **Expected**: 
   - Spinner appears briefly
   - Red border appears on email field
   - Error message: "An account with this email already exists. Please sign in with Google."
   - Cannot click "Continue" button (error prevents progression)

### Test 2: Email Registered with Facebook
1. First, sign up with Facebook using test2@example.com
2. Log out
3. Go to signup page and enter test2@example.com in the email field
4. Click on the password field (or press Tab)
5. **Expected**: 
   - Spinner appears briefly
   - Red border appears on email field
   - Error message: "An account with this email already exists. Please sign in with Facebook."

### Test 3: Email Registered with Email/Password
1. First, sign up normally with test3@example.com
2. Log out
3. Go to signup page and enter test3@example.com in the email field
4. Click on the password field (or press Tab)
5. **Expected**: 
   - Spinner appears briefly
   - Red border appears on email field
   - Error message: "This email is already registered."

### Test 4: Available Email
1. Go to signup page
2. Enter a new email like newemail@example.com
3. Click on the password field (or press Tab)
4. **Expected**: 
   - Spinner appears briefly
   - No error message
   - Green/normal border remains
   - Can continue with signup

### Test 5: Invalid Email Format
1. Go to signup page
2. Enter "notanemail" in the email field
3. Click on the password field (or press Tab)
4. **Expected**: 
   - Error message: "Please enter a valid email address"
   - Red border appears

### Test 6: Clearing Error
1. Enter an existing email (shows error)
2. Start typing to change the email
3. **Expected**: 
   - Error message disappears as you type
   - Border returns to normal

## API Endpoint Details

### POST /auth/check-email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Available):**
```json
{
  "available": true
}
```

**Response (Not Available):**
```json
{
  "available": false,
  "provider": "google",
  "message": "An account with this email already exists. Please sign in with Google."
}
```

## User Experience Flow

```
User enters email → Moves to next field (onBlur)
    ↓
System validates format
    ↓
Shows loading spinner
    ↓
Calls /auth/check-email API
    ↓
If email exists:
    - Shows red border
    - Displays provider-specific error message
    - Prevents form progression
    ↓
If email available:
    - Keeps normal styling
    - Allows form progression
```

## Edge Cases Handled

1. ✅ Network errors don't show error to user (fail silently)
2. ✅ Empty email doesn't trigger validation
3. ✅ Invalid format shows immediate error without API call
4. ✅ Completion mode (social login flow) skips email validation
5. ✅ Error clears when user starts typing again
6. ✅ Loading state shows user that check is happening

## Performance Considerations

- Validation only triggers on `onBlur` (not on every keystroke)
- Format validation happens before API call (reduces unnecessary requests)
- Loading indicator provides feedback during API call
- Debouncing not needed since validation is onBlur-based
