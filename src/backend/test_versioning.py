import pytest

from core.versioning import client_version_below_minimum


@pytest.mark.parametrize(
    ("client", "minimum", "expected_below"),
    [
        ("1.0.0", "1.0.1", True),
        ("1.0.1", "1.0.1", False),
        ("1.0.2", "1.0.1", False),
        ("1.0.9", "1.0.10", True),
        ("1.0.10", "1.0.10", False),
        ("2.0.0", "1.9.9", False),
    ],
)
def test_client_version_below_minimum(
    client: str, minimum: str, expected_below: bool
) -> None:
    assert client_version_below_minimum(client, minimum) is expected_below
