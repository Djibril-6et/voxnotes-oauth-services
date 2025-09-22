# 🔐 OAuth Authentication Service

OAuth 2.0 microservice handling secure user authentication and authorization for the voice transcription platform. Supports multiple providers with session management and automatic user registration.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Authentication:** Passport.js
- **Session Management:** express-session
- **Template Engine:** EJS
- **Supported Providers:** Google, GitHub, Discord
- **HTTP Client:** Axios (for API communication)

## 🌟 Features

- **Multi-Provider OAuth:** Google, GitHub, Discord authentication
- **Automatic User Registration:** Creates users in database service automatically
- **Email Conflict Detection:** Prevents email duplication across providers
- **Session Management:** Secure session handling with passport
- **Error Handling:** Comprehensive error handling with user-friendly redirects
- **Provider Validation:** Ensures users stick to their original provider

## 📋 Prerequisites

- Node.js (v14 or higher)
- Database service running on port 9090
- OAuth applications configured for each provider
- Frontend application running on port 9010

## ⚙️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd oauth-service
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```env
PORT=9020
SESSION_SECRET=your_super_secret_session_key

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_SECRET_KEY=your_github_secret_key
GITHUB_CALLBACK_URL=http://localhost:9020/auth/github/callback

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:9020/auth/google/callback

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_SECRET_KEY=your_discord_secret_key
DISCORD_CALLBACK_URL=http://localhost:9020/auth/discord/callback
```

## 🔧 OAuth App Configuration

### GitHub OAuth App
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - **Homepage URL:** `http://localhost:9010`
   - **Authorization callback URL:** `http://localhost:9020/auth/github/callback`

### Google OAuth App  
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID with:
   - **Authorized redirect URIs:** `http://localhost:9020/auth/google/callback`

### Discord OAuth App
1. Go to Discord Developer Portal > Applications
2. Create a new application and add OAuth2 redirect:
   - **Redirect URI:** `http://localhost:9020/auth/discord/callback`

## 🚀 Running the Service

### Development Mode
```bash
npm start
```

The service will be available at `http://localhost:9020`

## 📡 API Endpoints

### Authentication Routes

#### Google Authentication
```
GET    /auth/google              - Initiate Google OAuth
GET    /auth/google/callback     - Handle Google OAuth callback
GET    /auth/google/success      - Google auth success page
GET    /auth/google/error        - Google auth error page
GET    /auth/google/signout      - Sign out Google user
```

#### GitHub Authentication
```
GET    /auth/github              - Initiate GitHub OAuth
GET    /auth/github/callback     - Handle GitHub OAuth callback
GET    /auth/github/success      - GitHub auth success page
GET    /auth/github/error        - GitHub auth error page
GET    /auth/github/signout      - Sign out GitHub user
```

#### Discord Authentication
```
GET    /auth/discord             - Initiate Discord OAuth
GET    /auth/discord/callback    - Handle Discord OAuth callback
GET    /auth/discord/success     - Discord auth success page
GET    /auth/discord/error       - Discord auth error page
GET    /auth/discord/signout     - Sign out Discord user
```

### General Routes
```
GET    /                         - Authentication page (EJS template)
```

## 🔄 Authentication Flow

1. **User clicks OAuth provider button** → Redirects to `/auth/{provider}`
2. **Provider authentication** → User authenticates with provider
3. **Callback handling** → Service receives user data from provider
4. **Email validation** → Checks if email exists with different provider
5. **User creation/login** → Creates new user or logs in existing user
6. **Success redirect** → Redirects to frontend with user data

## 🎯 Redirect URLs

### Success Redirects
```
http://localhost:9010/profile?provider={provider}&username={username}&email={email}&_id={user_id}
```

### Error Redirects
```
http://localhost:9010/connexion?error=email_exists&email={email}
http://localhost:9010/connexion?error=username_exists
http://localhost:9010/connexion?error=auth_error
http://localhost:9010/connexion?error=auth_failed
http://localhost:9010/connexion?error=login_error
http://localhost:9010/connexion?error=user_not_found
http://localhost:9010/connexion?error=callback_error
```

## 🗄️ Database Integration

The service communicates with the database service (`http://localhost:9090`) for:

- **User verification:** `POST /api/users/check`
- **User creation:** `POST /api/users/register`

### User Registration Payload
```javascript
{
  username: String, // from provider profile
  email: String, // from provider profile
  provider: String, // 'google', 'github', 'discord'
  password: String // hashed default password
}
```

## 🔒 Security Features

- **Provider Isolation:** Users cannot use same email across different providers
- **Session Security:** Secure session management with secret key
- **Email Validation:** Automatic email retrieval and validation
- **Error Handling:** Secure error responses without data leaks
- **CORS Protection:** Cross-origin request handling

## 📁 Project Structure

```
oauth-service/
├── src/
│   └── controllers/
│       ├── google-auth.js
│       ├── github-auth.js
│       └── discord-auth.js
├── views/
│   ├── auth.ejs
│   └── success.ejs
├── index.js
├── package.json
└── .env
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 9020) |
| `SESSION_SECRET` | Session encryption secret | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Yes |
| `GITHUB_SECRET_KEY` | GitHub OAuth secret key | Yes |
| `GITHUB_CALLBACK_URL` | GitHub callback URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Yes |
| `GOOGLE_CALLBACK_URL` | Google callback URL | Yes |
| `DISCORD_CLIENT_ID` | Discord OAuth client ID | Yes |
| `DISCORD_SECRET_KEY` | Discord OAuth secret | Yes |
| `DISCORD_CALLBACK_URL` | Discord callback URL | Yes |

## 🐳 Docker Support

### Dockerfile
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 9020
CMD ["npm", "start"]
```

### Docker Compose Integration
```yaml
version: '3.8'
services:
  oauth-service:
    build: .
    ports:
      - "9020:9020"
    environment:
      - PORT=9020
      - SESSION_SECRET=${SESSION_SECRET}
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_SECRET_KEY=${GITHUB_SECRET_KEY}
      # ... other OAuth vars
    depends_on:
      - database-service
```

## 🤝 Integration with Other Services

This service integrates with:
- **Database Service (9090):** User registration and validation
- **Frontend Application (9010):** Success/error redirects
- **OAuth Providers:** Google, GitHub, Discord APIs

## 🚨 Error Handling

### Common Error Codes
- `EMAIL_ALREADY_EXISTS`: Email used by different provider
- `USERNAME_ALREADY_EXISTS`: Username already taken
- `AUTH_ERROR`: General authentication error
- `AUTH_FAILED`: Authentication failed
- `LOGIN_ERROR`: Login process error
- `USER_NOT_FOUND`: User not found after creation
- `CALLBACK_ERROR`: Callback processing error

## 📊 Provider-Specific Behavior

### Google OAuth
- Uses `profile` and `email` scopes
- Reliable email from profile
- Uses `displayName` as username

### GitHub OAuth  
- Uses `user:email` scope
- Fetches email via API if not in profile
- Fallback to `{username}@users.noreply.github.com`
- Uses `username` field

### Discord OAuth
- Uses `identify` and `email` scopes  
- Direct email from profile
- Uses `username` field

## 🧪 Testing

### Manual Testing
1. Start the service: `npm start`
2. Navigate to `http://localhost:9020`
3. Test each provider authentication
4. Verify redirects and error handling

## 📈 Health Check

The service doesn't expose a dedicated health endpoint, but you can check:
```
GET /
```
Returns the authentication page if service is running.

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.