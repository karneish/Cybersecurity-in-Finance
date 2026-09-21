"""Exercise the OpenAI live-LLM path of LLMClient without a real network call.

The `openai` package is stubbed at sys.modules level so the exact
`AsyncOpenAI().chat.completions.create(...)` integration path is covered
(real API usage is opt-in via USE_MOCK_LLM=false + OPENAI_API_KEY).
"""

import asyncio
import sys
import types
from types import SimpleNamespace

from app.llm.llm_client import LLMClient

_FALLBACK_PROMPT = (
    "EXECUTIVE CYBER RISK SUMMARY:\n"
    "Enterprise Risk Score: 72/100\n"
    "Total EAL: \u20b912,500,000\n"
    "Total Assets Monitored: 5\n"
    "Open Vulnerabilities: 8\n"
    "- Payments Gateway: 85, EAL \u20b94,200,000"
)

_LIVE_RESPONSE = "OpenAI integration path returns this live answer."

_CAPTURED = {}


def _await(coro):
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        loop.close()


class _FakeChatCompletions:
    async def create(self, **kwargs):
        _CAPTURED.update(kwargs)
        if kwargs.get("model") == "boom":
            raise RuntimeError("simulated upstream error")
        message = SimpleNamespace(content=_LIVE_RESPONSE)
        choice = SimpleNamespace(message=message)
        return SimpleNamespace(choices=[choice])


class _FakeOpenAI:
    @staticmethod
    def AsyncOpenAI(api_key=None):
        _CAPTURED["api_key"] = api_key
        client = SimpleNamespace(chat=SimpleNamespace(completions=_FakeChatCompletions()))
        return client


def _stub_openai_module():
    fake_module = types.ModuleType("openai")
    fake_module.AsyncOpenAI = _FakeOpenAI.AsyncOpenAI
    prev = sys.modules.get("openai")
    sys.modules["openai"] = fake_module
    return prev


def test_openai_path_returns_model_response():
    prev = _stub_openai_module()
    try:
        client = LLMClient()
        client.use_mock = False
        client.api_key = "sk-test-key"
        out = _await(client._openai_response("system", _FALLBACK_PROMPT))
        assert out == _LIVE_RESPONSE
        assert _CAPTURED["model"] == client.model
        assert _CAPTURED["messages"][0]["role"] == "system"
        assert _CAPTURED["messages"][1]["content"] == _FALLBACK_PROMPT
    finally:
        _restore_openai_module(prev)


def test_openai_failure_falls_back_to_data_driven_mock():
    prev = _stub_openai_module()
    try:
        client = LLMClient()
        client.use_mock = False
        client.api_key = "sk-test-key"
        client.model = "boom"
        prompt = _FALLBACK_PROMPT.replace("SUMMARY", "DISCUSSION")
        out = _await(client._openai_response("system", prompt))
        assert "OpenAI integration path" not in out
        assert "\u20b912,500,000" in out
    finally:
        _restore_openai_module(prev)


def test_generate_routes_to_openai_when_configured():
    prev = _stub_openai_module()
    try:
        client = LLMClient()
        client.use_mock = False
        client.api_key = "sk-test-key"
        out = _await(client.generate("system", _FALLBACK_PROMPT))
        assert out == _LIVE_RESPONSE
        assert _CAPTURED["api_key"] == "sk-test-key"
    finally:
        _restore_openai_module(prev)


def test_generate_uses_mock_when_not_configured():
    prev = _stub_openai_module()
    try:
        client = LLMClient()
        client.use_mock = True
        client.api_key = ""
        out = _await(client.generate("system", _FALLBACK_PROMPT))
        assert out != _LIVE_RESPONSE
        assert "72/100" in out
    finally:
        _restore_openai_module(prev)


def _restore_openai_module(prev):
    if prev is None:
        sys.modules.pop("openai", None)
    else:
        sys.modules["openai"] = prev