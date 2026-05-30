# Taraa Backend

NestJS REST API for Taraa Fashion Jewellery — powers product catalogue, orders, payments, authentication, and media uploads.

- **Live API:** your Render URL
- **Swagger docs:** `https://your-render-url.onrender.com/api/docs`
- **Local:** `http://localhost:3001/api/v1`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 10 (TypeScript) |
| Database | MongoDB Atlas via Mongoose 9 |
| Auth | JWT (access + refresh tokens), Google OAuth, Firebase Phone OTP |
| Payments | Razorpay |
| Media | Cloudinary |
| Email | Nodemailer (Gmail / SMTP) |
| Deployment | Render (Node.js) |

---

## Prerequisites

- Node.js 20+
- npm 9+
- MongoDB Atlas account
- Cloudinary account
- Razorpay account
- Firebase project (for phone OTP)
- Google Cloud OAuth credentials (for Google login)

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/srinivasmirchi27/taraa-backend.git
cd taraa-backend

# 2. Install dependencies
npm install

# 3. Create env file
cp .env.example .env.development
# Fill in all values in .env.development

# 4. Start dev server (watch mode)
npm run start:dev
```

Server starts at **http://localhost:3001/api/v1**  
Swagger UI at **http://localhost:3001/api/docs**

---

## Environment Variables

Copy `.env.example` to `.env.development` and fill in:

```env
PORT=3001
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/taraa

# JWT
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=15m

# Cloudinary — console.cloudinary.com
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Razorpay — dashboard.razorpay.com → Settings → API Keys
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Firebase Admin SDK — Firebase Console → Project Settings → Service Accounts
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Google OAuth — console.cloud.google.com → APIs & Services → Credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000

# Nodemailer
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=       # Gmail App Password
MAIL_FROM_NAME=Taraa
MAIL_FROM_ADDRESS=noreply@taraa.in
```

---

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with hot reload |
| `npm run start:prod` | Production (runs compiled dist/) |
| `npm run build` | Compile TypeScript → dist/ |
| `npm run build:prod` | Production build |
| `npm run lint` | ESLint check |
| `npm test` | Unit tests |

---

## API Reference

> Full docs with request/response samples: [API.md](./API.md)  
> Interactive: `http://localhost:3001/api/docs`

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Register new customer |
| POST | `/auth/login` | — | Login with email + password |
| POST | `/auth/refresh` | — | Get new access token from refresh token |
| POST | `/auth/logout` | 🔒 | Revoke current device refresh token |
| POST | `/auth/logout-all` | 🔒 | Revoke all refresh tokens (all devices) |
| GET | `/auth/google` | — | Google OAuth redirect (web) |
| GET | `/auth/google/callback` | — | Google OAuth callback |
| POST | `/auth/google/token` | — | Google ID token login (mobile/SPA) |

### OTP / Phone Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/otp/send` | — | Send 6-digit OTP to phone |
| POST | `/auth/otp/verify` | — | Verify OTP → returns JWT |
| POST | `/auth/phone-login` | — | Exchange Firebase phone auth token → JWT |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | 🔒 | Get own profile |
| PATCH | `/users/me` | 🔒 | Update own profile |
| GET | `/users` | 🔒 Admin | List all users |
| GET | `/users/:id` | 🔒 Admin | Get user by ID |
| PATCH | `/users/:id/role` | 🔒 Super Admin | Change user role |
| DELETE | `/users/:id` | 🔒 Super Admin | Delete user |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | — | List products (filter by category, search, inStock) |
| GET | `/products/categories` | — | Get all categories |
| GET | `/products/:id` | — | Get product by ID |
| POST | `/products` | 🔒 Admin | Create product |
| PATCH | `/products/:id` | 🔒 Admin | Update product |
| DELETE | `/products/:id` | 🔒 Admin | Delete product |

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | Optional | Place order (guests allowed) |
| GET | `/orders/my` | 🔒 | Get own orders |
| GET | `/orders/:id` | 🔒 | Get order by ID |
| GET | `/orders` | 🔒 Admin | List all orders |
| PATCH | `/orders/:id/status` | 🔒 | Update order status |

### Payments (Razorpay)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/initiate` | Optional | Create Razorpay order → get popup params |
| POST | `/payments/verify` | Optional | Verify payment signature → mark order paid |
| POST | `/payments/webhook` | — | Razorpay server-side webhook |
| POST | `/payments/refund/:paymentId` | 🔒 Admin | Full or partial refund |

### Uploads (Cloudinary)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/uploads/image` | 🔒 | Upload product image (max 5MB) |
| POST | `/uploads/profile-image` | 🔒 | Upload profile picture (max 2MB) |
| DELETE | `/uploads/:publicId` | 🔒 | Delete image by public ID |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | API info |
| GET | `/health` | — | Health check |

---

## Razorpay Checkout Flow

```
1. POST /payments/initiate  →  { appOrderId, razorpayOrderId, amount, keyId }
2. Open Razorpay popup with above values
3. User pays → razorpayPaymentId + razorpaySignature returned by Razorpay
4. POST /payments/verify with all 4 IDs → order marked as paid
```

---

## Auth Flow

```
Register / Login → accessToken (15m) + refreshToken (30 days)

Refresh:   POST /auth/refresh  { refreshToken } → new accessToken
Logout:    POST /auth/logout   { refreshToken } → token revoked

Google (web):    GET /auth/google → consent screen → callback → redirect to frontend
Google (mobile): POST /auth/google/token { idToken } → accessToken + refreshToken

Phone OTP:  POST /auth/otp/send → POST /auth/otp/verify → accessToken
Firebase:   client phone auth → POST /auth/phone-login { idToken } → accessToken
```

---

## Roles

| Role | Access |
|------|--------|
| `customer` | Own profile, own orders, public products |
| `admin` | All of the above + manage products, view all orders |
| `super_admin` | All of the above + manage users, assign roles, delete accounts |

---

## Deployment (Render)

**Build Command:**
```
npm install && nest build
```

**Start Command:**
```
node dist/main
```

**Required env vars in Render Dashboard:** see [Environment Variables](#environment-variables) section above.

> MongoDB Atlas: make sure `0.0.0.0/0` is in the IP whitelist under **Security → Network Access**.

---

## Creating the First Admin

After deployment, register a normal account then promote via MongoDB Atlas:

```js
// In Atlas → Data Explorer → users collection → Edit document
{ "role": "super_admin" }
```

Or via API (with an existing super_admin token):
```bash
PATCH /users/:id/role
{ "role": "admin" }
```

---

## Project Structure

```
src/
├── auth/                    # JWT, Google OAuth, refresh tokens
│   ├── dto/
│   ├── guards/
│   ├── schemas/             # RefreshToken schema
│   └── strategies/          # JWT, Local, Google
├── firebase/                # Firebase Admin SDK provider
├── modules/
│   ├── cloudinary/          # Image upload (Cloudinary)
│   ├── mail/                # Email (Nodemailer)
│   ├── orders/              # Order management
│   ├── otp/                 # Phone OTP + Firebase phone auth
│   ├── payment/             # Razorpay payments
│   ├── products/            # Product catalogue
│   └── users/               # User management
├── guards/                  # JWT, Roles guards
├── interceptors/            # Transform, Logging
├── filters/                 # HTTP exception filter
└── main.ts                  # Bootstrap
```
