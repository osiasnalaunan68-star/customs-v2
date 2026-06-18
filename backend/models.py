from sqlalchemy import Column, Integer, String, create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from werkzeug.security import generate_password_hash, check_password_hash
import os
import time

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)  # UNIQUE constraint
    hashed_password = Column(String, nullable=False)

    def verify_password(self, plain_password):
        return check_password_hash(self.hashed_password, plain_password)

    @classmethod
    def hash_password(cls, plain_password):
        return generate_password_hash(plain_password)

# Connection pooling with timeout
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./customs.db")

# For PostgreSQL, use connection pooling with timeout
if DATABASE_URL.startswith("postgresql"):
    # Use connection pooling with 3-second timeout
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=3,  # 3-second timeout
        pool_recycle=300,
        connect_args={"connect_timeout": 3}
    )
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables with unique constraint
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()
