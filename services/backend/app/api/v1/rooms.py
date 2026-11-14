from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.room import Room
from app.models.user import User
from app.schemas.room import RoomResponse, RoomCreate
from app.api.deps import get_current_user

router = APIRouter(prefix="/rooms", tags=["Phòng khám"])

@router.get("", response_model=List[RoomResponse])
def get_all_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rooms = db.query(Room).order_by(Room.id.asc()).all()

    assigned_doctors = db.query(User).filter(
        User.role == "DOCTOR",
        User.is_active == True,
        User.room_id.isnot(None)
    ).all()
    doctor_by_room_id = {doc.room_id: doc for doc in assigned_doctors}

    results = []
    for r in rooms:
        doc = doctor_by_room_id.get(r.id)
        if not doc and r.room_name:
            doc = db.query(User).filter(
                User.role == "DOCTOR",
                User.is_active == True,
                User.name_room == r.room_name
            ).first()

        results.append(
            RoomResponse(
                id=r.id,
                room_code=r.room_code,
                room_name=r.room_name,
                is_active=r.is_active,
                is_assigned=doc is not None,
                assigned_doctor_id=doc.id if doc else None,
                assigned_doctor_name=doc.full_name if doc else None,
                created_at=r.created_at
            )
        )
    return results

@router.get("/available", response_model=List[RoomResponse])
def get_available_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_rooms = get_all_rooms(db=db, current_user=current_user)
    return [r for r in all_rooms if not r.is_assigned and r.is_active]

@router.get("/my-status")
def get_my_room_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy trạng thái phòng khám của bác sĩ hiện tại"""
    room = db.query(Room).filter(Room.id == current_user.room_id).first() if current_user.room_id else None
    if not room and current_user.name_room:
        room = db.query(Room).filter(Room.room_name == current_user.name_room).first()

    return {
        "room_id": room.id if room else current_user.room_id,
        "room_name": room.room_name if room else current_user.name_room,
        "is_active": current_user.is_available
    }

@router.patch("/my-status")
def toggle_my_room_status(
    is_active: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bác sĩ bật/tắt trạng thái hoạt động tiếp nhận bệnh của phòng khám"""
    current_user.is_available = is_active
    db.commit()
    db.refresh(current_user)

    room = db.query(Room).filter(Room.id == current_user.room_id).first() if current_user.room_id else None
    if not room and current_user.name_room:
        room = db.query(Room).filter(Room.room_name == current_user.name_room).first()

    return {
        "id": room.id if room else 1,
        "room_code": room.room_code if room else "PK01",
        "room_name": room.room_name if room else current_user.name_room or "Phòng Khám Hô Hấp 101",
        "is_active": is_active,
        "is_assigned": True,
        "assigned_doctor_id": current_user.id,
        "assigned_doctor_name": current_user.full_name,
        "created_at": room.created_at if room else current_user.created_at
    }
