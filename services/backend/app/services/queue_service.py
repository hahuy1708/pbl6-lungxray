from datetime import datetime, date
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.encounter import Encounter
from app.models.user import User
from app.models.room import Room

MAX_DAILY_PATIENTS_PER_ROOM = 35

def get_clinic_room_stats(db: Session) -> List[Dict[str, Any]]:
    """Thống kê tình trạng tải của các phòng khám trong ngày hôm nay (UC004)"""
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())

    # Lấy danh sách các phòng khám trong hệ thống
    rooms = db.query(Room).filter(Room.is_active == True).order_by(Room.id.asc()).all()
    assigned_doctors = db.query(User).filter(
        User.role == "DOCTOR",
        User.is_active == True
    ).all()
    doctor_by_room_id = {doc.room_id: doc for doc in assigned_doctors if doc.room_id}
    doctor_by_room_name = {doc.name_room: doc for doc in assigned_doctors if doc.name_room}

    stats = []
    for r in rooms:
        doc = doctor_by_room_id.get(r.id) or doctor_by_room_name.get(r.room_name)
        doc_is_available = doc.is_available if doc else True
        doc_name = doc.full_name if doc else "Chưa gán bác sĩ"

        # Đếm tổng số ca tiếp nhận trong ngày của phòng
        total_today = db.query(func.count(Encounter.id)).filter(
            Encounter.clinic_room == r.room_name,
            Encounter.admission_time >= today_start,
            Encounter.admission_time <= today_end
        ).scalar() or 0

        # Đếm số ca đang chờ
        waiting_count = db.query(func.count(Encounter.id)).filter(
            Encounter.clinic_room == r.room_name,
            Encounter.status == "WAITING",
            Encounter.admission_time >= today_start,
            Encounter.admission_time <= today_end
        ).scalar() or 0

        # Đếm số ca đang khám
        in_progress_count = db.query(func.count(Encounter.id)).filter(
            Encounter.clinic_room == r.room_name,
            Encounter.status == "IN_PROGRESS",
            Encounter.admission_time >= today_start,
            Encounter.admission_time <= today_end
        ).scalar() or 0

        is_overloaded = total_today >= MAX_DAILY_PATIENTS_PER_ROOM or not doc_is_available

        stats.append({
            "code": r.room_code,
            "name": r.room_name,
            "doctor_name": doc_name,
            "is_available": doc_is_available,
            "total_today": total_today,
            "waiting_count": waiting_count,
            "in_progress_count": in_progress_count,
            "max_capacity": MAX_DAILY_PATIENTS_PER_ROOM,
            "is_overloaded": is_overloaded,
            "load_percentage": round((total_today / MAX_DAILY_PATIENTS_PER_ROOM) * 100, 1)
        })

    # Ưu tiên các phòng đang hoạt động (chưa quá tải) và có ít người chờ nhất lên đầu danh sách chọn
    stats.sort(key=lambda x: (not x["is_available"], x["is_overloaded"], x["waiting_count"], x["total_today"]))
    return stats

def assign_patient_to_room(db: Session, encounter: Encounter, clinic_room_name: str) -> Encounter:
    """Phân bổ bệnh nhân vào phòng khám và cấp số thứ tự STT (UC004)"""
    # 1. Kiểm tra bác sĩ phụ trách phòng khám có đang BẬT trạng thái hoạt động không
    assigned_doctor = db.query(User).filter(
        User.role == "DOCTOR",
        User.is_active == True,
        User.name_room == clinic_room_name
    ).first()

    if assigned_doctor and not getattr(assigned_doctor, "is_available", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bác sĩ {assigned_doctor.full_name} ({clinic_room_name}) hiện đang TẠM NGHỈ, không thể tiếp nhận thêm bệnh nhân."
        )

    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())

    # Kiểm tra phòng khám đã đầy (quá tải) chưa
    total_today = db.query(func.count(Encounter.id)).filter(
        Encounter.clinic_room == clinic_room_name,
        Encounter.admission_time >= today_start,
        Encounter.admission_time <= today_end
    ).scalar() or 0

    if total_today >= MAX_DAILY_PATIENTS_PER_ROOM:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phòng khám '{clinic_room_name}' đã đạt tối đa {MAX_DAILY_PATIENTS_PER_ROOM} hồ sơ trong ngày. Vui lòng chọn phòng khác."
        )

    # Cấp số thứ tự STT tự động tăng dần trong ngày của phòng đó
    next_queue_number = total_today + 1

    encounter.clinic_room = clinic_room_name
    encounter.queue_number = next_queue_number
    encounter.status = "WAITING"
    encounter.admission_time = datetime.utcnow()

    db.commit()
    db.refresh(encounter)
    return encounter
