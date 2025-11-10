# WebAR Full-Stack Product Viewer

This is a complete MERN-stack (MongoDB, Express, React, Node.js) application built to demonstrate a modern, data-driven, 3D product viewer with Web-based Augmented Reality (WebAR) capabilities.

The project moves beyond a simple "CRUD" app to show a "spatial computing" engine that integrates 3D graphics and real-world hardware (a phone's camera and motion sensors) to create an impressive, interactive user experience.

## 🚀 Live Demo

**Frontend (Vercel):** [**https://web-ar-mern-project.vercel.app**](https://web-ar-mern-project.vercel.app)

**Backend API (Render):** [**https://webar-mern-project.onrender.com/api/products**](https://webar-mern-project.onrender.com/api/products)

https://github.com/user-attachments/assets/9cb9a65f-46d5-4c2e-8520-a4c8696e8e8f


> **Note:** The backend is hosted on a free Render plan. It will "spin down" after 15 minutes of inactivity. The **first load will be slow** (it may take 30-60 seconds for the models to appear) as the server "wakes up." This is normal.

---

## 📸 Screenshots

| 3D Gallery (Mobile) | 3D Viewer (Desktop) | AR Mode (Mobile) |
<img width="1355" height="632" alt="image" src="https://github.com/user-attachments/assets/3942b946-ee65-4169-b613-f474da78bd34" />

<img width="623" height="490" alt="image" src="https://github.com/user-attachments/assets/8b791bd5-6a97-4d63-a202-31fc6acaa81b" />

---

## ✨ Core Features

* **Full-Stack MERN Architecture:** A true client-server application.
* **Data-Driven Catalog:** The 3D models are not hard-coded. The React frontend fetches the product list from a Node.js API, which gets its data from a MongoDB Atlas database.
* **3D Thumbnail Gallery:** A horizontally-scrolling UI that renders a live, auto-rotating 3D preview for every model in the database.
* **Interactive 3D Viewer:** A main 3D canvas that lets the user select a model and inspect it using orbit controls (zoom, pan, and rotate).
* **WebAR Tap-to-Place:** On compatible mobile devices (Chrome on Android, Safari on iOS), users can "Enter AR" to place the 3D model on any real-world surface.
* **AR Model Scaling:** Once in AR, `+` and `-` buttons appear, allowing the user to scale the placed model up or down.
* **Robust Error Handling:** An `<ErrorBoundary>` component wraps all 3D renders, preventing one "broken" model (like a complex `.gltf`) from crashing the entire application.
* **Automated Database Seeding:** A `seed.js` script to instantly populate the MongoDB database with the entire product catalog.

---

## 🛠️ Technology Stack

### Frontend (Client: `Ar-Product-Viewer`)
* **React (with Vite):** A fast, modern frontend framework.
* **`react-three-fiber` (R3F):** The main library for building 3D scenes in React.
* **`@react-three/drei`:** A helper library for R3F, used for:
    * `<OrbitControls>` (3D view controls)
    * `<Center>` (To safely center and scale all models)
    * `<useGLTF>` (To load `.glb` and `.gltf` files)
* **`@react-three/xr`:** The official library for all WebAR features (`<ARButton>`, `useHitTest`, etc.).
* **`axios`:** Used to make API calls to the backend.

### Backend (Server: `backend`)
* **Node.js:** The JavaScript runtime for the server.
* **Express.js:** The framework used to build the REST API.
* **Mongoose:** An object data modeling (ODM) library to connect and manage data in MongoDB.
* **`cors`:** Middleware to allow the frontend (on Vercel) to make requests to the backend (on Render).
* **`dotenv`:** To protect the MongoDB database connection string.

### Database
* **MongoDB Atlas:** A free-tier, cloud-hosted NoSQL database.

### Deployment
* **Frontend:** Deployed to **Vercel** with continuous integration from GitHub.
* **Backend:** Deployed to **Render** with continuous integration from GitHub.

---

## 🔌 Architecture & Data Pipeline

This project consists of three independent services that communicate over the internet.



1.  **User (Phone):** Opens the Vercel (React) app.
2.  **Frontend (Vercel):** The app loads and immediately calls the Render API (`GET /api/products`).
3.  **Backend (Render):** The Node.js/Express server receives the request.
4.  **Database (MongoDB):** The server queries MongoDB Atlas for the list of all products.
5.  **Data Flow:** MongoDB sends the JSON data back to Render, which sends it back to the Vercel app.
6.  **React Renders:** The app receives the JSON, updates its state, and renders the gallery of 3D thumbnails.

---

## 🖥️ How to Run Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Git](https://git-scm.com/)
* A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
* **Postman** (optional, for testing endpoints)

### 1. Clone the Repository
```bash
git clone [https://github.com/Himanshu2415411/WebAR_MERN_Project.git](https://github.com/Himanshu2415411/WebAR_MERN_Project.git)
cd WebAR_MERN_Project
