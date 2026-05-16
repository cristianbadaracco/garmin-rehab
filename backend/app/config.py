from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://dev:dev@localhost:5432/garmin_rehab"

    # Garmin
    garmin_email: str = ""
    garmin_password: str = ""

    # Anthropic
    anthropic_api_key: str = ""

    # JWT
    jwt_secret: str = "cambiar-en-produccion"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 72

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
