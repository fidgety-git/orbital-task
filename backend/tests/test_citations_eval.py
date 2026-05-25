from __future__ import annotations

import pytest

from takehome.eval.citations_eval import load_eval_dataset, run_eval_case


@pytest.fixture(scope="module")
def eval_dataset() -> dict:
    return load_eval_dataset()


@pytest.mark.parametrize("case", load_eval_dataset()["cases"], ids=lambda case: case["id"])
def test_citations_trust_eval_case(case: dict, eval_dataset: dict) -> None:
    failures = run_eval_case(case, eval_dataset)
    assert not failures, "\n".join(failures)
