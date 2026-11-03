"""Lecturer analytics (FR-08): how AI drafts compare with lecturer decisions.

All score figures are on a 0–100 scale (score / assignment max × 100) so
assignments with different maxima can be compared.
"""

from collections import Counter, defaultdict
from statistics import mean
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models.enums import Role
from app.models.models import (
    Assignment,
    Class,
    EvaluationRun,
    GradeRevision,
    Submission,
    User,
)
from app.security.dependencies import get_current_user

analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])

SCORE_BUCKETS = [
    ("<50", 0.0, 50.0),
    ("50–64", 50.0, 65.0),
    ("65–79", 65.0, 80.0),
    ("80–89", 80.0, 90.0),
    ("90–100", 90.0, 100.0001),
]
DECISIONS = ("accepted", "edited", "rejected", "manual")


def _pct(score: float | None, max_score: float) -> float | None:
    if score is None or not max_score:
        return None
    return max(0.0, min(100.0, float(score) / float(max_score) * 100.0))


def _avg(values: list[float]) -> float | None:
    return round(mean(values), 1) if values else None


def _rate(part: int, whole: int) -> float | None:
    return round(part / whole, 3) if whole else None


@analytics_router.get("")
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    classes = db.query(Class).filter(Class.dosenId == current_user.id).all()
    class_names = {c.id: c.name for c in classes}
    assignments = (
        db.query(Assignment)
        .options(selectinload(Assignment.rubric))
        .filter(Assignment.classId.in_(list(class_names)))
        .all()
        if class_names
        else []
    )
    assignment_ids = [a.id for a in assignments]
    submissions = (
        db.query(Submission)
        .options(
            selectinload(Submission.evaluations),
            selectinload(Submission.grades),
            joinedload(Submission.assignment),
        )
        .filter(Submission.assignmentId.in_(assignment_ids))
        .all()
        if assignment_ids
        else []
    )

    criterion_meta: dict[str, dict[str, Any]] = {}
    for a in assignments:
        if a.rubric:
            for cr in a.rubric.criteria:
                criterion_meta[cr.id] = {"label": cr.label, "maxScore": cr.maxScore, "assignmentTitle": a.title}

    evaluated = 0
    pending_review = 0
    released: list[tuple[Submission, GradeRevision]] = []
    for s in submissions:
        has_eval = bool(s.evaluations)
        grade = next((g for g in s.grades if g.id == s.releasedGradeId and g.status == "RELEASED"), None)
        if has_eval:
            evaluated += 1
        if grade is not None:
            released.append((s, grade))
        elif has_eval:
            pending_review += 1

    eval_by_id: dict[str, EvaluationRun] = {ev.id: ev for s in submissions for ev in s.evaluations}

    final_pcts: list[float] = []
    deviations: list[float] = []
    ai_assisted = 0
    ai_edited = 0
    decision_counts: Counter[str] = Counter({d: 0 for d in DECISIONS})
    crit_dev: dict[str, list[float]] = defaultdict(list)
    buckets: Counter[str] = Counter({label: 0 for label, _, _ in SCORE_BUCKETS})

    for s, g in released:
        max_score = s.assignment.maxScore
        final_pct = _pct(g.finalScore, max_score)
        if final_pct is not None:
            final_pcts.append(final_pct)
            for label, lo, hi in SCORE_BUCKETS:
                if lo <= final_pct < hi:
                    buckets[label] += 1
                    break

        ev = eval_by_id.get(str(g.evaluationRunId)) if g.evaluationRunId else None
        if ev is not None or g.isAIAssisted:
            ai_assisted += 1
            if g.editedFromAI:
                ai_edited += 1
        if ev is not None and ev.suggestedTotalScore is not None and final_pct is not None:
            ai_pct = _pct(ev.suggestedTotalScore, max_score)
            if ai_pct is not None:
                deviations.append(abs(ai_pct - final_pct))

        for item in g.perCriterionFinal or []:
            if not isinstance(item, dict):
                continue
            decision = item.get("decision")
            if decision in DECISIONS:
                decision_counts[decision] += 1
            meta = criterion_meta.get(item.get("criterionId", ""))
            ai_score = item.get("aiScore")
            if meta and ai_score is not None and item.get("finalScore") is not None and meta["maxScore"]:
                crit_dev[item["criterionId"]].append(
                    abs(float(ai_score) - float(item["finalScore"])) / float(meta["maxScore"]) * 100.0
                )

    criterion_deviation = sorted(
        (
            {
                "criterionId": cid,
                "label": criterion_meta[cid]["label"],
                "assignmentTitle": criterion_meta[cid]["assignmentTitle"],
                "meanAbsoluteDeviation": _avg(values),
                "samples": len(values),
            }
            for cid, values in crit_dev.items()
        ),
        key=lambda r: -(r["meanAbsoluteDeviation"] or 0),
    )

    per_assignment = []
    subs_by_assignment: dict[str, list[Submission]] = defaultdict(list)
    for s in submissions:
        subs_by_assignment[str(s.assignmentId)].append(s)
    for a in sorted(assignments, key=lambda x: x.createdAt or 0, reverse=True):
        subs = subs_by_assignment.get(str(a.id), [])
        ai_pcts = [
            p
            for s in subs
            if s.evaluations and (p := _pct(s.evaluations[0].suggestedTotalScore, a.maxScore)) is not None
        ]
        fin_pcts = [
            p
            for s in subs
            for g in s.grades
            if g.id == s.releasedGradeId and g.status == "RELEASED" and (p := _pct(g.finalScore, a.maxScore)) is not None
        ]
        per_assignment.append({
            "id": a.id,
            "title": a.title,
            "className": class_names.get(a.classId, ""),
            "classId": a.classId,
            "submissions": len(subs),
            "evaluated": sum(1 for s in subs if s.evaluations),
            "graded": len(fin_pcts),
            "averageAI": _avg(ai_pcts),
            "averageFinal": _avg(fin_pcts),
        })

    return {
        "classesCount": len(classes),
        "assignmentsCount": len(assignments),
        "submissionsCount": len(submissions),
        "gradesCount": len(released),
        "evaluatedCount": evaluated,
        "pendingReviewCount": pending_review,
        "aiAdoptionRate": _rate(ai_assisted, len(released)),
        "aiEditedRate": _rate(ai_edited, ai_assisted),
        "meanAbsoluteDeviation": _avg(deviations),
        "averageScore": _avg(final_pcts),
        "decisionCounts": dict(decision_counts),
        "scoreDistribution": [{"label": label, "count": buckets[label]} for label, _, _ in SCORE_BUCKETS],
        "criterionDeviation": criterion_deviation,
        "assignments": per_assignment,
    }
