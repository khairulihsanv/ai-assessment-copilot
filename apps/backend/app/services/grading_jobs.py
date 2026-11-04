"""AI drafts as in-process background jobs.

Local models can take many minutes on a CPU, so a draft must outlive the browser
request that started it: the lecturer may close the page and come back. There is at
most one running job per submission, and the model works on one job at a time.

State lives in this process, so the backend must run with a single worker. A restart
loses running jobs; nothing is stored for them and the lecturer can simply run them again.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from app.services.evaluator_service import EvaluationFailedError
from app.services.llm_client import llm_progress

logger = logging.getLogger(__name__)

CANCELLED_MESSAGE = "Dibatalkan oleh dosen. Draf AI tidak disimpan."
QUEUED_MESSAGE = "Menunggu giliran, model sedang mengerjakan jawaban lain…"
WRITING_MESSAGE = "Model menulis draf penilaian…"
TOTAL_STEPS = 4
WRITING_STEP = 3
WRITING_PROGRESS_START = 40
WRITING_PROGRESS_SPAN = 45
FINISHED_JOB_TTL_SECONDS = 3600.0


@dataclass
class GradingJob:
    submission_id: str
    expected_tokens: int = 0
    state: str = "queued"  # queued | running | done | failed | cancelled
    step: int = 1
    message: str = QUEUED_MESSAGE
    progress: int = 10
    tokens: int = 0
    error: str | None = None
    result: dict[str, Any] | None = None
    started_at: float = field(default_factory=time.monotonic)
    finished_at: float | None = None
    task: asyncio.Task | None = None
    # Every step reached, so a stream that connects late can still show them in order.
    history: list[dict[str, Any]] = field(default_factory=list)

    @property
    def is_running(self) -> bool:
        return self.state in ("queued", "running")

    def set_step(self, step: int, message: str, progress: int) -> None:
        self.step, self.message, self.progress = step, message, progress
        self.history.append(self.snapshot())

    def report_tokens(self, tokens: int) -> None:
        self.tokens = tokens
        if self.step == WRITING_STEP:
            self.message = WRITING_MESSAGE
            share = min(1.0, tokens / self.expected_tokens) if self.expected_tokens else 0.0
            self.progress = WRITING_PROGRESS_START + int(WRITING_PROGRESS_SPAN * share)

    def snapshot(self) -> dict[str, Any]:
        return {
            "state": self.state,
            "step": self.step,
            "totalSteps": TOTAL_STEPS,
            "message": self.message,
            "progress": self.progress,
            "tokens": self.tokens,
            "elapsedSeconds": int(time.monotonic() - self.started_at),
        }


_jobs: dict[str, GradingJob] = {}
_gates: dict[asyncio.AbstractEventLoop, asyncio.Semaphore] = {}


def _gate() -> asyncio.Semaphore:
    loop = asyncio.get_running_loop()
    for known in [k for k in _gates if k.is_closed()]:
        del _gates[known]
    return _gates.setdefault(loop, asyncio.Semaphore(1))


def _evict_finished() -> None:
    now = time.monotonic()
    for sub_id, job in list(_jobs.items()):
        if job.finished_at is not None and now - job.finished_at > FINISHED_JOB_TTL_SECONDS:
            del _jobs[sub_id]


async def _run(job: GradingJob, work: Callable[[GradingJob], Awaitable[dict[str, Any]]]) -> None:
    try:
        async with _gate():
            job.state = "running"
            job.set_step(1, "Menyiapkan rubrik dan jawaban mahasiswa…", 10)
            llm_progress.set(job.report_tokens)
            job.result = await work(job)
        job.state = "done"
    except asyncio.CancelledError:
        job.state = "cancelled"
    except EvaluationFailedError as exc:
        job.state = "failed"
        job.error = str(exc)
    except Exception:
        logger.exception("AI draft job failed for submission %s", job.submission_id)
        job.state = "failed"
        job.error = "Terjadi kesalahan saat menyusun draf AI."
    finally:
        job.finished_at = time.monotonic()


def start(
    submission_id: str,
    work: Callable[[GradingJob], Awaitable[dict[str, Any]]],
    expected_tokens: int = 0,
) -> GradingJob:
    """Return the submission's running job, or start a new one."""
    _evict_finished()
    existing = _jobs.get(submission_id)
    if existing is not None and existing.is_running:
        return existing
    job = GradingJob(submission_id=submission_id, expected_tokens=expected_tokens)
    # Runs in its own task, so it does not stop when the request that started it ends.
    job.task = asyncio.create_task(_run(job, work))
    _jobs[submission_id] = job
    return job


def get(submission_id: str) -> GradingJob | None:
    return _jobs.get(submission_id)


def forget(submission_id: str) -> None:
    _jobs.pop(submission_id, None)


def cancel(submission_id: str) -> bool:
    job = _jobs.get(submission_id)
    if job is None or not job.is_running or job.task is None:
        return False
    job.task.cancel()
    return True
