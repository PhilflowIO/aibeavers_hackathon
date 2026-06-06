"""Evaluation harness for the funding-retrieval backend.

Pure metric math (:mod:`eval.metrics`) is testable offline; the live runners
(:mod:`eval.run_eval`, :mod:`eval.smoke`) require ``DEEPINFRA_TOKEN`` plus a
populated Qdrant index and degrade gracefully when either is missing.
"""

from __future__ import annotations
