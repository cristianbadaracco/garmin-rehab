from fastapi import APIRouter

router = APIRouter()


@router.post("/register")
async def register():
    """Register a new user."""
    # TODO: implement
    return {"status": "not_implemented"}


@router.post("/login")
async def login():
    """Login and get JWT token."""
    # TODO: implement
    return {"status": "not_implemented"}
