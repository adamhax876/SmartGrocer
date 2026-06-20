# Chapter 4: Design / Analysis

This chapter presents the core design, models, and analytical structure of the SmartGrocer project. It covers the architectural blueprint, system requirements, database design, and security considerations.

---

## 4.1 System Architecture

The system follows a modern 3-tier architecture:
- **Presentation Layer (Frontend)**: Built with lightweight Vanilla JavaScript, HTML, and CSS to ensure zero-lag point-of-sale interactions.
- **Application Layer (Backend)**: Developed using Node.js and Express.js to handle API routing, multi-tenant logic, and AI integrations with Groq.
- **Data Layer (Database)**: A NoSQL MongoDB database designed for flexible, document-based storage of products, sales, and user accounts.

*[Insert System Architecture Diagram Here (system_architecture.png)]*

---

## 4.2 Functional Requirements

- **FR1:** The system must allow users to register and authenticate securely.
- **FR2:** The system must provide a POS interface to scan items, calculate totals, and process sales.
- **FR3:** The system must track inventory and monitor expiration dates using product batches.
- **FR4:** The system must generate AI-powered business reports based on sales data.

---

## 4.3 Non-functional Requirements

- **NFR1 (Performance):** The POS checkout interface must load and respond in under 100ms.
- **NFR2 (Scalability):** The backend must isolate tenant data to support multiple store owners seamlessly.
- **NFR3 (Usability):** The interface must support bilingual operation (Arabic and English).
- **NFR4 (Security):** All passwords must be hashed, and sessions secured via JWT.

---

## 4.4 Use Case Diagram

The Use Case Diagram illustrates the interactions between different actors (Cashier, Store Owner, Super Admin) and the system modules.

*[Insert Use Case Diagram Here (use_case_diagram.png)]*

---

## 4.5 Process Flow / Workflow Diagram

Process workflows dictate the logical sequence of operations within critical system features, such as processing a sale or generating AI reports.

*[Insert POS Checkout Workflow Diagram Here (pos_workflow.png)]*
*[Insert AI Report Workflow Diagram Here (ai_workflow.png)]*

---

## 4.6 ERD / Database Design

The MongoDB schema is designed relationally via document references. Core entities include Users (Merchants), Products (with nested Batches for expiry tracking), and Sales (transactions linking to products).

*[Insert ERD / Database Schema Diagram Here (erd_diagram.png)]*

---

## 4.7 UI Screens or Wireframes

The user interface prioritizes clarity and speed. Key screens include the Dashboard, POS terminal, Inventory Manager, and AI Reports. (Please refer to Chapter 5 for high-fidelity screenshots of these interfaces).

---

## 4.8 User Roles and Permissions

- **Super Admin:** Full system control, manages active stores and maintenance.
- **Store Owner:** Full access to their specific store data, inventory, and AI reports.
- **Cashier:** Restricted access; can only operate the POS screen and process sales.

---

## 4.9 Security and Privacy Considerations

The system implements multiple layers of security. Multi-tenant isolation ensures no data leakage between different supermarkets. Sensitive credentials are encrypted using bcrypt hashing, and API routes are protected by JSON Web Token (JWT) authentication middleware to prevent unauthorized access.
