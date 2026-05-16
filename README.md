<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=Timeless%20Aura&fontSize=60&fontAlignY=35&desc=A%20Premium,%20Full-Stack%20E-Commerce%20Experience&descAlignY=55&descAlign=50" />

  <p align="center">
    <b>Seamless shopping • Secure authentication • Smart discounts • Admin dashboard</b>
  </p>

  <div>
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
    <img src="https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black" alt="EJS" />
  </div>

  <br />

  <div>
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/Status-Active-success.svg?style=flat-square" alt="Status" />
  </div>
</div>

<br />

## 📖 Overview

> **Timeless Aura** is a feature-rich, full-stack web application designed with a premium and elegant user experience in mind. 
> Built on a robust **Node.js/Express** backend and rendered dynamically via **EJS**, it offers a complete e-commerce solution. From secure OTP-based authentication to seamless Razorpay integrations, Timeless Aura is engineered for production readiness.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🛍️ Seamless Shopping** | Intuitive browsing, dynamic cart management, and a smooth checkout process. |
| **🔐 Robust Auth** | Secure login using Passport.js, Google OAuth2.0, and OTP verification via Nodemailer. |
| **💳 Secure Payments** | Integrated seamlessly with Razorpay and digital wallets for safe transactions. |
| **📊 Admin Dashboard** | Comprehensive management of products, users, orders, and detailed sales reports. |
| **🚚 Order Management** | Real-time tracking, automated invoice generation (PDFKit), and data exporting (ExcelJS). |
| **☁️ Cloud Storage** | Efficient media handling via Multer and Sharp for optimized image delivery. |
| **🚀 Server-Side Rendering** | Extremely fast, SEO-friendly web pages dynamically utilizing EJS templates. |

---

## 🛠️ Tech Stack & Integrations

### 🎨 Frontend & Views
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)

### ⚙️ Backend & Core
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white)

### 🔐 Security & Utilities
![Passport.js](https://img.shields.io/badge/Passport-34E27A?style=for-the-badge&logo=passport&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-02042B?style=for-the-badge&logo=razorpay&logoColor=white)
![Google OAuth](https://img.shields.io/badge/Google_OAuth-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Nodemailer](https://img.shields.io/badge/Nodemailer-1890FF?style=for-the-badge&logo=maildotru&logoColor=white)

---

## 📁 Project Structure

```bash
📦 Timeless
 ┣ 📂 config/             # Database and environment configurations
 ┣ 📂 controllers/        # Route controllers containing business logic
 ┣ 📂 helpers/            # Reusable utility functions and helpers
 ┣ 📂 middlewares/        # Express middlewares (auth, error handling)
 ┣ 📂 models/             # Mongoose database schemas
 ┣ 📂 public/             # Static assets (CSS, JS, Images)
 ┣ 📂 routes/             # Express route definitions
 ┣ 📂 views/              # EJS template files (UI)
 ┣ 📜 .env                # Environment variables (Do not commit)
 ┣ 📜 app.js              # Application entry point
 ┣ 📜 package.json        # Dependencies and scripts
 ┗ 📜 README.md           # Project documentation
```

---

## ⚙️ Getting Started

Follow these instructions to set up the project locally.

### 📋 Prerequisites

- **Node.js** (v16 or higher recommended)
- **MongoDB** (Local or Atlas URI)
- **Razorpay Account** (For payment gateway credentials)
- **Google Cloud Console Project** (For OAuth credentials)

### 🚀 Installation Steps

**1. Clone the repository:**
```bash
git clone https://github.com/your-username/timeless.git
cd timeless
```

**2. Install dependencies:**
```bash
npm install
```

**3. Set up Environment Variables:**
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

**4. Start the Development Server:**
```bash
npm start
```
The application will be running at `http://localhost:3000` 🎉

### 🐳 Running with Docker

You can also easily run this project using Docker.

**1. Build the Docker Image:**
```bash
docker build -t timeless-aura .
```

**2. Run the Container:**
Make sure you have your `.env` file set up, then run:
```bash
docker run -p 3000:3000 --env-file .env timeless-aura
```
The application will be accessible at `http://localhost:3000` 🎉

---

## 📜 License

This project is licensed under the **[MIT License](LICENSE)**. See the `LICENSE` file for more details.

---
<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=100&section=footer" width="100%" />
  <br/>
  <i>Crafted with ❤️ by the Timeless Team</i>
</div>
