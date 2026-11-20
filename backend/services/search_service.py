"""
Web Search Adapter — supports SerpAPI and Tavily; gracefully degrades when no key is set.

Setup (optional):
  Set SEARCH_PROVIDER=serpapi and SERPAPI_KEY=<key>, OR
  Set SEARCH_PROVIDER=tavily and TAVILY_API_KEY=<key>

Without a key the service returns an explanatory result set instead of real results.
"""
import logging
import os
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("aura.search")

SEARCH_PROVIDER = os.getenv("SEARCH_PROVIDER", "").strip().lower()
SERPAPI_KEY = os.getenv("SERPAPI_KEY", "").strip()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip()


class SearchService:
    """
    Pluggable web search adapter.  Currently supports:
      - SerpAPI  (Google search results)
      - Tavily   (AI-optimised research results)
      - Mock     (honest placeholder when no key is available)
    """

    @property
    def is_configured(self) -> bool:
        if SEARCH_PROVIDER == "serpapi":
            return bool(SERPAPI_KEY)
        if SEARCH_PROVIDER == "tavily":
            return bool(TAVILY_API_KEY)
        return False

    @property
    def provider_name(self) -> str:
        if SEARCH_PROVIDER in ("serpapi", "tavily"):
            return SEARCH_PROVIDER
        return "none"

    async def search(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Run a web search and return structured results.

        Returns:
            {
                "query": str,
                "provider": str,
                "results": [{"title": str, "url": str, "snippet": str}],
                "is_mock": bool,
                "error": str | None
            }
        """
        if not query.strip():
            return self._error_result(query, "Query must not be empty.")

        if SEARCH_PROVIDER == "serpapi" and SERPAPI_KEY:
            return await self._serpapi_search(query, max_results)
        if SEARCH_PROVIDER == "tavily" and TAVILY_API_KEY:
            return await self._tavily_search(query, max_results)
        return self._mock_result(query)

    # ── SerpAPI ──────────────────────────────────────────────────────────────
    async def _serpapi_search(self, query: str, max_results: int) -> Dict[str, Any]:
        url = "https://serpapi.com/search"
        params = {
            "q": query,
            "api_key": SERPAPI_KEY,
            "num": max_results,
            "engine": "google",
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

            results: List[Dict] = []
            for item in data.get("organic_results", [])[:max_results]:
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                })

            return {
                "query": query,
                "provider": "serpapi",
                "results": results,
                "is_mock": False,
                "error": None,
            }
        except httpx.TimeoutException:
            return self._error_result(query, "SerpAPI request timed out.")
        except Exception as exc:
            logger.exception(f"SerpAPI search failed: {exc}")
            return self._error_result(query, f"SerpAPI error: {exc}")

    # ── Tavily ───────────────────────────────────────────────────────────────
    async def _tavily_search(self, query: str, max_results: int) -> Dict[str, Any]:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": TAVILY_API_KEY,
            "query": query,
            "search_depth": "basic",
            "max_results": max_results,
            "include_answer": False,
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()

            results: List[Dict] = []
            for item in data.get("results", [])[:max_results]:
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("content", ""),
                })

            return {
                "query": query,
                "provider": "tavily",
                "results": results,
                "is_mock": False,
                "error": None,
            }
        except httpx.TimeoutException:
            return self._error_result(query, "Tavily request timed out.")
        except Exception as exc:
            logger.exception(f"Tavily search failed: {exc}")
            return self._error_result(query, f"Tavily error: {exc}")

    # ── Mock / Offline ───────────────────────────────────────────────────────
    def _mock_result(self, query: str) -> Dict[str, Any]:
        """Return an honest placeholder — never fabricate real URLs or snippets."""
        return {
            "query": query,
            "provider": "none",
            "results": [],
            "is_mock": True,
            "error": (
                "No search provider is configured. "
                "Set SEARCH_PROVIDER=serpapi and SERPAPI_KEY, "
                "or SEARCH_PROVIDER=tavily and TAVILY_API_KEY in backend/.env "
                "to enable real web research."
            ),
        }

    def _error_result(self, query: str, message: str) -> Dict[str, Any]:
        return {
            "query": query,
            "provider": self.provider_name,
            "results": [],
            "is_mock": False,
            "error": message,
        }


search_service = SearchService()
