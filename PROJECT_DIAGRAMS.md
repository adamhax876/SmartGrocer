# 📊 مخططات هندسة البيانات (Database Diagrams & ERD)
**مشروع SmartGrocer - نظام إدارة المتاجر السحابي (SaaS)**

---

## 🖼️ الرسم التخطيطي البصري (Visual ERD Diagram)
![SmartGrocer Database ERD](file:///C:/Users/VIP/.gemini/antigravity/brain/6aedcd4f-cfc1-493d-9b52-d5a8d2ca7d89/smartgrocer_erd_diagram_1776561568609.png)

---

## 1. مخطط علاقات الكيانات التقني (Technical Mermaid ERD)
يوضح هذا المخطط العلاقات المنطقية بين الجداول الأساسية في قاعدة البيانات (User, Product, Sale, Branch, Subscription).

```mermaid
erDiagram
    USER ||--o{ PRODUCT : "owns"
    USER ||--o{ SALE : "records"
    USER ||--o{ BRANCH : "manages"
    USER ||--o{ TICKET : "opens"
    USER ||--o{ MESSAGE : "receives"
    USER ||--o| SUBSCRIPTION : "has"
    
    BRANCH ||--o{ PRODUCT : "stocks"
    BRANCH ||--o{ SALE : "processes"
    
    SALE ||--|{ SALE_ITEM : "contains"
    PRODUCT ||--o{ SALE_ITEM : "is_sold_in"

    USER {
        ObjectId _id
        string storeName
        string role "admin/store_owner/cashier"
        string email
        string subscriptionPlan
        double walletBalance
    }

    PRODUCT {
        ObjectId _id
        string name
        string category
        double price
        int quantity
        string barcode
        ObjectId userId "FK"
        ObjectId branchId "FK"
    }

    SALE {
        ObjectId _id
        double subtotal
        double total
        string paymentMethod
        ObjectId userId "FK"
        ObjectId branchId "FK"
        date createdAt
    }

    SALE_ITEM {
        ObjectId productId "FK"
        string productName
        int quantity
        double unitPrice
        double total
    }

    BRANCH {
        ObjectId _id
        string name
        string location
        ObjectId userId "FK"
    }

    SUBSCRIPTION {
        ObjectId _id
        ObjectId userId "FK"
        string planId "FK"
        date endDate
        string status
    }
```

---

## 2. شرح معماري لقاعدة البيانات (Database Architecture)

يعتمد مشروع **SmartGrocer** على قاعدة بيانات **MongoDB (NoSQL)**، وقد تم تصميمها لتتبع منهجية **(Database-per-Tenant)** برمجياً وليس فيزيائياً لضمان السرعة:

### 👤 كيان المستخدم (User Entity)
- هو الكيان المحوري (Central Entity).
- يمثل "التاجر" أو "المسؤول".
- يحتوي على بيانات الاشتراك (SaaS Subscription) وحالة الحساب.
- **العلاقة:** (One-to-Many) مع كافة الكيانات الأخرى (صاحب متجر واحد يمتلك عدة منتجات ومبيعات).

### 📦 كيان المنتج (Product Entity)
- يحتوي على تفاصيل المخزون والأسعار.
- يدعم **بنية الفروع (Branches)**: كل منتج مرتبط بمستخدم (Owner) وبفرع محدد.
- **الحقول الذكية:** يحتوي على حقول للباركود وتاريخ الصلاحية وتنبيهات النواقص.

### 💰 كيان المبيعات (Sales & Sale Items)
- مصمم بنظام **Embedded Documents**: حيث يتم تخزين عناصر الفاتورة (Items) داخل وثيقة المبيعات نفسها لتقليل عمليات الـ (Joins) وتسريع استخراج التقارير.
- يربط المبيعات بالمستخدم والفرع لضمان دقة التقصي (Audit Trail).

### 📍 كيان الفروع (Branch Entity)
- يسمح للتجار بإدارة عدة مواقع جغرافية تحت حساب واحد.
- يتم فلترة كافة البيانات (المنتجات والمبيعات) بناءً على معرف الفرع.

### 🎫 الدعم والرسائل (Tickets & Messages)
- نظام فرعي لإدارة التواصل بين الأدمن والتاجر.
- **العلاقة:** ترتبط دائماً بمعرف التاجر لضمان الخصوصية.

---

## 3. لماذا NoSQL لهذا المشروع؟ (Justification)
1.  **مرونة المخطط (Schema Flexibility):** يمكن إضافة حقول جديدة للمنتجات (مثل لون المنتج أو حجمه) لبعض المتاجر دون الحاجة لتحديث هيكل القاعدة لكل المستخدمين.
2.  **السرعة (Performance):** نظراً لاعتماد الـ POS على قراءات الـ Barcode السريعة، فإن استجابة MongoDB اللحظية (Low Latency) هي الأنسب.
3.  **قابلية التوسع (Horizontal Scaling):** النظام مهيأ للنمو عبر خاصية الـ Sharding لدعم آلاف المتاجر مستقبلاً.

---
**حقوق التوثيق: مشروع SmartGrocer - 2026**
