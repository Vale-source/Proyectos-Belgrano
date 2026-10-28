import os
from urllib.parse import quote_plus
from dotenv import load_dotenv
from sqlalchemy import create_engine, Boolean
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Mapped, mapped_column

load_dotenv()

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "rootpass")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "sabor")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    encoded_user = quote_plus(DB_USER)
    encoded_pass = f":{quote_plus(DB_PASSWORD)}" if DB_PASSWORD else ""
    DATABASE_URL = f"mariadb+pymysql://{encoded_user}{encoded_pass}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(autocommit=False,autoflush=False, bind=engine)

class Base(DeclarativeBase):
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activo: Mapped[bool] = mapped_column(Boolean,default=True)