from sqlalchemy.orm import Session
from fastapi import Depends

from src.core.db import get_db


DbSession = Session


def db_session(db: Session = Depends(get_db)) -> Session:
    return db
