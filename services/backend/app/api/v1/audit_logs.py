import io
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse
from app.api.deps import require_roles

router = APIRouter(prefix="/audit-logs", tags=["Nhật ký Kiểm toán Hệ thống (Admin)"])

admin_required = require_roles(["ADMIN"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    target_entity: Optional[str] = None,
    target_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """UC011: Tra cứu nhật ký kiểm toán với bộ lọc đa tiêu chí"""
    query = db.query(AuditLog)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if target_entity:
        query = query.filter(AuditLog.target_entity == target_entity)
    if target_id:
        query = query.filter(AuditLog.target_id == target_id)
    if from_date:
        start_dt = datetime.combine(from_date, datetime.min.time())
        query = query.filter(AuditLog.created_at >= start_dt)
    if to_date:
        end_dt = datetime.combine(to_date, datetime.max.time())
        query = query.filter(AuditLog.created_at <= end_dt)

    logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()
    return logs

@router.get("/export")
def export_audit_logs_excel(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    target_entity: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """UC011: Xuất báo cáo nhật ký kiểm toán ra tệp Excel (.xlsx)"""
    query = db.query(AuditLog)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if target_entity:
        query = query.filter(AuditLog.target_entity == target_entity)
    if from_date:
        start_dt = datetime.combine(from_date, datetime.min.time())
        query = query.filter(AuditLog.created_at >= start_dt)
    if to_date:
        end_dt = datetime.combine(to_date, datetime.max.time())
        query = query.filter(AuditLog.created_at <= end_dt)

    logs = query.order_by(desc(AuditLog.created_at)).limit(1000).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Audit Logs"

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center")

    headers = ["ID", "Thời gian", "Người thực hiện", "Vai trò", "Hành động", "Bảng dữ liệu", "Mã đối tượng", "Địa chỉ IP", "Chi tiết thay đổi"]
    ws.append(headers)

    for col_num, _ in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    for log in logs:
        username = log.user.username if log.user else "System"
        role = log.user.role if log.user else "N/A"
        time_str = log.created_at.strftime("%d/%m/%Y %H:%M:%S")
        details_str = str(log.details) if log.details else ""

        ws.append([
            log.id,
            time_str,
            username,
            role,
            log.action,
            log.target_entity,
            log.target_id or "",
            log.ip_address or "",
            details_str
        ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 50)

    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_bytes = excel_buffer.getvalue()
    excel_buffer.close()

    filename = f"Audit_Logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
