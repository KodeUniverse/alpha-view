import os


def get_credentials() -> tuple[str, str]:
    api_key = os.environ.get("ALPACA_API_KEY")
    api_secret = os.environ.get("ALPACA_API_SECRET")
    if not api_key or not api_secret:
        raise RuntimeError("Alpaca API key/secret is undefined.")
    return api_key, api_secret

