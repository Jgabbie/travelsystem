M&RC Travel and Tours Web System — Overview · Setup · Usage · Requirements
Project Overview

Frontend Web Dashboard: React-based admin dashboard to manage tour bookings, travel packages, and customer accounts.

Backend Integration: Integrates with web backend: TRAVEX(Backend).

Installation & Setup
1.Obtain source: Clone the repository into your workspace
2.From the project root run npm install then verify Node version and compatibility with package.json file
3.Ensure to input the necessary values or secrets into the ENV file to make sure that third party functions work properly

Usage Instructions
-Registration and Sign in and OTPS: in the frontend directory /components/modals/Login.jsx and /components/modals/Signup.jsx This will send a request to the backend to generate an OTP for both login and signup
-Manage Users, Roles and Activity Logs: in the frontend directory /pages/admin/UserManagement.jsx. for managing users and /pages/admin/Auditing.jsx. and /pages/admin/Logging.jsx. for activity logs

To simplify, the components like registration form for booking, quotations forms are stored in the components folder under src.

All customer features are included in the /pages directory inside the client folder, it includes the Bookings, Passport Assistance, and Quotation process.

Meanwhile, the Recommendation system is stored in the other directory same as the Frontend and Backend. It is filled with python code that used filtering and algorithms from libraries such as sklearn.

If the developer changed something in the filtering logic of the recommendation system which can be found in model_utils.py, the developer must retrain the model.

Requirements System:
Node.js LTS (16+)
npm or Yarn

CI / Build Agent:
Node LTS, 2+ CPU cores and 4+ GB RAM recommended.

Backend Server of TRAVEX:
Project Overview: TRAVEX is a backend system that handles all the business logic, database interactions, and API endpoints for the M&RC Travel and Tours Web System. It is built using Node.js and Express framework.

Installation & Setup

1.Clone the TRAVEX repository into your workspace.
2.Navigate to the `Backend` directory and run `npm install` to install dependencies.
3.Configure the required values in the `.env` file, including database connection strings and API keys.
4.Start the server with `nodemon server.js`. The backend will be accessible at the specified port
