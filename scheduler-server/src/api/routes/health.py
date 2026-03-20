from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}
