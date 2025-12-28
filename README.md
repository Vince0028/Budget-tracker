<div align="center">

  <h1>BETA</h1>
  <h3>Budget Evaluation & Tracking App</h3>
  <p>
    A modern, intelligent financial companion powered by AI to help you track, evaluate, and optimize your spending.
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#license">License</a>
  </p>

  <div align="center">
    <!-- React -->
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <!-- TypeScript -->
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <!-- Vite -->
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <!-- Tailwind CSS -->
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <!-- Supabase -->
    <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
    <!-- Google Gemini -->
    <img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white" alt="Google Gemini" />
  </div>
</div>

<br />

## 🌟 Introduction

**BETA** (Budget Evaluation & Tracking App) isn't just another expense tracker. It's built to provide *intelligent* insights into your financial health. By leveraging **Google's Gemini 2.5 Flash**, BETA analyzes your spending habits, predicts future expenses, and acts as a witty, personalized financial advisor.

Whether you're saving for a big purchase or just trying to understand where your money goes, BETA gives you the data and the advice you need to make smarter decisions.

## ✨ Features

- **📊 Interactive Dashboard**: Visualize your cash flow, top spending categories, and monthly trends with beautiful, responsive charts powered by Recharts.
- **🤖 Smart AI Advisor**: Get real-time, witty, and actionable financial advice based on your actual transaction history, powered by Google Gemini.
- **🧹 Receipt Scanning**: Upload images of receipts and let AI automatically extract the vendor, amount, date, and category.
- **🔮 Future Predictions**: Uses AI to forecast your next month's spending based on historical data.
- **💰 Comprehensive Budgeting**: Set monthly limits for different categories and track your progress in real-time.
- **📝 Easy Transaction Logging**: precise tracking of income and expenses.
- **🎯 Wishlist Goals**: Create savings goals for items you want and track your progress towards them.
- **🔐 Secure Authentication**: Fast and secure sign-up/login via Supabase.

## 🛠 Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | [React 19](https://react.dev/) | The library for web and native user interfaces. |
| **Build Tool** | [Vite](https://vitejs.dev/) | Next Generation Frontend Tooling. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | JavaScript with syntax for types. |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | A utility-first CSS framework for rapid UI development. |
| **Backend / DB** | [Supabase](https://supabase.com/) | Open source Firebase alternative. |
| **AI Model** | [Google Gemini](https://deepmind.google/technologies/gemini/) | Multimodal AI for smart insights and analysis. |
| **Icons** | [Lucide React](https://lucide.dev/) | Beautiful & consistent icons. |
| **Charts** | [Recharts](https://recharts.org/) | Redefined chart library setup with React and D3. |

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Vince0028/Budget-tracker.git
    cd Budget-tracker
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory and add your keys:

    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GEMINI_API_KEY=your_google_gemini_api_key
    ```
    > **Note**: You will need to set up a Supabase project and get a Google AI Studio API key.

4.  **Run the application**
    ```bash
    npm run dev
    ```

5.  **Open in Browser**
    Visit `http://localhost:5173` to view the app.

## 📸 Usage

- **Sign Up**: Create an account to start tracking your own private data.
- **Add Transactions**: Click the `+` button or "Add Transaction" to log expenses or income. You can also upload a receipt image!
- **Check the Advisor**: Visit the "Smart Advisor" tab to see what the AI thinks of your spending.
- **Manage Budgets**: Go to the Budgets section to set limits for categories like "Food", "Travel", etc.

## 📞 Contact

Vince Alobin - [GitHub Profile](https://github.com/Vince0028)

---

<div align="center">
  <sub>Built with ❤️ by Vince using React & Gemini</sub>
</div>
