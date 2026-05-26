from __future__ import annotations

import pytest

from citations_golden import load_golden_dataset, run_golden_case


@pytest.fixture(scope="module")
def golden_dataset() -> dict:
    return load_golden_dataset()


@pytest.mark.parametrize("case", load_golden_dataset()["cases"], ids=lambda case: case["id"])
def test_citations_trust_golden_case(case: dict, golden_dataset: dict) -> None:
    failures = run_golden_case(case, golden_dataset)
    assert not failures, "\n".join(failures)
