# Futurense University Management System
 
 ## Project Overview
 The Futurense University Management System (UMS) is a premium, full-stack application designed for seamless academic management. It provides a clean, professional interface for students to manage their academic journey, track financial records, and communicate securely with faculty.
 
 ## Key Features
 - **Secure Authentication**: Robust Sign In and Sign Up system with JWT-based session management.
 - **Academic Dashboard**: Real-time overview of attendance, GPA, and next-class schedules.
 - **Finance Module**: Integrated fee management with secure payment verification and digital receipts.
 - **Interactive Academics**: Modules for course materials, semester results, and exam schedules.
 - **Role-Based Communication**: Secure messaging system restricted to student-faculty and student-admin interactions.
 - **Light Theme Interface**: A modern, clean light-mode aesthetic with Futurense branding.
 
 ## Technical Architecture
 - **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+).
 - **Backend**: Node.js with Express.js framework.
 - **Database**: SQLite3 for persistent data storage.
 - **Communication**: Polling-based real-time simulation for secure messaging.
 
 ## Data Structures and Algorithms (DSA) Implementation
 The system utilizes specific DSA concepts to ensure efficiency and scalability:
 - **Array/List**: Employed for hierarchical storage of message threads and academic records.
 - **Hash Map**: Optimized for fast retrieval of user data and cached message history (contact_id to message_list mapping).
 - **Queue**: Utilized in the communication module to handle incoming messages in First-In-First-Out order during polling updates.
 - **Stack**: Used to track session navigation history and recently contacted users for priority display.
 
 ## Installation and Setup
 
 ### Prerequisites
 - Node.js (v14 or higher)
 - npm (Node Package Manager)
 
 ### Steps to Run
 1. **Initialize Dependencies**:
    ```bash
    npm install
    ```
 2. **Start the Application**:
    ```bash
    node backend/server.js
    ```
 3. **Access the Portal**:
    Open your browser and navigate to `http://localhost:5000`
 
 ## Default Credentials for Testing
 - **Email**: `john@example.com`
 - **Password**: `password123`
 
 ## Directory Structure
 - `/backend`: Server logic and database initialization.
 - `/public`: Frontend assets (HTML, CSS, JS).
 - `/ums.db`: SQLite database file (generated on first run).
