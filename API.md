# Taraa Backend — API Reference

> Base URL: `http://localhost:3001/api/v1`  
> Interactive docs (Swagger): `http://localhost:3001/api/docs`  
> All responses are wrapped: `{ success, data, timestamp }`  
> Protected routes require: `Authorization: Bearer <accessToken>`

---

## Table of Contents
1. [Auth](#1-auth)
2. [OTP / Phone Auth](#2-otp--phone-auth)
3. [Users](#3-users)
4. [Products](#4-products)
5. [Orders](#5-orders)
6. [Payments (Razorpay)](#6-payments-razorpay)
7. [Uploads (Cloudinary)](#7-uploads-cloudinary)
8. [Health](#8-health)

---

## 1. Auth

### POST `/auth/register`
Register a new customer account. Sends a welcome email and returns tokens.

**Request**
```json
{
  "name": "Srinivas Rao",
  "email": "srinivas@example.com",
  "password": "StrongPass@123"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a3f8c2d1e4b5...",
    "expiresIn": "15m",
    "user": {
      "id": "6657a1b2c3d4e5f6a7b8c9d0",
      "email": "srinivas@example.com",
      "name": "Srinivas Rao",
      "role": "customer"
    }
  }
}
```

---

### POST `/auth/login`
Login with email and password.

**Request**
```json
{
  "email": "srinivas@example.com",
  "password": "StrongPass@123"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a3f8c2d1e4b5...",
    "expiresIn": "15m",
    "user": {
      "id": "6657a1b2c3d4e5f6a7b8c9d0",
      "email": "srinivas@example.com",
      "name": "Srinivas Rao",
      "role": "customer"
    }
  }
}
```

---

### POST `/auth/refresh`
Exchange a valid refresh token for a new access token.

**Request**
```json
{
  "refreshToken": "a3f8c2d1e4b5..."
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "15m"
  }
}
```

---

### POST `/auth/logout` 🔒
Revoke the current device's refresh token.

**Request**
```json
{
  "refreshToken": "a3f8c2d1e4b5..."
}
```

**Response `200`**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### POST `/auth/logout-all` 🔒
Revoke all refresh tokens (logout from every device).

**Response `200`**
```json
{
  "success": true,
  "data": { "message": "Logged out from all devices" }
}
```

---

### GET `/auth/google`
Redirects the browser to Google's OAuth consent screen (web flow).  
No request body. Browser is redirected automatically.

On success, Google redirects back and the server redirects to:
```
http://localhost:3000/auth/callback?accessToken=...&refreshToken=...&isNew=true
```

---

### POST `/auth/google/token`
Exchange a Google ID token (from mobile / SPA Google Sign-In SDK) for app tokens.

**Request**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a3f8c2d1e4b5...",
    "expiresIn": "15m",
    "isNew": false,
    "user": {
      "id": "6657a1b2c3d4e5f6a7b8c9d0",
      "email": "srinivas@gmail.com",
      "name": "Srinivas Rao",
      "role": "customer",
      "profileImage": "https://lh3.googleusercontent.com/..."
    }
  }
}
```

---

## 2. OTP / Phone Auth

### POST `/auth/otp/send`
Send a 6-digit OTP to a phone number.

**Request**
```json
{
  "phone": "+919876543210"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": { "message": "OTP sent successfully" }
}
```

---

### POST `/auth/otp/verify`
Verify the OTP and receive app tokens.

**Request**
```json
{
  "phone": "+919876543210",
  "otp": "482910"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewUser": true
  }
}
```

**Error `400`** — wrong or expired OTP
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

---

### POST `/auth/phone-login`
Exchange a Firebase ID token (after client-side phone auth) for app tokens.

**Request**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewUser": false
  }
}
```

---

## 3. Users

All routes require `Authorization: Bearer <accessToken>`.

### GET `/users/me` 🔒
Get the current user's profile.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "_id": "6657a1b2c3d4e5f6a7b8c9d0",
    "name": "Srinivas Rao",
    "email": "srinivas@example.com",
    "role": "customer",
    "phone": "+919876543210",
    "address": "123 MG Road, Bangalore",
    "isActive": true,
    "phoneVerified": true,
    "profileImage": null,
    "createdAt": "2026-05-01T10:00:00.000Z"
  }
}
```

---

### PATCH `/users/me` 🔒
Update own profile.

**Request**
```json
{
  "name": "Srinivas Kumar",
  "phone": "+919876543210",
  "address": "456 Brigade Road, Bangalore"
}
```

**Response `200`** — returns updated user object.

---

### GET `/users` 🔒 Admin
List all users with pagination.

**Query params:** `?page=1&limit=20`

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [ { "...user objects..." } ],
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET `/users/:id` 🔒 Admin
Get any user by ID.

---

### PATCH `/users/:id/role` 🔒 Super Admin
Assign a role to a user.

**Request**
```json
{ "role": "admin" }
```

Valid roles: `customer` | `admin` | `super_admin`

---

### DELETE `/users/:id` 🔒 Super Admin
Delete a user account.

**Response `200`**
```json
{ "success": true, "data": null }
```

---

## 4. Products

### GET `/products`
List products with optional filters.

**Query params**

| Param | Type | Example |
|-------|------|---------|
| `page` | number | `1` |
| `limit` | number | `20` |
| `category` | string | `rings` |
| `search` | string | `gold` |
| `inStock` | boolean | `true` |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "6657b1c2d3e4f5a6b7c8d9e0",
        "name": "Gold Plated Kundan Ring",
        "category": "rings",
        "price": 799,
        "originalPrice": 1299,
        "discount": 38,
        "image": "https://res.cloudinary.com/diqp8qet7/image/upload/...",
        "images": [],
        "badge": "Bestseller",
        "description": "Handcrafted gold plated kundan ring...",
        "inStock": true,
        "rating": 4.5,
        "reviews": 120,
        "isNew": false,
        "isBestSeller": true,
        "createdAt": "2026-05-01T10:00:00.000Z"
      }
    ],
    "total": 84,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

### GET `/products/categories`
Get all unique product categories.

**Response `200`**
```json
{
  "success": true,
  "data": ["rings", "necklaces", "earrings", "bangles", "anklets"]
}
```

---

### GET `/products/:id`
Get a single product by ID.

**Response `200`** — returns single product object.

**Error `404`**
```json
{ "success": false, "message": "Product 6657b1c2d3e4f5a6b7c8d9e0 not found" }
```

---

### POST `/products` 🔒 Admin
Create a new product.

**Request**
```json
{
  "name": "Silver Jhumka Earrings",
  "category": "earrings",
  "price": 599,
  "originalPrice": 899,
  "discount": 33,
  "image": "https://res.cloudinary.com/diqp8qet7/image/upload/v1/taraa/products/jhumka.jpg",
  "images": [],
  "badge": "New",
  "description": "Traditional silver jhumka earrings with intricate work.",
  "inStock": true,
  "rating": 0,
  "reviews": 0,
  "isNew": true,
  "isBestSeller": false
}
```

**Response `201`** — returns created product.

---

### PATCH `/products/:id` 🔒 Admin
Update product fields (partial update).

**Request**
```json
{
  "price": 549,
  "inStock": false
}
```

---

### DELETE `/products/:id` 🔒 Admin
Delete a product.

---

## 5. Orders

### POST `/orders`
Place a new order. Auth optional — guests can order too.

**Request**
```json
{
  "items": [
    {
      "productId": "6657b1c2d3e4f5a6b7c8d9e0",
      "name": "Gold Plated Kundan Ring",
      "price": 799,
      "quantity": 2,
      "image": "https://res.cloudinary.com/diqp8qet7/image/upload/..."
    }
  ],
  "shippingAddress": {
    "name": "Srinivas Rao",
    "phone": "+919876543210",
    "line1": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  },
  "paymentMethod": "COD"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "_id": "6657c1d2e3f4a5b6c7d8e9f0",
    "orderNumber": "ORD-1748621234-742",
    "items": [ { "...item objects..." } ],
    "total": 1598,
    "status": "processing",
    "shippingAddress": { "...address..." },
    "paymentMethod": "COD",
    "isPaid": false,
    "createdAt": "2026-05-30T10:00:00.000Z"
  }
}
```

---

### GET `/orders/my` 🔒
Get the current user's orders.

**Query params:** `?page=1&limit=10`

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [ { "...order objects..." } ],
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

---

### GET `/orders/:id` 🔒
Get a single order by ID.

---

### GET `/orders` 🔒 Admin
List all orders with filters.

**Query params:** `?page=1&limit=20&status=processing`

Valid statuses: `processing` | `shipped` | `delivered` | `cancelled`

---

### PATCH `/orders/:id/status` 🔒
Update order status. Customers can only cancel their own orders.

**Request**
```json
{ "status": "cancelled" }
```

**Response `200`** — returns updated order.

---

## 6. Payments (Razorpay)

### POST `/payments/initiate`
Create a Razorpay order. Auth optional — guests can pay too.  
Returns everything needed to open the Razorpay checkout popup.

**Request**
```json
{
  "items": [
    {
      "productId": "6657b1c2d3e4f5a6b7c8d9e0",
      "name": "Gold Plated Kundan Ring",
      "price": 799,
      "quantity": 1,
      "image": "https://res.cloudinary.com/diqp8qet7/image/upload/..."
    }
  ],
  "shippingAddress": {
    "name": "Srinivas Rao",
    "phone": "+919876543210",
    "line1": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  },
  "currency": "INR"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "appOrderId": "6657c1d2e3f4a5b6c7d8e9f0",
    "razorpayOrderId": "order_Svdnx461fVQtjA",
    "amount": 79900,
    "currency": "INR",
    "keyId": "rzp_test_Svdmoje3ecFRKI",
    "prefill": {
      "name": "Srinivas Rao",
      "contact": "+919876543210"
    }
  }
}
```

> **Frontend usage:** Pass `razorpayOrderId`, `amount`, `currency`, and `keyId` to `new Razorpay(options).open()`.

---

### POST `/payments/verify`
Verify Razorpay payment signature and mark order as paid.  
Call this after the Razorpay popup closes with a successful payment.

**Request**
```json
{
  "appOrderId": "6657c1d2e3f4a5b6c7d8e9f0",
  "razorpayOrderId": "order_Svdnx461fVQtjA",
  "razorpayPaymentId": "pay_AbCdEfGhIjKlMn",
  "razorpaySignature": "9ef4e2a3b1c5d7..."
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "success": true,
    "order": {
      "_id": "6657c1d2e3f4a5b6c7d8e9f0",
      "orderNumber": "ORD-1748621234-742",
      "isPaid": true,
      "razorpayPaymentId": "pay_AbCdEfGhIjKlMn",
      "paidAt": "2026-05-30T10:05:00.000Z"
    }
  }
}
```

**Error `401`** — signature mismatch
```json
{ "success": false, "message": "Payment signature verification failed" }
```

---

### POST `/payments/webhook`
Razorpay server-side webhook. Register this URL in Razorpay Dashboard.  
Requires `x-razorpay-signature` header. Needs `RAZORPAY_WEBHOOK_SECRET` in env.

**Headers**
```
x-razorpay-signature: sha256_hmac_signature
```

**Response `200`**
```json
{ "success": true, "data": { "received": true } }
```

---

### POST `/payments/refund/:paymentId` 🔒 Admin
Initiate a full or partial refund.

**Request** (partial refund — omit `amount` for full refund)
```json
{ "amount": 399 }
```

**Response `200`** — Razorpay refund object.

---

## 7. Uploads (Cloudinary)

All upload routes require `Authorization: Bearer <accessToken>`.  
Use `multipart/form-data` with the field name `file`.

### POST `/uploads/image` 🔒
Upload a product image (max 5 MB, jpeg/png/webp/gif).

**Request** `multipart/form-data`
```
file: <image file>
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "url": "http://res.cloudinary.com/diqp8qet7/image/upload/v1/taraa/products/abc123.jpg",
    "secureUrl": "https://res.cloudinary.com/diqp8qet7/image/upload/v1/taraa/products/abc123.jpg",
    "publicId": "taraa/products/abc123",
    "width": 800,
    "height": 800,
    "format": "jpg",
    "bytes": 85432
  }
}
```

---

### POST `/uploads/profile-image` 🔒
Upload a profile picture (max 2 MB, jpeg/png/webp).

**Response `201`** — same shape as product image upload.

---

### DELETE `/uploads/:publicId` 🔒
Delete an image by its Cloudinary public ID.

**Example:** `DELETE /uploads/taraa%2Fproducts%2Fabc123`

**Response `200`**
```json
{ "success": true, "data": { "message": "Image deleted" } }
```

---

## 8. Health

### GET `/health`
Public health check endpoint.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-05-30T10:00:00.000Z",
    "service": "taraa-api"
  }
}
```

