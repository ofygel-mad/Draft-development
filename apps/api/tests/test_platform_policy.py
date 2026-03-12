from pathlib import Path


def test_release_docs_exist():
    root = Path(__file__).resolve().parents[3]
    required = [
        root / 'docs/operations/release-readiness.md',
        root / 'docs/operations/incident-runbook.md',
        root / 'docs/operations/slo-and-alerting.md',
        root / 'docs/product/success-metrics.md',
        root / 'docs/product/definition-of-done.md',
        root / 'docs/testing/test-matrix.md',
    ]

    missing = [str(path) for path in required if not path.exists()]
    assert not missing, f'Missing required platform docs: {missing}'
