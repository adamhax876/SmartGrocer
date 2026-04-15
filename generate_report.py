# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.colors import HexColor, black, white, red
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT

PRIMARY = HexColor('#dc2626')
DARK = HexColor('#1f2937')
LIGHT_BG = HexColor('#f3f4f6')

def create_report():
    doc = SimpleDocTemplate(
        "Security_Report_SmartGrocer.pdf",
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24,
        textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=20, fontName='Helvetica-Bold')
    
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=12,
        textColor=DARK, alignment=TA_CENTER, spaceAfter=30)
    
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=16,
        textColor=PRIMARY, spaceBefore=20, spaceAfter=10, fontName='Helvetica-Bold')
    
    subsection_style = ParagraphStyle('Subsection', parent=styles['Heading3'], fontSize=13,
        textColor=DARK, spaceBefore=15, spaceAfter=8, fontName='Helvetica-Bold')
    
    callout_style = ParagraphStyle('Callout', parent=styles['Normal'], fontSize=10,
        textColor=white, backColor=PRIMARY, spaceBefore=5, spaceAfter=10,
        leftIndent=10, rightIndent=10, leading=14)
    
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10,
        textColor=DARK, spaceBefore=3, spaceAfter=3, leading=14)
    
    bullet_style = ParagraphStyle('Bullet', parent=styles['Normal'], fontSize=10,
        textColor=DARK, leftIndent=20, spaceBefore=2, spaceAfter=2, leading=14)
    
    code_style = ParagraphStyle('Code', parent=styles['Code'], fontSize=8,
        fontName='Courier', backColor=LIGHT_BG, leftIndent=15, rightIndent=15,
        spaceBefore=8, spaceAfter=8, leading=12)

    story = []
    
    story.append(Paragraph("تقرير الفحص الامني", title_style))
    story.append(Paragraph("SmartGrocer - نظام ادارة البقالات والسوبرماركت", subtitle_style))
    story.append(Paragraph("تاريخ الفحص: 4 ابريل 2026 | auditor: Matrix Agent", subtitle_style))
    story.append(Spacer(1, 20))
    story.append(Paragraph("مستوى الخطورة:", subsection_style))
    story.append(Paragraph("O حرج (Critical) | O عالي (High) | O متوسط (Medium) | O منخفض (Low)", body_style))
    story.append(Spacer(1, 20))
    
    # CRITICAL
    story.append(Paragraph("الثغرات الحرجة (CRITICAL)", section_style))
    story.append(Paragraph("يجب اصلاحها فورا قبل الاطلاق", callout_style))
    
    story.append(Paragraph("1. تسريب بيانات حساسة في ملف .env", subsection_style))
    story.append(Paragraph("الملف: .env | الخطورة: O حرجة جدا", callout_style))
    story.append(Paragraph("تم العثور على البيانات التالية الحساسة:", body_style))
    story.append(Paragraph("- كلمة مرور قاعدة البيانات (MongoDB URI)", bullet_style))
    story.append(Paragraph("- كلمة مرور البريد الالكتروني (Gmail App Password)", bullet_style))
    story.append(Paragraph("- مفاتيح API للخدمة (Brevo SMTP & API Keys)", bullet_style))
    story.append(Paragraph("- مفتاح Gemini API", bullet_style))
    story.append(Paragraph("- JWT_SECRET ضعيفة: smartgrocer_secret_key_2025", bullet_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("الخطر: اي شخص يحصل على هذا الملف يمكنه الوصول الكامل لقاعدة البيانات.", body_style))
    
    story.append(Paragraph("2. طباعة رمز التحقق في Console", subsection_style))
    story.append(Paragraph("الملف: routes/auth.js | الخطورة: O حرجة", callout_style))
    story.append(Paragraph("console.log('[FALLBACK] Reset token:', resetToken);", code_style))
    story.append(Paragraph("المشكلة: عند فشل ارسال البريد، يتم طباعة رمز التحقق مما يسمح بسرقة الحسابات.", body_style))
    
    story.append(Paragraph("3. Admin يمكنه تعيين كلمة مرور بدون تشفير", subsection_style))
    story.append(Paragraph("الملف: routes/admin.js | الخطورة: O حرجة", callout_style))
    story.append(Paragraph("user.password = password.trim(); // بدون تشفير!", code_style))
    story.append(Paragraph("المشكلة: كلمة المرور تحفظ كنص عادي بدلا من Hash.", body_style))
    
    story.append(PageBreak())
    
    # HIGH
    story.append(Paragraph("الثغرات العالية (HIGH)", section_style))
    
    story.append(Paragraph("4. توكن JWT في URL", subsection_style))
    story.append(Paragraph("الملف: public/js/app.js | الخطورة: O عالية", callout_style))
    story.append(Paragraph("EventSource('/api/sse?token=' + token);", code_style))
    story.append(Paragraph("المشكلة: التوكن يظهر في URL مما قد يسجل في سجلات المتصفح.", body_style))
    
    story.append(Paragraph("5. عدم وجود Cookie Security", subsection_style))
    story.append(Paragraph("الخطورة: O عالية", callout_style))
    story.append(Paragraph("JWT يرسل بدون httpOnly, secure, sameSite flags مما يجعله عرضة للسرقة عبر XSS.", body_style))
    
    story.append(Paragraph("6. Room_setting CORS مرنة جدا", subsection_style))
    story.append(Paragraph("الملف: server.js | الخطورة: O عالية", callout_style))
    story.append(Paragraph("في بيئة development، يتم السماح من اي origin.", body_style))
    
    # MEDIUM
    story.append(Paragraph("الثغرات المتوسطة (MEDIUM)", section_style))
    story.append(Paragraph("7. عدم وجود حماية CSRF - لا يوجد CsrfToken middleware.", body_style))
    story.append(Paragraph("8. عدم وجود Logout endpoint - لا يتم الغاء التوكن في الخادم.", body_style))
    story.append(Paragraph("9. التحقق من البريد الالكتروني غير كاف - لا يوجد تحقق regex.", body_style))
    story.append(Paragraph("10. Rate Limiting قد لا يكون كافيا - 100 طلب/15 دقيقة.", body_style))
    
    # POSITIVE
    story.append(Paragraph("ملاحظات ايجابية", section_style))
    story.append(Paragraph("+ استخدام bcrypt لتشفير كلمات المرور", bullet_style))
    story.append(Paragraph("+ استخدام express-mongo-sanitize للحماية من NoSQL Injection", bullet_style))
    story.append(Paragraph("+ استخدام helmet للامان", bullet_style))
    story.append(Paragraph("+ حماية Prototype Pollution", bullet_style))
    story.append(Paragraph("+ Rate Limiting", bullet_style))
    story.append(Paragraph("+ التحقق من الادوار (admin, support, store_owner)", bullet_style))
    
    story.append(PageBreak())
    
    # PRIORITY TABLE
    story.append(Paragraph("جدول الاولوية في الاصلاح", section_style))
    
    data = [
        ['الاولوية', 'الثغرة', 'الوقت المتوقع'],
        ['O فوري', 'ملف .env + تغيير كلمات المرور', 'الآن'],
        ['O فوري', 'حذف console.log للتوثيق', 'الآن'],
        ['O فوري', 'اصلاح تعيين كلمة المرور في Admin', 'الآن'],
        ['O عاجل', 'نقل JWT ل httpOnly cookies', '1-2 يوم'],
        ['O عاجل', 'تقوية JWT_SECRET', '1 ساعة'],
        ['O مهم', 'اضافة CSRF protection', '2-3 ايام'],
        ['O مهم', 'اضافة logout endpoint', '1 ساعة'],
    ]
    
    table = Table(data, colWidths=[3*cm, 9*cm, 3*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
        ('RIGHT', (0, 0), (-1, -1), 10),
    ]))
    story.append(table)
    
    story.append(Spacer(1, 30))
    
    # SUMMARY
    story.append(Paragraph("الخلاصة", section_style))
    story.append(Paragraph("الخطر العام: HIGH", subsection_style))
    story.append(Paragraph("يجب اصلاح الثغرات الحرجة قبل الاطلاق للproduction.", body_style))
    story.append(Spacer(1, 20))
    story.append(Paragraph("انصح بشدة باصلاح الثغرات الحرجة (تسريب .env + console.log + كلمة المرور) قبل اي اطلاق.", callout_style))
    story.append(Spacer(1, 40))
    story.append(Paragraph("--- نهاية التقرير ---", ParagraphStyle('End', alignment=TA_CENTER, textColor=DARK)))

    doc.build(story)
    print("تم انشاء التقرير: Security_Report_SmartGrocer.pdf")

if __name__ == "__main__":
    create_report()