---

## Error Format

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "statusCode": 400,
  "timestamp": "2026-05-30T10:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request / validation error |
| `401` | Missing or invalid token |
| `403` | Forbidden (insufficient role) |
| `404` | Resource not found |
| `409` | Conflict (duplicate email/phone) |
| `429` | Rate limit exceeded (60 req/min) |
| `500` | Internal server error |

---

## Rate Limiting

- **Default:** 60 requests / 60 seconds per IP
- **Production:** 30 requests / 60 seconds per IP
- Exceeding the limit returns `429 Too Many Requests`

---

## Authentication Flow Summary

```
Register / Login
      │
      ▼
  accessToken (15 min)  ←──── use for all 🔒 routes
  refreshToken (30 days) ────► POST /auth/refresh ──► new accessToken
                         └───► POST /auth/logout  ──► token revoked
```

```
Google Login (Web)
  Browser → GET /auth/google → Google → GET /auth/google/callback
         → redirect to frontend /auth/callback?accessToken=...

Google Login (Mobile / SPA)
  Google Sign-In SDK → idToken → POST /auth/google/token → accessToken + refreshToken

Phone OTP (Firebase)
  Firebase client SDK → phone auth → idToken → POST /auth/phone-login → tokens

Phone OTP (Custom)
  POST /auth/otp/send { phone } → POST /auth/otp/verify { phone, otp } → tokens
```

---

## Razorpay Checkout Flow

```
1. POST /payments/initiate  →  { appOrderId, razorpayOrderId, amount, keyId }
2. Frontend opens Razorpay popup with above values
3. User pays → Razorpay returns { razorpayPaymentId, razorpayOrderId, razorpaySignature }
4. POST /payments/verify with all 4 IDs  →  { success: true, order: { isPaid: true } }
```
