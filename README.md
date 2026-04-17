# ParkEasy — Smart Vehicle Parking Management System

ParkEasy is a full-stack web application designed to simplify the management of vehicle parking facilities. It provides separate dashboards for administrators and users, enabling efficient parking slot management, booking, and monitoring.

---

## Features

### User Features

* User Registration & Login (JWT Authentication)
* View available parking lots
* Book parking slots (future scope)
* View booking history (future scope)

### Admin Features

* Admin Dashboard
* Manage parking lots
* Monitor system activity
* Role-based access control (Admin/User)

---

## Authentication

* Secure login system using **JWT (JSON Web Tokens)**
* Passwords stored securely using **bcrypt hashing**
* Role-based routing (Admin/User dashboards)

---

## Tech Stack

### Frontend

* Next.js (App Router)
* Tailwind CSS

### Backend

* Next.js API Routes (Serverless backend)

### Database

* PostgreSQL

### ORM

* Prisma

### Deployment

* Vercel (Frontend + API)
* Neon / Supabase (PostgreSQL database)

---

## 📁 Project Structure

```
parkeasy/
│
├── app/
│   ├── (auth)/           # Login & Register pages
│   ├── api/              # Backend API routes
│   ├── dashboard/        # Admin & User dashboards
│   ├── components/       # Reusable UI components
│   ├── lib/              # Prisma & utility files
│   ├── layout.jsx
│   └── page.jsx
│
├── prisma/
│   └── schema.prisma     # Database models
│
├── package.json
└── README.md
```

---

