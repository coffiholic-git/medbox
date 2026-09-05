"""6.8 Caregiver Dashboard + FR12. Reuses the same underlying data as
the primary voice interface, gated behind a caregiver role (demo mode
allows this without a login — see backend/security.py)."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend import models
from backend.database import get_db
from backend.schemas import (
    CaregiverAlertRequest,
    CaregiverAlertResponse,
    CaregiverDashboardResponse,
    ScheduleEditRequest,
)
from backend.security import CurrentUser, require_role
from backend.services.notifications import ws_manager

router = APIRouter(prefix="/api/caregiver", tags=["Caregiver Dashboard (FR12)"])


@router.get("/dashboard", response_model=CaregiverDashboardResponse)
def get_caregiver_dashboard(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("caregiver")),
):
    medicines = db.query(models.Medicine).all()
    active_count = len(medicines)

    today = datetime.now()
    window_start = today - timedelta(days=6)
    window_keys = {(window_start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)}

    logs = db.query(models.DoseLog).filter(models.DoseLog.date_key.in_(window_keys)).all()
    taken = sum(1 for l in logs if l.status == "taken")
    adherence = round((taken / len(logs)) * 100, 1) if logs else 100.0

    # Streak — consecutive days (walking back from today) with zero "missed" logs.
    streak = 0
    for i in range(0, 60):
        key = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        day_logs = [l for l in logs if l.date_key == key] if i < 7 else db.query(models.DoseLog).filter(models.DoseLog.date_key == key).all()
        if not day_logs:
            break
        if any(l.status == "missed" for l in day_logs):
            break
        streak += 1

    missed = (
        db.query(models.DoseLog)
        .filter(models.DoseLog.status == "missed")
        .order_by(models.DoseLog.logged_at.desc())
        .limit(5)
        .all()
    )
    med_names = {m.id: m.name for m in medicines}
    recent_missed = [
        {"date": l.date_key, "medName": med_names.get(l.med_id, l.med_id), "reason": "Missed dose"} for l in missed
    ]

    return CaregiverDashboardResponse(
        patientName="Maya Lin",
        primaryCaregiver=current_user.display_name or "Caregiver",
        adherenceRate7d=adherence,
        streakDays=streak,
        activeMedicinesCount=active_count,
        recentMissedDoses=recent_missed,
    )


@router.post("/edit-schedule")
def edit_patient_schedule(
    payload: ScheduleEditRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("caregiver")),
):
    med = db.query(models.Medicine).filter(models.Medicine.id == payload.medId).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found.")

    med.time = payload.newTime
    med.frequency = payload.newFrequency
    db.commit()

    for rem in db.query(models.Reminder).filter(models.Reminder.med_id == payload.medId).all():
        rem.time = payload.newTime
        rem.frequency = payload.newFrequency
    db.commit()

    return {
        "success": True,
        "message": f"{current_user.display_name or 'Caregiver'} updated schedule for {med.name} to {payload.newTime} ({payload.newFrequency}).",
        "updatedAt": datetime.now().isoformat(),
    }


@router.post("/send-alert", response_model=CaregiverAlertResponse)
async def send_caregiver_alert(payload: CaregiverAlertRequest, db: Session = Depends(get_db)):
    """Called by src/utils/api.js's sendCaregiverAlertAPI — a manual
    "notify my caregiver" action from the primary interface, distinct
    from the automatic missed-dose alerts the scheduler raises."""
    alert = models.CaregiverAlert(
        patient_name=payload.patientName,
        caregiver_name=payload.caregiverName,
        med_id=payload.medId,
        message=payload.message or f"{payload.patientName} would like to check in with {payload.caregiverName}.",
        kind="manual",
    )
    db.add(alert)
    db.commit()

    await ws_manager.broadcast(
        {"type": "CAREGIVER_ALERT", "message": alert.message, "patientName": alert.patient_name}
    )

    return CaregiverAlertResponse(success=True, status="dispatched", dispatchedAt=datetime.now().isoformat())
