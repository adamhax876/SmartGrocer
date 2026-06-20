# Diagrams Generator Guide for Chapter 5

This file contains the codes and instructions for generating the visual diagrams needed for your report. 

### How to turn these codes into PNG images:
1. Go to the free website: **[https://mermaid.live](https://mermaid.live)**.
2. Copy the code block of the diagram you want from below.
3. Paste the code into the text editor panel on the left side of the website.
4. On the bottom-left panel of the website, click **Actions** -> **Download PNG**.
5. Save the image on your computer, and insert it into your final report document where marked.

---

### 1. System Architecture Diagram
**Filename to save as:** `system_architecture.png`
**Code to copy:**
```mermaid
graph TD
    A[Store Owner / Cashier Browser] -->|Requests & Sales| B[Node.js Server]
    B -->|Saves & Fetches Data| C[(MongoDB Database)]
    A -->|Fast AI Request| D[Groq AI Engine]
    B -->|Sends Store Data & API Keys| A
    D -->|Generates Simple Report| A
```

---

### 2. POS Checkout Workflow Diagram
**Filename to save as:** `pos_workflow.png`
**Code to copy:**
```mermaid
flowchart LR
    A[Search / Scan Product] --> B[Add to Cart]
    B --> C[Apply Discount / Tax]
    C --> D[Select Payment Method]
    D --> E[Print Receipt & Deduct Stock]
```

---

### 3. AI Report Workflow Diagram
**Filename to save as:** `ai_workflow.png`
**Code to copy:**
```mermaid
flowchart TD
    A[Owner Clicks 'Generate AI Report'] --> B[System gathers Sales & Stock Data]
    B --> C[Data sent to Groq AI Llama 3.3]
    C --> D[AI writes report in plain English/Arabic]
    D --> E[Report displays in a popup window]
```

---

### 4. Objective-to-Result Mapping Diagram
**Filename to save as:** `objective_mapping.png`
**Code to copy:**
```mermaid
graph TD
    classDef objective fill:#2b1b1d,stroke:#e57373,stroke-width:2px,color:#ffebee;
    classDef solution fill:#1b2b20,stroke:#81c784,stroke-width:2px,color:#e8f5e9;
    classDef evidence fill:#112233,stroke:#64b5f6,stroke-width:2px,color:#e3f2fd;

    O1("Goal 1: Speed Up Checkouts"):::objective --> S1("Solution: POS Cashier Screen"):::solution
    S1 --> E1("Evidence: pos_screen.png & pos.html"):::evidence

    O2("Goal 2: Expiration tracking"):::objective --> S2("Solution: Batch Inventory Tracker"):::solution
    S2 --> E2("Evidence: inventory_screen.png & Product.js"):::evidence

    O3("Goal 3: Simple business advice"):::objective --> S3("Solution: Groq AI Reports"):::solution
    S3 --> E3("Evidence: ai_report.png & reports.html"):::evidence

    O4("Goal 4: Secure SaaS Platform"):::objective --> S4("Solution: Multi-Tenant Accounts"):::solution
    S4 --> E4("Evidence: super_admin.png & auth.js"):::evidence
```

### 5. Use Case Diagram (Chapter 4)
**Filename to save as:** `use_case_diagram.png`
**Code to copy:**
```mermaid
flowchart LR
    classDef actor fill:#1B365D,stroke:#0F2027,stroke-width:2px,color:#FFFFFF;
    classDef usecase fill:#2C3E50,stroke:#34495E,stroke-width:2px,color:#FFFFFF,shape:pill;

    Cashier((Cashier)):::actor
    Owner((Store Owner)):::actor
    Admin((Super Admin)):::actor

    Cashier --> UC1([Process POS Sales]):::usecase
    Cashier --> UC2([Search Inventory]):::usecase

    Owner --> UC3([View AI Reports]):::usecase
    Owner --> UC4([Manage Products & Batches]):::usecase
    Owner --> UC1

    Admin --> UC5([Manage All Stores]):::usecase
    Admin --> UC6([System Maintenance]):::usecase
```

---

### 6. ERD / Database Schema Diagram (Chapter 4)
**Filename to save as:** `erd_diagram.png`
**Code to copy:**
```mermaid
flowchart TD
    classDef entity fill:#1B365D,stroke:#000000,stroke-width:2px,color:#FFFFFF;
    classDef attribute fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#000000;
    classDef relation fill:#D35400,stroke:#873600,stroke-width:2px,color:#FFFFFF;

    %% Entities (Rectangles)
    U[USER]:::entity
    P[PRODUCT]:::entity
    S[SALE]:::entity
    B[BATCH]:::entity

    %% Relationships (Diamonds)
    R1{Owns}:::relation
    R2{Records}:::relation
    R3{Has}:::relation
    R4{Contains}:::relation

    %% Entity Connections
    U ---|1| R1 ---|M| P
    U ---|1| R2 ---|M| S
    P ---|1| R3 ---|M| B
    S ---|1| R4 ---|M| P

    %% Attributes for USER (Ovals)
    U_id([_id]):::attribute --- U
    U_name([name]):::attribute --- U
    U_email([email]):::attribute --- U
    U_role([role]):::attribute --- U

    %% Attributes for PRODUCT (Ovals)
    P_id([_id]):::attribute --- P
    P_name([name]):::attribute --- P
    P_bar([barcode]):::attribute --- P
    P_price([price]):::attribute --- P

    %% Attributes for SALE (Ovals)
    S_id([_id]):::attribute --- S
    S_tot([totalAmount]):::attribute --- S
    S_date([createdAt]):::attribute --- S

    %% Attributes for BATCH (Ovals)
    B_qty([quantity]):::attribute --- B
    B_exp([expiryDate]):::attribute --- B
```
