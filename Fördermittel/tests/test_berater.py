"""Light unit tests for the Berater agent wiring.

These deliberately do NOT touch the LLM, the network, or the MCP subprocess —
they assert the persona carries the load-bearing rules and that the pure
construction helpers are importable.
"""

from __future__ import annotations

from foerder.berater import (
    BERATER_SYSTEM,
    MCP_SERVERS,
    build_llm,
    build_mcp_client,
    run_berater,
)


def test_persona_contains_key_rules() -> None:
    # The federal-coverage rule is the core correctness contract.
    assert "bundesweit" in BERATER_SYSTEM
    # The legal disclaimer must always be present.
    assert "keine Rechtsberatung" in BERATER_SYSTEM
    # Both tools must be named so the agent knows its surface.
    assert "search_funding" in BERATER_SYSTEM
    assert "get_program" in BERATER_SYSTEM
    # Grounding / no-hallucination line.
    assert "QUELLENBINDUNG" in BERATER_SYSTEM


def test_mcp_servers_config_launches_foerder_over_stdio() -> None:
    foerder = MCP_SERVERS["foerder"]
    assert foerder["transport"] == "stdio"
    assert foerder["command"] == "uv"
    assert "foerder-mcp" in foerder["args"]


def test_helpers_are_importable_and_callable() -> None:
    # We don't invoke the LLM; we only assert the symbols exist and are callable.
    assert callable(build_llm)
    assert callable(build_mcp_client)
    assert callable(run_berater)
