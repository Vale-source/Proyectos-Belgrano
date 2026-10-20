from sqlalchemy import create_engine, Boolean
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Mapped, mapped_column

DATABASE_URL = "mariadb+pymysql://root:rootpass@127.0.0.1:3306/sabor"

engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(autocommit=False,autoflush=False, bind=engine)

class Base(DeclarativeBase):
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activo: Mapped[bool] = mapped_column(Boolean,default=True)