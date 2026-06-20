### 3.4 Ethics and AI Usage

**Data Privacy and Ethical Considerations:**
The SmartGrocer system handles sensitive commercial data, making data privacy and integrity a top priority. Ethical considerations were addressed by implementing a strict Multi-Tenant architecture, ensuring that each merchant's data is completely isolated and inaccessible to others. All user passwords are encrypted using bcrypt hashing before being stored in the MongoDB database, and session authentication is securely managed via JSON Web Tokens (JWT). The system guarantees data integrity by enforcing strict backend validation and restricting sensitive actions (like data deletion) to authorized store administrators only.

**Disclosure of AI Usage:**
Artificial Intelligence was utilized in two main scopes within this project:
1. **System Feature (Groq AI Integration):** The Groq API (powered by the Llama 3.3 model) was integrated to generate readable business reports for store owners. To protect merchant privacy and adhere to ethical standards, only aggregated numerical data (e.g., total daily sales, product quantities, and expiration dates) is transmitted to the AI engine. No Personal Identifiable Information (PII) or sensitive customer details are ever shared.
2. **Development Assistance:** During the development phase of this project, AI-assisted coding tools were employed to optimize algorithms, format code structures, and assist in debugging. This usage was strictly supervised, with all architectural decisions, database designs, and final code logic manually reviewed and validated by the project developers to ensure accuracy and academic integrity.
