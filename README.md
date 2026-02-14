# Schedulr – Employee Scheduling App

Schedulr is a full-stack employee scheduling application designed to model real-world workforce management workflows. It emphasizes role-based access control, data modeling, and practical CRUD operations that mirror internal tools used by operations and support teams.

🌐 **Live Demo**: [https://schedulr-tool.vercel.app/](https://schedulr-tool.vercel.app/)

---

## Key Features

**Authentication & Role-Based Access**
  * Secure login flow
  * Admin vs Employee permissions enforced on both frontend and backend

  **Shift Management**
  * Admins can create, edit, and publish shifts
  * Employees can only view published shifts assigned to their company

  **Real-World Workflow Modeling**
  * Draft vs published shift states
  * Manager-only controls for schedule changes

  **Relational Data Modeling**
  * Prisma ORM used to model users, companies, and shifts
  * Query-level permission filtering based on user role

---

## Test Credentials
Create your own account or use the following credentials to explore the app as an admin:
```
Email: admin@test.com
Password: admin123
```

---

## Tech Stack

**Frontend**
* React
* TypeScript
* Vite

**Backend**
* Node.js
* Express
* Prisma ORM

**Database**
* Relational database managed with Prisma

**Deployment**
* Frontend deployed on Vercel

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <your-repo-name>
```

---

### 2. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on a local development server (typically `http://localhost:5173`).

---

### 3. Run the Backend

```bash
cd backend
npm install
npm run dev
```

The backend server will start on its configured port (commonly `http://localhost:3000`).

---

### 4. Run the Database (Prisma)

```bash
cd backend
npx prisma dev
```

This starts Prisma and applies the local database schema.

---

## Project Structure

```
/frontend   → React + TypeScript frontend
/backend    → Express API, Prisma schema, and routes
```

---

## Future Improvements
* Audit logs for shift changes
* Calendar integrations (Google / iCal)
* Improved mobile responsiveness
* Improved UI/UX design
  
---

## Why This Project
This project was built for a real managerial use case and later refined as a portfolio piece to demonstrate:
* Full-stack application architecture with clear frontend/backend separation
* Role-based authorization implemented at the API level
* Practical use of Prisma for relational data modeling
* Experience building internal-style tools focused on clarity and correctness

