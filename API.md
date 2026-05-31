# Taraa Backend — API Reference

> **Base URL:** `http://localhost:3001/api/v1`  
> **Production URL:** `https://api.taraa.in/api/v1`  
> **Interactive Docs (Swagger):** `http://localhost:3001/api/docs`  
> **Response envelope:** every response is wrapped as `{ success, data, timestamp }`  
> **Protected routes:** require `Authorization: Bearer <accessToken>`

---

## Table of Contents

1. [Auth](#1-auth)
2. [OTP / Phone Auth](#2-otp--phone-auth)
3. [Users](#3-users)
4. [Categories](#4-categories)
5. [Products](#5-products)
6. [Orders](#6-orders)
7. [Payments (Razorpay)](#7-payments-razorpay)
8. [Uploads (Cloudinary)](#8-uploads-cloudinary)
9. [Banners](#9-banners)
10. [Support Tickets](#10-support-tickets)
11. [Admin Panel — Grouped Reference](#11-admin-panel--grouped-reference)
12. [Error Format](#12-error-format)
13. [Rate Limiting](#13-rate-limiting)
14. [Auth & Payment Flow Diagrams](#14-auth--payment-flow-diagrams)

---

## 1. Auth

### POST `/auth/register`
Register a new customer account. Sends a welcome email and returns tokens.

**Request**
```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
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
    "expiresIn": "24h",
    "user": {
      "id": "6657a1b2c3d4e5f6a7b8c9d0",
      "email": "priya@example.com",
      "name": "Priya Sharma",
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
  "email": "admin@taraa.in",
  "password": "Admin@1234"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a3f8c2d1e4b5...",
    "expiresIn": "24h",
    "user": {
      "id": "6657a1b2c3d4e5f6a7b8c9d0",
      "email": "admin@taraa.in",
      "name": "Taraa Admin",
      "role": "admin"
    }
  }
}
```

---

### POST `/auth/refresh`
Exchange a valid refresh token for a new access token.

**Request**
```json
{ "refreshToken": "a3f8c2d1e4b5..." }
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

---

### POST `/auth/logout` 🔒
Revoke the current device's refresh token.

**Request**
```json
{ "refreshToken": "a3f8c2d1e4b5..." }
```

**Response `200`**
```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

---

### POST `/auth/logout-all` 🔒
Revoke all refresh tokens (logout from every device).

**Response `200`**
```json
{ "success": true, "data": { "message": "Logged out from all devices" } }
```

---

### POST `/auth/forgot-password`
Send a 6-digit OTP to the account email. OTP expires in **10 minutes**.

> Only works for email/password accounts. Google-only accounts cannot use this.

**Request**
```json
{ "email": "priya@example.com" }
```

**Response `200`**
```json
{ "success": true, "data": { "message": "OTP sent to your email. It expires in 10 minutes." } }
```

**Error `404`** — email not registered
```json
{ "success": false, "message": "No account found with this email" }
```

**Error `400`** — Google-only account
```json
{ "success": false, "message": "This account uses Google login — password reset is not available" }
```

---

### POST `/auth/reset-password`
Verify the OTP and set a new password. All existing sessions are revoked on success.

**Request**
```json
{
  "email": "priya@example.com",
  "otp": "482910",
  "newPassword": "NewSecure@123"
}
```

**Response `200`**
```json
{ "success": true, "data": { "message": "Password reset successfully. Please log in with your new password." } }
```

**Error `400`** — wrong or expired OTP
```json
{ "success": false, "message": "Invalid or expired OTP" }
```

---

### GET `/auth/google`
Redirects the browser to Google's OAuth consent screen (web flow). No body. On success redirects to:
```
https://taraa.in/auth/callback?accessToken=...&refreshToken=...&isNew=true
```

---

### POST `/auth/google/token`
Exchange a Google ID token (mobile / SPA) for app tokens.

**Request**
```json
{ "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..." }
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "a3f8...",
    "expiresIn": "24h",
    "isNew": false,
    "user": {
      "id": "6657a1b2c3d4e5f6a7b8c9d0",
      "email": "priya@gmail.com",
      "name": "Priya Sharma",
      "role": "customer",
      "profileImage": "https://lh3.googleusercontent.com/..."
    }
  }
}
```

---

### POST `/auth/phone/send-otp` 🔒
Send a 6-digit OTP to a phone number for verification. Use this when a logged-in customer adds or updates their phone number.

**Request**
```json
{ "phone": "+919876543210" }
```

**Response `200`**
```json
{ "success": true, "data": { "message": "OTP sent to +919876543210. It expires in 10 minutes." } }
```

**Error `400`** — phone already registered to another account
```json
{ "success": false, "message": "This phone number is already registered to another account" }
```

---

### POST `/auth/phone/verify` 🔒
Verify the phone OTP. On success, updates `phone` and sets `phoneVerified: true` on the user account.

**Request**
```json
{ "phone": "+919876543210", "otp": "249714" }
```

**Response `200`**
```json
{ "success": true, "data": { "message": "Phone number verified successfully" } }
```

**Error `400`** — wrong or expired OTP
```json
{ "success": false, "message": "Invalid or expired OTP" }
```

---

### POST `/auth/email/send-verification` 🔒
Send a 6-digit OTP to the logged-in user's email address. Use after registration or after updating email.

> Returns `400` if email is already verified.

**Response `200`**
```json
{ "success": true, "data": { "message": "Verification OTP sent to priya@example.com. It expires in 10 minutes." } }
```

**Error `400`** — already verified
```json
{ "success": false, "message": "Email is already verified" }
```

---

### POST `/auth/email/verify` 🔒
Verify the email OTP. On success, sets `emailVerified: true` on the user account.

**Request**
```json
{ "otp": "961548" }
```

**Response `200`**
```json
{ "success": true, "data": { "message": "Email verified successfully" } }
```

**Error `400`** — wrong or expired OTP
```json
{ "success": false, "message": "Invalid or expired OTP" }
```

---

## 2. OTP / Phone Auth

### POST `/auth/otp/send`

**Request**
```json
{ "phone": "+919876543210" }
```

**Response `200`**
```json
{ "success": true, "data": { "message": "OTP sent successfully" } }
```

---

### POST `/auth/otp/verify`

**Request**
```json
{ "phone": "+919876543210", "otp": "482910" }
```

**Response `200`**
```json
{ "success": true, "data": { "accessToken": "eyJ...", "isNewUser": true } }
```

---

### POST `/auth/phone-login`
Exchange a Firebase ID token (after client-side phone auth) for app tokens.

**Request**
```json
{ "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..." }
```

**Response `200`**
```json
{ "success": true, "data": { "accessToken": "eyJ...", "isNewUser": false } }
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
    "name": "Priya Sharma",
    "email": "priya@example.com",
    "role": "customer",
    "phone": "+919876543210",
    "address": "123 MG Road, Mumbai",
    "isActive": true,
    "phoneVerified": true,
    "emailVerified": false,
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
  "name": "Priya Raj",
  "phone": "+919876543210",
  "address": "456 Brigade Road, Bangalore"
}
```

**Response `200`** — returns updated user object.

---

### GET `/users` 🔒 `admin`
List all users with pagination.

**Query params:** `?page=1&limit=20`

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "6657a1b2c3d4e5f6a7b8c9d0",
        "name": "Priya Sharma",
        "email": "priya@example.com",
        "role": "customer",
        "isActive": true,
        "createdAt": "2026-05-01T10:00:00.000Z"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET `/users/:id` 🔒 `admin`
Get any user by MongoDB ID.

**Response `200`** — returns single user object.

---

### PATCH `/users/:id/role` 🔒 `super_admin`
Assign a role to a user.

**Request**
```json
{ "role": "admin" }
```

Valid roles: `customer` | `admin` | `super_admin`

---

### DELETE `/users/:id` 🔒 `super_admin`
Permanently delete a user account.

**Response `200`**
```json
{ "success": true, "data": null }
```

---

## 4. Categories

### GET `/categories`
List all active categories sorted by `sortOrder`. Includes product count per category.

**Query params:** `?all=true` — include inactive categories (admin use)

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6657a1b2c3d4e5f6a7b8c9d0",
      "name": "Necklaces",
      "slug": "necklaces",
      "image": "https://res.cloudinary.com/diqp8qet7/image/upload/...",
      "description": "Chains, pendants, chokers and statement necklaces",
      "isActive": true,
      "sortOrder": 1,
      "count": 4,
      "createdAt": "2026-05-31T00:00:00.000Z"
    },
    { "name": "Earrings",    "slug": "earrings",    "sortOrder": 2, "count": 4 },
    { "name": "Bracelets",   "slug": "bracelets",   "sortOrder": 3, "count": 1 },
    { "name": "Rings",       "slug": "rings",       "sortOrder": 4, "count": 3 },
    { "name": "Bangles",     "slug": "bangles",     "sortOrder": 5, "count": 1 },
    { "name": "Anklets",     "slug": "anklets",     "sortOrder": 6, "count": 1 },
    { "name": "Maang Tikka", "slug": "maang-tikka", "sortOrder": 7, "count": 1 },
    { "name": "Nose Rings",  "slug": "nose-rings",  "sortOrder": 8, "count": 1 }
  ]
}
```

---

### GET `/categories/:slug/by-slug`
Get a category by slug. Useful for frontend navigation.

**Example:** `GET /categories/necklaces/by-slug`

**Response `200`** — returns single category object (without count).

---

### GET `/categories/:id`
Get a category by MongoDB ID.

---

### POST `/categories` 🔒 `admin`
Create a new category.

**Request**
```json
{
  "name": "Hair Accessories",
  "slug": "hair-accessories",
  "image": "https://res.cloudinary.com/diqp8qet7/image/upload/...",
  "description": "Pins, clips and hair chains",
  "isActive": true,
  "sortOrder": 9
}
```

**Response `201`** — returns created category.

**Error `409`** — slug already exists
```json
{ "success": false, "message": "Category with slug \"hair-accessories\" already exists" }
```

---

### PATCH `/categories/:id` 🔒 `admin`
Partial update — any field can be omitted.

**Request**
```json
{ "sortOrder": 2, "isActive": false }
```

**Response `200`** — returns updated category.

---

### DELETE `/categories/:id` 🔒 `admin`

**Response `200`**
```json
{ "success": true, "data": null }
```

---

## 5. Products

### GET `/products`
List products with filters, search, sorting and pagination.

**Query params**

| Param | Type | Example | Notes |
|---|---|---|---|
| `page` | number | `1` | default `1` |
| `limit` | number | `20` | default `20` |
| `category` | string | `Earrings` | case-insensitive |
| `search` | string | `necklace` | searches name + description |
| `inStock` | boolean | `true` | |
| `isNew` | boolean | `true` | |
| `isBestSeller` | boolean | `true` | |
| `sort` | string | `price_asc` | `price_asc` · `price_desc` · `popular` · `newest` |
| `exclude` | string | `6657b1c2...` | product ID to exclude (related products) |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "6657b1c2d3e4f5a6b7c8d9e0",
        "name": "Emerald Stone Necklace",
        "category": "Necklaces",
        "price": 1299,
        "originalPrice": 1999,
        "discount": 35,
        "image": "https://res.cloudinary.com/diqp8qet7/image/upload/v1/products/necklace-emerald.jpg",
        "images": [],
        "badge": "Bestseller",
        "description": "Statement emerald green stone necklace...",
        "inStock": true,
        "rating": 0,
        "reviews": 0,
        "isNew": false,
        "isBestSeller": true,
        "cloudinaryPublicId": "products/necklace-emerald",
        "createdAt": "2026-05-31T00:00:00.000Z",
        "updatedAt": "2026-05-31T00:00:00.000Z"
      }
    ],
    "total": 16,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Common queries**
```
GET /products?isNew=true&limit=8&sort=newest           → New arrivals
GET /products?isBestSeller=true&limit=8&sort=popular   → Best sellers
GET /products?category=Earrings&exclude=<id>&limit=4   → Related products
GET /products?search=gold&sort=price_asc               → Search + sort
```

---

### GET `/products/categories`
Distinct category names derived from existing products (not the full Category documents).

**Response `200`**
```json
{
  "success": true,
  "data": ["Anklets", "Bangles", "Bracelets", "Earrings", "Necklaces", "Rings"]
}
```

---

### GET `/products/:id`
Get a single product by MongoDB ID.

**Response `200`** — returns single product object.

**Error `404`**
```json
{ "success": false, "message": "Product 6657b1c2... not found" }
```

---

### POST `/products` 🔒 `admin`
Create a product with image upload.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | |
| `category` | string | ✅ | |
| `price` | number | ✅ | |
| `originalPrice` | number | ✅ | |
| `description` | string | ✅ | |
| `images` | file(s) | one of | up to 10 files, each ≤ 5 MB |
| `image` | string | one of | URL if not uploading a file |
| `discount` | number | — | |
| `badge` | string | — | e.g. `New`, `Bestseller` |
| `inStock` | boolean | — | default `true` |
| `isNew` | boolean | — | default `false` |
| `isBestSeller` | boolean | — | default `false` |

**Response `201`** — returns created product. First uploaded file becomes `image`; additional files go into `images[]`.

---

### POST `/products/bulk` 🔒 `admin`
Bulk create up to 50 products in one request. Images are matched to products by index.

**Content-Type:** `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `products` | string | JSON array of product objects |
| `images` | file(s) | `images[0]` → `products[0]`, `images[1]` → `products[1]`, … |

Products without a matching file must include an `"image"` URL in their JSON. One bad product never aborts the whole batch.

**Response `201`**
```json
{
  "success": true,
  "data": {
    "summary": { "total": 3, "created": 2, "failed": 1 },
    "created": [ { "...product objects..." } ],
    "failed": [
      { "index": 2, "name": "Bad Product", "error": "description must be a string" }
    ]
  }
}
```

---

### POST `/products/:id/images` 🔒 `admin`
Append additional images to an existing product's `images[]` array.

**Content-Type:** `multipart/form-data`  
**Field:** `images` — one or more files (up to 10, each ≤ 5 MB)

**Response `200`** — returns updated product.

---

### PATCH `/products/:id` 🔒 `admin`
Partial update of any product field (JSON body, not multipart).

**Request**
```json
{ "price": 1099, "inStock": false, "badge": "Sale" }
```

**Response `200`** — returns updated product.

---

### DELETE `/products/:id` 🔒 `admin`

**Response `200`**
```json
{ "success": true, "data": null }
```

---

## 6. Orders

### POST `/orders`
Place a new order. Auth optional — guests can order.

**Request**
```json
{
  "items": [
    {
      "productId": "6657b1c2d3e4f5a6b7c8d9e0",
      "name": "Emerald Stone Necklace",
      "price": 1299,
      "quantity": 1,
      "image": "https://res.cloudinary.com/diqp8qet7/image/upload/..."
    }
  ],
  "shippingAddress": {
    "name": "Priya Sharma",
    "phone": "9876543210",
    "line1": "123 MG Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "paymentMethod": "COD",
  "guestEmail": "priya@example.com"
}
```

> `guestEmail` is optional but required if the guest wants to track the order without logging in.  
> For Razorpay payments use `POST /payments/initiate` instead (it also creates the order).

**Response `201`**
```json
{
  "success": true,
  "data": {
    "_id": "6657c1d2e3f4a5b6c7d8e9f0",
    "orderNumber": "TRA20260531001",
    "items": [ { "productId": "...", "name": "Emerald Stone Necklace", "price": 1299, "quantity": 1, "image": "..." } ],
    "total": 1299,
    "status": "processing",
    "shippingAddress": { "name": "Priya Sharma", "phone": "9876543210", "line1": "123 MG Road", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001" },
    "paymentMethod": "COD",
    "isPaid": false,
    "createdAt": "2026-05-31T10:00:00.000Z"
  }
}
```

---

### GET `/orders/track`
Public order tracking. No auth required.

**Query params:** `?orderNumber=TRA20260531001&email=priya@example.com`

**Response `200`**
```json
{
  "success": true,
  "data": {
    "orderNumber": "TRA20260531001",
    "status": "shipped",
    "items": [
      { "name": "Emerald Stone Necklace", "image": "...", "quantity": 1, "price": 1299 }
    ],
    "total": 1299,
    "placedOn": "2026-05-31T10:00:00.000Z",
    "expectedBy": "2026-06-04T23:59:00.000Z",
    "carrier": "Delhivery",
    "awbNumber": "DEL8843920142",
    "shippingAddress": { "name": "Priya Sharma", "city": "Mumbai", "pincode": "400001" },
    "timeline": [
      { "label": "Order Placed",        "location": "taraa.in",                   "time": "2026-05-31T10:00:00Z", "done": true,  "active": false },
      { "label": "Order Confirmed",     "location": "Taraa Warehouse, Hyderabad", "time": "2026-05-31T14:00:00Z", "done": true,  "active": false },
      { "label": "Packed & Dispatched", "location": "Taraa Warehouse, Hyderabad", "time": "2026-06-01T09:00:00Z", "done": true,  "active": false },
      { "label": "In Transit",          "location": "Delhivery Hub",              "time": "2026-06-01T09:00:00Z", "done": true,  "active": true  },
      { "label": "Out for Delivery",    "location": "",                           "time": null,                   "done": false, "active": false },
      { "label": "Delivered",           "location": "",                           "time": null,                   "done": false, "active": false }
    ]
  }
}
```

**Error `404`** — wrong order number or email
```json
{ "success": false, "message": "Order not found" }
```

---

### GET `/orders/my` 🔒
Get the current authenticated user's orders.

**Query params:** `?page=1&limit=10`

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "6657c1d2e3f4a5b6c7d8e9f0",
        "orderNumber": "TRA20260531001",
        "items": [ { "name": "Emerald Stone Necklace", "price": 1299, "quantity": 1, "image": "..." } ],
        "total": 1299,
        "status": "shipped",
        "isPaid": false,
        "paymentMethod": "COD",
        "createdAt": "2026-05-31T10:00:00.000Z"
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### GET `/orders` 🔒 `admin`
List all orders with optional status filter and pagination.

**Query params:** `?page=1&limit=20&status=processing`

Valid statuses: `processing` | `shipped` | `delivered` | `cancelled`

**Response `200`** — same shape as `GET /orders/my` but all orders, with populated user info.

---

### GET `/orders/:id` 🔒
Get a single order by MongoDB ID. Admins can fetch any order.

**Response `200`** — returns full order object.

---

### PATCH `/orders/:id/status` 🔒
Update order status.
- **Customers** can only set `cancelled` on their own orders.
- **Admins** can set any status. `shipped` auto-sets `shippedAt`; `delivered` auto-sets `deliveredAt` and `confirmedAt`.

**Request**
```json
{ "status": "shipped" }
```

**Response `200`** — returns updated order with timestamps set.

---

## 7. Payments (Razorpay)

### POST `/payments/initiate`
Create a Razorpay order and an app order in one shot. Auth optional.

**Request**
```json
{
  "items": [
    { "productId": "6657b1c2...", "name": "Emerald Stone Necklace", "price": 1299, "quantity": 1, "image": "..." }
  ],
  "shippingAddress": {
    "name": "Priya Sharma",
    "phone": "9876543210",
    "line1": "123 MG Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
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
    "amount": 129900,
    "currency": "INR",
    "keyId": "rzp_test_Svdmoje3ecFRKI",
    "prefill": { "name": "Priya Sharma", "contact": "9876543210" }
  }
}
```

> `amount` is in paise (₹1299 = 129900 paise).

---

### POST `/payments/verify`
Verify Razorpay HMAC-SHA256 signature and mark order as paid.

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
    "order": {
      "_id": "6657c1d2e3f4a5b6c7d8e9f0",
      "orderNumber": "TRA20260531001",
      "isPaid": true,
      "razorpayPaymentId": "pay_AbCdEfGhIjKlMn",
      "paidAt": "2026-05-31T10:05:00.000Z"
    }
  }
}
```

**Error `401`**
```json
{ "success": false, "message": "Payment signature verification failed" }
```

---

### POST `/payments/webhook`
Razorpay server-to-server event webhook. Register this URL in Razorpay Dashboard → Webhooks.  
Requires `x-razorpay-signature` header and `RAZORPAY_WEBHOOK_SECRET` env var.

**Response `200`**
```json
{ "success": true, "data": { "received": true } }
```

---

### POST `/payments/refund/:paymentId` 🔒 `admin`
Initiate a full or partial refund.

**Request** — omit `amount` for a full refund
```json
{ "amount": 649 }
```

**Response `200`** — Razorpay refund object.

---

## 8. Uploads (Cloudinary)

All upload routes require `Authorization: Bearer <accessToken>`.  
Use `multipart/form-data` with field name `file`.

### POST `/uploads/image` 🔒
Upload a product or general image (max 5 MB — jpeg / png / webp / gif).

**Response `201`**
```json
{
  "success": true,
  "data": {
    "url": "http://res.cloudinary.com/diqp8qet7/image/upload/v1/taraa/abc123.jpg",
    "secureUrl": "https://res.cloudinary.com/diqp8qet7/image/upload/v1/taraa/abc123.jpg",
    "publicId": "taraa/abc123",
    "width": 800,
    "height": 800,
    "format": "jpg",
    "bytes": 85432
  }
}
```

---

### POST `/uploads/profile-image` 🔒
Upload a profile picture (max 2 MB).

**Response `201`** — same shape as image upload.

---

### DELETE `/uploads/:publicId` 🔒
Delete an image by Cloudinary public ID (URL-encode the `/`).

**Example:** `DELETE /uploads/taraa%2Fproducts%2Fabc123`

**Response `200`**
```json
{ "success": true, "data": { "message": "Image deleted" } }
```

---

## 9. Banners

Banners support three placement types — `hero` (full-width homepage slider), `promotional` (offer cards / strips), and `sidebar` (category or ad banners). Active banners respect an optional `startDate` / `endDate` schedule.

### Banner object

```json
{
  "_id": "6a1bbbd8e64e7c9eee5c3d38",
  "title": "Summer Collection is Live",
  "subtitle": "Up to 40% off on all jewellery",
  "image": "https://res.cloudinary.com/diqp8qet7/image/upload/v1/banners/hero1.jpg",
  "cloudinaryPublicId": "banners/hero1",
  "link": "/collection",
  "type": "hero",
  "isActive": true,
  "sortOrder": 1,
  "badge": "Sale",
  "ctaText": "Shop Now",
  "startDate": null,
  "endDate": null,
  "createdAt": "2026-05-31T04:40:56.000Z",
  "updatedAt": "2026-05-31T04:40:56.000Z"
}
```

Banner types: `hero` | `promotional` | `sidebar`

---

### GET `/banners`
Public. Returns only active banners that are within their scheduled date range.

**Query params:** `?type=hero` — filter by type (optional)

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "...banner object..." },
    { "...banner object..." }
  ]
}
```

---

### GET `/banners/:id`
Public. Get a single banner by ID.

---

### GET `/banners/admin/all` 🔒 `admin`
All banners including inactive — for the admin dashboard.

**Query params:** `?type=promotional` — filter by type (optional)

**Response `200`** — array of all banners sorted by `type → sortOrder → createdAt`.

---

### POST `/banners` 🔒 `admin`
Create a banner with image upload.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | ✅ | |
| `image` | file | one of | image file ≤ 5 MB |
| `image` | string | one of | URL if not uploading a file |
| `subtitle` | string | — | |
| `link` | string | — | relative or absolute URL |
| `type` | string | — | `hero` · `promotional` · `sidebar` (default `hero`) |
| `badge` | string | — | e.g. `Sale`, `New` |
| `ctaText` | string | — | e.g. `Shop Now` |
| `sortOrder` | number | — | default `0` |
| `isActive` | boolean | — | default `true` |
| `startDate` | ISO string | — | schedule start |
| `endDate` | ISO string | — | schedule end |

**Response `201`** — returns created banner.

---

### PATCH `/banners/:id` 🔒 `admin`
Update any banner field (JSON body, no file upload).

**Request**
```json
{
  "title": "Monsoon Sale — 50% Off",
  "badge": "50% Off",
  "isActive": true,
  "endDate": "2026-07-31T23:59:00.000Z"
}
```

**Response `200`** — returns updated banner.

---

### PATCH `/banners/:id/image` 🔒 `admin`
Replace the banner image. Automatically deletes the old Cloudinary asset.

**Content-Type:** `multipart/form-data`  
**Field:** `image` — new image file

**Response `200`** — returns updated banner with new image URL.

---

### DELETE `/banners/:id` 🔒 `admin`
Delete a banner and its Cloudinary image.

**Response `200`**
```json
{ "success": true, "data": null }
```

---

## 10. Support Tickets

Customers (or guests) can raise tickets. Admins can view, filter, reply and manage all tickets. Replies form a thread. Status auto-advances when the admin or customer replies.

### Ticket object

```json
{
  "_id": "6a1bcd1234abcd5678ef0001",
  "ticketNumber": "TKT20260531001",
  "userId": { "_id": "...", "name": "Priya Sharma", "email": "priya@example.com" },
  "guestName": null,
  "guestEmail": null,
  "subject": "My order has not arrived",
  "message": "I placed order TRA20260531001 on May 31 and it has not arrived yet.",
  "category": "order",
  "status": "in_progress",
  "priority": "medium",
  "orderNumber": "TRA20260531001",
  "replies": [
    {
      "_id": "...",
      "message": "Hi Priya, we are looking into your order and will update you within 24 hours.",
      "sentBy": "admin",
      "senderName": "Taraa Admin",
      "createdAt": "2026-05-31T11:00:00.000Z"
    }
  ],
  "resolvedAt": null,
  "createdAt": "2026-05-31T10:00:00.000Z",
  "updatedAt": "2026-05-31T11:00:00.000Z"
}
```

**Categories:** `order` | `payment` | `product` | `shipping` | `return` | `other`  
**Statuses:** `open` | `in_progress` | `resolved` | `closed`  
**Priorities:** `low` | `medium` | `high`  
**Ticket number format:** `TKT` + `YYYYMMDD` + 3-digit sequence → e.g. `TKT20260531001`

**Auto status transitions:**
- Admin replies to an `open` ticket → status becomes `in_progress`
- Customer replies to a `resolved` ticket → status reverts to `open`

---

### POST `/support`
Submit a support ticket. Auth optional — guests must provide `guestName` and `guestEmail`.

**Request (authenticated user)**
```json
{
  "subject": "Wrong item delivered",
  "message": "I received earrings instead of the necklace I ordered.",
  "category": "order",
  "orderNumber": "TRA20260531001"
}
```

**Request (guest)**
```json
{
  "subject": "Payment deducted but no confirmation",
  "message": "Payment was deducted but I never got a confirmation email.",
  "category": "payment",
  "guestName": "Rahul Mehta",
  "guestEmail": "rahul@example.com"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "_id": "6a1bcd1234abcd5678ef0001",
    "ticketNumber": "TKT20260531001",
    "subject": "Payment deducted but no confirmation",
    "status": "open",
    "priority": "medium",
    "category": "payment",
    "replies": [],
    "createdAt": "2026-05-31T10:00:00.000Z"
  }
}
```

---

### GET `/support/my` 🔒
Get the current user's tickets (paginated).

**Query params:** `?page=1&limit=10`

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [ { "...ticket objects..." } ],
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### GET `/support/:id` 🔒
Get a single ticket with full reply thread. Customers can only view their own tickets.

**Response `200`** — returns full ticket object including `replies[]`.

---

### POST `/support/:id/reply` 🔒
Add a reply to a ticket. Works for both customers and admins.

**Request**
```json
{ "message": "Thank you, I will wait for your update." }
```

**Response `200`** — returns updated ticket with new reply appended to `replies[]`.

**Error `400`** — ticket is closed
```json
{ "success": false, "message": "Cannot reply to a closed ticket" }
```

---

### GET `/support` 🔒 `admin`
List all tickets with filters, search and pagination.

**Query params**

| Param | Type | Example | Notes |
|---|---|---|---|
| `page` | number | `1` | default `1` |
| `limit` | number | `20` | default `20` |
| `status` | string | `open` | `open` · `in_progress` · `resolved` · `closed` |
| `priority` | string | `high` | `low` · `medium` · `high` |
| `category` | string | `payment` | `order` · `payment` · `product` · `shipping` · `return` · `other` |
| `search` | string | `TKT20260531` | searches subject, ticket#, order#, guest email |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [ { "...ticket objects with populated userId..." } ],
    "total": 24,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

Sorted by `priority DESC → createdAt DESC` so high-priority open tickets appear first.

---

### GET `/support/admin/stats` 🔒 `admin`
Ticket counts grouped by status, category and priority — for the admin dashboard widget.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "total": 24,
    "byStatus":   { "open": 10, "in_progress": 6, "resolved": 7, "closed": 1 },
    "byCategory": { "order": 8, "payment": 5, "product": 4, "shipping": 3, "return": 2, "other": 2 },
    "byPriority": { "high": 3, "medium": 16, "low": 5 }
  }
}
```

---

### PATCH `/support/:id` 🔒 `admin`
Update ticket status or priority. Setting `resolved` automatically stamps `resolvedAt`.

**Request**
```json
{ "status": "resolved", "priority": "high" }
```

**Response `200`** — returns updated ticket.

---

## 11. Admin Panel — Grouped Reference

This section groups every endpoint the admin frontend dashboard needs.

> All admin requests require `Authorization: Bearer <accessToken>` where the decoded JWT `role` is `admin` or `super_admin`.

### 9.1 Admin Login

```
POST /auth/login
Body: { "email": "admin@taraa.in", "password": "Admin@1234" }
→ accessToken (role: "admin")
```

Store the `accessToken` in `localStorage` / `httpOnly` cookie. Send it as `Authorization: Bearer <token>` on every request. Refresh via `POST /auth/refresh` before it expires.

---

### 9.2 Dashboard Stats

No dedicated stats endpoint exists yet. Compose from four parallel requests:

```
GET /products?limit=1        → data.total = total products
GET /categories              → data.length = total categories
GET /orders?limit=1          → data.total = total orders
GET /orders?status=processing&limit=1 → data.total = pending orders
GET /users?limit=1           → data.total = total users
```

---

### 9.3 Product Management

| Action | Method + Endpoint | Body / Notes |
|---|---|---|
| List all | `GET /products?page=1&limit=20` | Any filter combo |
| Search | `GET /products?search=gold` | |
| Filter by category | `GET /products?category=Earrings` | |
| Filter in-stock | `GET /products?inStock=true` | |
| Sort | `GET /products?sort=price_asc` | |
| Get one | `GET /products/:id` | |
| Create with images | `POST /products` | `multipart/form-data` |
| Bulk create | `POST /products/bulk` | `multipart/form-data` |
| Add images | `POST /products/:id/images` | `multipart/form-data` |
| Update fields | `PATCH /products/:id` | JSON |
| Delete | `DELETE /products/:id` | |

**Create / Bulk create — required form fields:**
```
name, category, price, originalPrice, description  ← always required
images                                              ← file(s), field name: images
discount, badge, inStock, isNew, isBestSeller       ← optional
```

---

### 9.4 Category Management

| Action | Method + Endpoint | Notes |
|---|---|---|
| List all (incl. inactive) | `GET /categories?all=true` | includes `count` per category |
| Get one | `GET /categories/:id` | |
| Create | `POST /categories` | JSON |
| Update | `PATCH /categories/:id` | partial JSON |
| Delete | `DELETE /categories/:id` | |
| Reorder | `PATCH /categories/:id` `{ "sortOrder": 2 }` | |
| Toggle active | `PATCH /categories/:id` `{ "isActive": false }` | |

---

### 9.5 Order Management

| Action | Method + Endpoint | Notes |
|---|---|---|
| List all | `GET /orders?page=1&limit=20` | |
| Filter by status | `GET /orders?status=processing` | |
| Get one (with customer) | `GET /orders/:id` | populates user name/email/phone |
| Mark confirmed | `PATCH /orders/:id/status` `{ "status": "processing" }` | keeps confirmedAt via auto-set |
| Mark shipped | `PATCH /orders/:id/status` `{ "status": "shipped" }` | auto-sets `shippedAt` |
| Mark delivered | `PATCH /orders/:id/status` `{ "status": "delivered" }` | auto-sets `deliveredAt` |
| Cancel | `PATCH /orders/:id/status` `{ "status": "cancelled" }` | |

**Order number format:** `TRA` + `YYYYMMDD` + 3-digit daily sequence → e.g. `TRA20260531001`

**Order statuses:**

| Status | Meaning |
|---|---|
| `processing` | Order placed, awaiting confirmation |
| `shipped` | Dispatched — `shippedAt` set |
| `delivered` | Delivered — `deliveredAt` set |
| `cancelled` | Cancelled by customer or admin |

**Schema fields set automatically on status change:**

| Status update | Fields auto-set |
|---|---|
| `→ shipped` | `shippedAt`, `confirmedAt` (if not already set) |
| `→ delivered` | `deliveredAt`, `shippedAt`, `confirmedAt` (if not already set) |

---

### 9.6 User Management

| Action | Method + Endpoint | Role required |
|---|---|---|
| List all users | `GET /users?page=1&limit=20` | `admin` |
| Get one | `GET /users/:id` | `admin` |
| Promote to admin | `PATCH /users/:id/role` `{ "role": "admin" }` | `super_admin` |
| Demote to customer | `PATCH /users/:id/role` `{ "role": "customer" }` | `super_admin` |
| Delete | `DELETE /users/:id` | `super_admin` |

---

### 11.7 Support Ticket Management

| Action | Method + Endpoint | Notes |
|---|---|---|
| Dashboard stats | `GET /support/admin/stats` | counts by status / category / priority |
| List all tickets | `GET /support?page=1&limit=20` | |
| Filter open | `GET /support?status=open` | |
| Filter high priority | `GET /support?priority=high` | |
| Filter by category | `GET /support?category=payment` | |
| Search | `GET /support?search=TKT20260531` | ticket#, order#, email, subject |
| Get one (full thread) | `GET /support/:id` | includes all replies |
| Reply as admin | `POST /support/:id/reply` `{ "message": "..." }` | auto sets status to `in_progress` |
| Mark in progress | `PATCH /support/:id` `{ "status": "in_progress" }` | |
| Mark resolved | `PATCH /support/:id` `{ "status": "resolved" }` | auto-stamps `resolvedAt` |
| Close ticket | `PATCH /support/:id` `{ "status": "closed" }` | no more replies allowed |
| Escalate priority | `PATCH /support/:id` `{ "priority": "high" }` | |

**Workflow:**
```
Customer submits → open
Admin replies    → in_progress (auto)
Admin resolves   → resolved    (resolvedAt set)
Customer replies → open again  (auto re-open)
Admin closes     → closed      (no more replies)
```

---

### 11.8 Banner Management

| Action | Method + Endpoint | Notes |
|---|---|---|
| List all (incl. inactive) | `GET /banners/admin/all` | |
| Filter by type | `GET /banners/admin/all?type=hero` | |
| Get one | `GET /banners/:id` | |
| Create with image | `POST /banners` | `multipart/form-data` |
| Update fields | `PATCH /banners/:id` | JSON |
| Replace image | `PATCH /banners/:id/image` | `multipart/form-data`, deletes old asset |
| Toggle active | `PATCH /banners/:id` `{ "isActive": false }` | |
| Schedule | `PATCH /banners/:id` `{ "startDate": "...", "endDate": "..." }` | |
| Delete | `DELETE /banners/:id` | deletes Cloudinary asset too |

**Types:** `hero` · `promotional` · `sidebar`

---

### 10.8 Payments & Refunds

| Action | Method + Endpoint | Notes |
|---|---|---|
| Full refund | `POST /payments/refund/:paymentId` | no body |
| Partial refund | `POST /payments/refund/:paymentId` `{ "amount": 649 }` | amount in ₹ |

`paymentId` is the Razorpay payment ID (`pay_...`) stored on the order as `razorpayPaymentId`.

---

### 9.8 Admin-Only Query Recipes

```bash
# All pending orders, newest first
GET /orders?status=processing&page=1&limit=50

# Today's orders (filter client-side by createdAt after fetching)
GET /orders?limit=100

# Low stock — no API filter yet, fetch all and filter client-side
GET /products?inStock=false&limit=100

# Products in a specific category sorted by price
GET /products?category=Necklaces&sort=price_desc

# Search users
GET /users?page=1&limit=20   (no search param yet — filter client-side)
```

---

## 10. Error Format

All errors follow this shape:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Order TRA20260531001 not found",
  "path": "/api/v1/orders/TRA20260531001",
  "timestamp": "2026-05-31T10:00:00.000Z"
}
```

| Status | Meaning |
|---|---|
| `400` | Bad request / validation error |
| `401` | Missing or invalid token |
| `403` | Forbidden — insufficient role |
| `404` | Resource not found |
| `409` | Conflict (duplicate email / slug) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## 11. Rate Limiting

| Environment | Limit |
|---|---|
| Development | 100 req / 60 s per IP |
| Staging | 60 req / 60 s per IP |
| Production | 30 req / 60 s per IP |

Exceeding the limit returns `429 Too Many Requests`.

---

## 12. Auth & Payment Flow Diagrams

### Authentication

```
Register / Login
      │
      ▼
  accessToken (24h)  ←──── send as Bearer on every 🔒 route
  refreshToken (30d) ────► POST /auth/refresh ──► new accessToken
                     └───► POST /auth/logout  ──► token revoked
```

```
Google (Web)
  Browser → GET /auth/google → Google → GET /auth/google/callback
          → redirect to frontend /auth/callback?accessToken=...&refreshToken=...

Google (Mobile / SPA)
  Google Sign-In SDK → idToken → POST /auth/google/token → { accessToken, refreshToken }

Phone OTP (Firebase)
  Firebase client SDK → phone auth → idToken → POST /auth/phone-login → tokens
```

### Razorpay Checkout

```
1. POST /payments/initiate
   → { appOrderId, razorpayOrderId, amount (paise), keyId, prefill }

2. Frontend opens Razorpay popup:
   new Razorpay({ key: keyId, order_id: razorpayOrderId, amount, ... }).open()

3. User pays → Razorpay returns:
   { razorpayPaymentId, razorpayOrderId, razorpaySignature }

4. POST /payments/verify with all 4 IDs
   → { order: { isPaid: true, paidAt: "..." } }
```

### Order Tracking (Guest)

```
Guest places order  →  include "guestEmail" in POST /orders body
                                   │
                                   ▼
GET /orders/track?orderNumber=TRA20260531001&email=priya@example.com
                                   │
                                   ▼
         { status, timeline[], carrier, awbNumber, expectedBy }
```
