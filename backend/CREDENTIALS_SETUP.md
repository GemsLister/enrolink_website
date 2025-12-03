# Credentials Setup Guide

## 🔒 Security Best Practices

1. **Never commit credentials to Git**
   - All `.env` files are in `.gitignore`
   - Use `.env.example` as a template

2. **Use Environment Variables**
   - Store sensitive data in environment variables
   - Use `.env` file for local development
   - Use your hosting platform's environment variable settings for production

3. **Rotate Credentials Regularly**
   - Change passwords and secrets periodically
   - Revoke and regenerate API keys if compromised

## 📋 Required Credentials

### 1. MongoDB Atlas
- `MONGODB_ATLAS_URI_HEAD` - Connection string for Head database
- `MONGODB_ATLAS_URI_OFFICERS` - Connection string for Officers database

### 2. Google Calendar Service Account
You have three options:

**Option A: Use GCP_CREDENTIALS (Recommended for production)**
```env
GCP_CREDENTIALS={"type":"service_account","project_id":"enrolink",...}
```

**Option B: Use GOOGLE_APPLICATION_CREDENTIALS with file path**
```env
GOOGLE_APPLICATION_CREDENTIALS=./enrolink-service-account.json
```

**Option C: Place service account JSON as `svc.json` in backend root**
- The system will automatically detect it

### 3. Google OAuth (for user login)
- `GOOGLE_CLIENT_ID` - OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET` - OAuth 2.0 Client Secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL

### 4. JWT Secret
Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. SMTP (for password reset emails)
- `SMTP_HOST` - SMTP server (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP port (usually 465 or 587)
- `SMTP_USER` - Your email address
- `SMTP_PASS` - App-specific password (not your regular password)

## 🚀 Quick Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual credentials in `.env`

3. For Google Calendar, ensure your service account has:
   - Calendar API enabled
   - Appropriate permissions on the calendar

4. Restart your backend server after updating credentials

## ⚠️ Important Notes

- The file `d41d8cd9.env` is kept for backward compatibility but should be migrated to `.env`
- Never share your `.env` file or commit it to version control
- Use different credentials for development and production



