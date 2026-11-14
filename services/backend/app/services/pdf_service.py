import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.encounter import Encounter
from app.services.r2_storage import get_object_bytes_from_r2
from app.utils.crypto import decrypt_field

def generate_medical_report_pdf(encounter: Encounter) -> bytes:
    """Tạo tệp PDF phiếu khám ngoại trú chuẩn y tế A4 theo UC009"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        alignment=1,
        spaceAfter=4,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        alignment=1,
        spaceAfter=12,
        textColor=colors.HexColor("#475569")
    )
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        spaceBefore=8,
        spaceAfter=4,
        textColor=colors.HexColor("#0284c7")
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b")
    )
    bold_body_style = ParagraphStyle(
        'BoldBody',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # 1. Header Bệnh viện / Phòng khám
    header_data = [
        [
            Paragraph("<b>PHÒNG KHÁM CHUYÊN KHOA PHỔI LUNGXRAY</b><br/>Khoa Hô hấp & Ung bướu lồng ngực<br/>Website: lungxray.me", body_style),
            Paragraph(f"<b>MÃ BỆNH NHÂN: {encounter.patient.patient_code if encounter.patient else 'N/A'}</b><br/>Mã lượt khám: {encounter.encounter_code}<br/>Ngày khám: {encounter.admission_time.strftime('%d/%m/%Y %H:%M')}", body_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[10 * cm, 8 * cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.5 * cm))

    # Tiêu đề phiếu khám
    story.append(Paragraph("PHIẾU KHÁM BỆNH NGOẠI TRÚ & KẾT QUẢ X-QUANG", title_style))
    story.append(Paragraph("(Kết quả hỗ trợ sàng lọc bệnh lý phổi bằng Học sâu ResNet18 & U-Net)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=10))

    # 2. Thông tin hành chính bệnh nhân
    story.append(Paragraph("I. THÔNG TIN HÀNH CHÍNH", section_style))
    patient = encounter.patient
    dob_str = patient.date_of_birth.strftime("%d/%m/%Y") if patient and patient.date_of_birth else "N/A"
    gender_map = {"MALE": "Nam", "FEMALE": "Nữ", "OTHER": "Khác"}
    gender_str = gender_map.get(patient.gender, patient.gender) if patient else "N/A"

    decrypted_card = decrypt_field(patient.card_number) if patient else "N/A"
    decrypted_phone = decrypt_field(patient.phone) if patient else "N/A"

    patient_table_data = [
        [
            Paragraph(f"<b>Họ và tên:</b> {patient.full_name if patient else 'N/A'}", body_style),
            Paragraph(f"<b>Ngày sinh:</b> {dob_str}", body_style),
            Paragraph(f"<b>Giới tính:</b> {gender_str}", body_style),
        ],
        [
            Paragraph(f"<b>CCCD/CMND:</b> {decrypted_card}", body_style),
            Paragraph(f"<b>Điện thoại:</b> {decrypted_phone}", body_style),
            Paragraph(f"<b>Bảo hiểm y tế:</b> {patient.insurance_number or 'Không' if patient else 'Không'}", body_style),
        ],
        [
            Paragraph(f"<b>Địa chỉ:</b> {patient.address or 'N/A' if patient else 'N/A'}", body_style),
            Paragraph(f"<b>Phòng khám:</b> {encounter.clinic_room}", body_style),
            Paragraph(f"<b>Bác sĩ khám:</b> {encounter.doctor.full_name if encounter.doctor else 'Chưa phân công'}", body_style),
        ]
    ]
    p_table = Table(patient_table_data, colWidths=[6.5 * cm, 5.5 * cm, 6 * cm])
    p_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(p_table)
    story.append(Spacer(1, 0.3 * cm))

    # 3. Diễn biến lâm sàng
    rec = encounter.clinical_record
    story.append(Paragraph("II. HỎI BỆNH & KHÁM LÂM SÀNG", section_style))
    clinical_data = [
        [Paragraph("<b>Lý do đến khám:</b>", bold_body_style), Paragraph(rec.chief_complaint or "Chưa ghi nhận", body_style) if rec else Paragraph("Chưa ghi nhận", body_style)],
        [Paragraph("<b>Bệnh sử hiện tại:</b>", bold_body_style), Paragraph(rec.present_illness or "Chưa ghi nhận", body_style) if rec else Paragraph("Chưa ghi nhận", body_style)],
        [Paragraph("<b>Tiền sử bệnh lý:</b>", bold_body_style), Paragraph(rec.medical_history or "Chưa ghi nhận", body_style) if rec else Paragraph("Chưa ghi nhận", body_style)],
        [Paragraph("<b>Khám thực thể:</b>", bold_body_style), Paragraph(rec.physical_exam or "Chưa ghi nhận", body_style) if rec else Paragraph("Chưa ghi nhận", body_style)],
    ]
    c_table = Table(clinical_data, colWidths=[4 * cm, 14 * cm])
    c_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(c_table)
    story.append(Spacer(1, 0.3 * cm))

    # 4. Kết quả chẩn đoán hình ảnh AI
    story.append(Paragraph("III. KẾT QUẢ CHẨN ĐOÁN HÌNH ẢNH & TRỢ LÝ AI", section_style))
    latest_xray = encounter.xray_images[-1] if encounter.xray_images else None
    
    if latest_xray and latest_xray.ai_result:
        ai = latest_xray.ai_result
        
        # Thử đọc ảnh overlay hoặc ảnh gốc từ R2 nhúng vào PDF
        try:
            target_key = ai.overlay_image_url or latest_xray.image_url
            img_bytes = get_object_bytes_from_r2(target_key)
            img_flowable = RLImage(io.BytesIO(img_bytes), width=6.5 * cm, height=6.5 * cm)
        except Exception:
            img_flowable = Paragraph("<i>(Không tải được hình ảnh từ R2)</i>", body_style)

        # Hiển thị kết quả 3 nhóm
        predictions_text = ""
        if ai.predictions_payload and isinstance(ai.predictions_payload, dict):
            preds = ai.predictions_payload.get("predictions", [])
            for p in preds:
                flag_str = "CẢNH BÁO" if p.get("flagged") else "Bình thường"
                predictions_text += f"• <b>{p.get('name')}:</b> {(p.get('probability', 0)*100):.1f}% (Ngưỡng {p.get('threshold', 0)*100:.1f}%) - <i>{flag_str}</i><br/>"
        elif ai.predicted_category:
            predictions_text = f"• <b>Đánh giá:</b> {ai.predicted_category}<br/>"
            if ai.confidence_score:
                predictions_text += f"• <b>Độ tin cậy:</b> {(float(ai.confidence_score)*100):.1f}%<br/>"
        else:
            predictions_text = "Chưa có kết luận cụ thể từ mô hình AI.<br/>"

        ai_info_data = [
            [
                img_flowable,
                [
                    Paragraph("<b>Kỹ thuật chụp:</b> X-quang ngực thẳng 2D số hóa", body_style),
                    Paragraph("<b>Phân đoạn:</b> U-Net trích xuất tự động vùng phế trường", body_style),
                    Paragraph("<b>Phân loại bệnh lý phổi (ResNet18):</b>", bold_body_style),
                    Paragraph(predictions_text, body_style),
                    Spacer(1, 0.2 * cm),
                    Paragraph(f"<b>Nhận xét của Bác sĩ điều trị:</b><br/>{ai.doctor_comment or 'Đồng thuận với kết quả khảo sát hình ảnh.'}", body_style)
                ]
            ]
        ]
        ai_table = Table(ai_info_data, colWidths=[7 * cm, 11 * cm])
        ai_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(ai_table)
    else:
        story.append(Paragraph("<i>Chưa thực hiện chụp X-quang hoặc chạy suy luận AI trong lượt khám này.</i>", body_style))

    story.append(Spacer(1, 0.3 * cm))

    # 5. Kết luận & Hướng xử trí
    story.append(Paragraph("IV. CHẨN ĐOÁN XÁC ĐỊNH & PHƯƠNG ÁN ĐIỀU TRỊ", section_style))
    conclusion_data = [
        [Paragraph("<b>Chẩn đoán xác định:</b>", bold_body_style), Paragraph(rec.final_diagnosis or "Đang hoàn thiện chẩn đoán", body_style) if rec else Paragraph("Đang hoàn thiện chẩn đoán", body_style)],
        [Paragraph("<b>Hướng xử trí / Đơn thuốc:</b>", bold_body_style), Paragraph(rec.treatment_plan or "Chưa kê đơn", body_style) if rec else Paragraph("Chưa kê đơn", body_style)],
        [Paragraph("<b>Lời dặn & Hẹn tái khám:</b>", bold_body_style), Paragraph(rec.follow_up_recommendation or "Tái khám khi có triệu chứng bất thường", body_style) if rec else Paragraph("Tái khám khi có triệu chứng bất thường", body_style)],
    ]
    concl_table = Table(conclusion_data, colWidths=[4 * cm, 14 * cm])
    concl_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(concl_table)
    story.append(Spacer(1, 0.5 * cm))

    # 6. Chữ ký
    date_now = datetime.now()
    sig_data = [
        [
            Paragraph("", body_style),
            Paragraph(f"<i>Đà Nẵng, ngày {date_now.day:02d} tháng {date_now.month:02d} năm {date_now.year}</i><br/><b>BÁC SĨ KHÁM BỆNH</b><br/><br/><br/><br/><b>{encounter.doctor.full_name if encounter.doctor else 'BS. Điều Trị'}</b>", ParagraphStyle('Center', alignment=1, parent=body_style))
        ]
    ]
    sig_table = Table(sig_data, colWidths=[10 * cm, 8 * cm])
    story.append(sig_table)

    doc.build(story)
    return buffer.getvalue()
