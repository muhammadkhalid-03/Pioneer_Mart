"""Semantic-ish version comparison for minimum app version checks."""


def version_tuple(version: str) -> tuple[int, ...]:
    parts: list[int] = []
    for segment in version.strip().split("."):
        try:
            parts.append(int(segment))
        except ValueError:
            parts.append(0)
    return tuple(parts)


def padded_version_key(version: str, width: int) -> tuple[int, ...]:
    t = version_tuple(version)
    if len(t) >= width:
        return t[:width]
    return t + (0,) * (width - len(t))


def client_version_below_minimum(client_version: str, minimum_version: str) -> bool:
    """True when client should be blocked (strictly less than minimum)."""
    wc = version_tuple(client_version)
    wm = version_tuple(minimum_version)
    n = max(len(wc), len(wm))
    ca = padded_version_key(client_version, n)
    mb = padded_version_key(minimum_version, n)
    return ca < mb
