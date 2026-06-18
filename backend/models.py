from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from werkzeug.security import generate_password_hash, check_password_hash
import os

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    def verify_password(self, plain_password):
        return check_password_hash(self.hashed_password, plain_password)

    @classmethod
    def hash_password(cls, plain_password):
        return generate_password_hash(plain_password)

# Use absolute path so the database file is created in the same folder as this file
db_path = os.path.join(os.path.dirname(__file__), "customs.db")
DATABASE_URL = f"sqlite:///{db_path}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)
