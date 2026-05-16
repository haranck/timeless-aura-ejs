# 🕰️ Timeless Aura

<div align="center">
  <h3>A Premium, Full-Stack E-Commerce Experience</h3>
  <p>Seamless shopping • Secure authentication • Smart discounts • Admin dashboard</p>
</div>

---

## 📖 Overview

**Timeless Aura** is a feature-rich, full-stack web application designed with a premium and elegant user experience in mind. Built on a robust **Node.js/Express** backend and rendered dynamically via **EJS**, it offers a complete e-commerce solution. From secure OTP-based authentication to seamless Razorpay integrations, Timeless Aura is engineered for production readiness.

## ✨ Key Features

- **🛍️ Seamless Shopping:** Intuitive browsing, cart management, and checkout process.
- **🔐 Robust Authentication:** Secure login using Passport.js, Google OAuth2.0, and OTP verification.
- **💳 Secure Payments:** Integrated with Razorpay and digital wallets for safe transactions.
- **📊 Admin Dashboard:** Comprehensive management of products, users, orders, and sales reports.
- **🚚 Order Management:** Real-time order tracking, invoice generation (PDFKit), and sales exporting (ExcelJS).
- **☁️ Cloud Storage:** Efficient media and image handling via Multer and sharp for optimized delivery.
- **🚀 Server-Side Rendering (SSR):** Fast, SEO-friendly pages utilizing EJS.

## 🛠️ Tech Stack

**Frontend & Views:**
- HTML5, CSS3, JavaScript
- EJS (Embedded JavaScript Templates)
- Chart.js (Data Visualization)

**Backend & Core:**
- Node.js & Express.js
- MongoDB & Mongoose (Database & ODM)

**Security & Authentication:**
- Passport.js (Google OAuth2.0)
- bcrypt (Password Hashing)
- express-session & csurf (Session management & CSRF protection)

**Utilities & Integrations:**
- Razorpay (Payment Gateway)
- Nodemailer (Email services)
- Multer & Sharp (File uploads & image processing)
- PDFKit & ExcelJS (Invoices and report generation)

## 📁 Project Structure

```text
Timeless/
├── config/             # Database and environment configurations
├── controllers/        # Route controllers containing business logic
├── helpers/            # Reusable utility functions and helpers
├── middlewares/        # Express middlewares (auth, error handling)
├── models/             # Mongoose database schemas
├── public/             # Static assets (CSS, JS, Images)
├── routes/             # Express route definitions
├── views/              # EJS template files (UI)
├── .env                # Environment variables (Do not commit)
├── app.js              # Application entry point
├── package.json        # Dependencies and scripts
└── README.md           # Project documentation
```

## ⚙️ Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas URI)
- [Razorpay Account](https://razorpay.com/) (For payment gateway credentials)
- Google Cloud Console Project (For OAuth credentials)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/timeless.git
   cd timeless
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your credentials:

   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   SESSION_SECRET=your_secret_key

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   CALLBACK_URL=http://localhost:3000/auth/google/callback

   # Razorpay
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret

   # Nodemailer
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   ```

4. **Start the Development Server:**
   ```bash
   npm start
   ```
   The application will be running at `http://localhost:3000`.

## 📜 License

This project is licensed under the [MIT License](LICENSE). See the `LICENSE` file for more details.

---
<div align="center">
  <i>Crafted with ❤️ by the Timeless Team</i>
</div>
