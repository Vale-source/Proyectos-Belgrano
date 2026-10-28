from sqlalchemy import Integer, UniqueConstraint
from datetime import datetime
from sqlalchemy import String, Numeric, Boolean, ForeignKey, Enum, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum

class Empleado(Base):
    __tablename__ = "empleado"
    __table_args__ = (
        UniqueConstraint('nombre', 'apellido', 'id_sucursal', name='uq_empleado_nombre_apellido_sucursal'),
    )
    
    nombre: Mapped[str] = mapped_column(String(100))
    apellido: Mapped[str] = mapped_column(String(100))
    num_telefono: Mapped[str] = mapped_column(String(20))
    
    id_puesto: Mapped[int] = mapped_column(ForeignKey("puesto.id", ondelete="RESTRICT"))
    puesto: Mapped["Puesto"] = relationship(back_populates="empleados")

    id_sucursal: Mapped[int] = mapped_column(ForeignKey("sucursal.id", ondelete="RESTRICT"))
    sucursal: Mapped["Sucursal"] = relationship(back_populates="trabajadores")


class DiaSemana(enum.Enum):
    LUNES = "Lunes"
    MARTES = "Martes"
    MIERCOLES = "Miercoles"
    JUEVES = "Jueves"
    VIERNES = "Viernes"
    SABADO = "Sabado"
    DOMINGO = "Domingo"

class Horario(Base):
    __tablename__ = "horario"
    __table_args__ = (
        UniqueConstraint('dia', 'hora_apertura', 'hora_cierre', name='uq_horario_dia_horas'),
    )

    dia: Mapped[DiaSemana] = mapped_column(Enum(DiaSemana), nullable=False)
    hora_apertura: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    hora_cierre: Mapped[datetime.time] = mapped_column(Time, nullable=False)

    sucursales: Mapped[list["Sucursal"]] = relationship(
        secondary="sucursal_horario", back_populates="horarios"
    )

class Plato(Base):
    __tablename__ = "plato"
    __table_args__ = (
        UniqueConstraint('nombre', name='uq_plato_nombre'),
    )

    nombre: Mapped[str] = mapped_column(String(100))
    precio: Mapped[float] = mapped_column(Numeric(10,2))
    descripcion: Mapped[str] = mapped_column(String(255), nullable=False)
    apto_celiaco: Mapped[bool] = mapped_column(default=False)

    sucursales: Mapped[list["Sucursal"]] = relationship(
        secondary="sucursal_plato", back_populates="platos"
    )

class Puesto(Base):
    __tablename__ = "puesto"

    nombre: Mapped[str] = mapped_column(String(100))
    sueldo_hora: Mapped[float] = mapped_column(Numeric(10,2), nullable=False)
    carga_horaria_diaria: Mapped[int] = mapped_column(Integer, nullable=False)

    empleados: Mapped[list["Empleado"]] = relationship(back_populates="puesto")

class Sucursal(Base):
    __tablename__ = "sucursal"
    __table_args__ = (
        UniqueConstraint('nombre', name='uq_sucursal_nombre'),
    )

    nombre: Mapped[str] = mapped_column(String(100))
    direccion: Mapped[str] = mapped_column(String(255), nullable=False)
    num_telefono: Mapped[str] = mapped_column(String(20))

    trabajadores: Mapped[list["Empleado"]] = relationship(back_populates="sucursal")
    platos: Mapped[list["Plato"]] = relationship(
        secondary="sucursal_plato", back_populates="sucursales"
    )

    horarios: Mapped[list["Horario"]] = relationship(
        secondary="sucursal_horario", back_populates="sucursales"
    )


class Sucursal_plato(Base):
    __tablename__ = "sucursal_plato"
    __table_args__ = (
        UniqueConstraint('id_sucursal', 'id_plato', name='uq_sucursal_plato'),
    )

    id_sucursal: Mapped[int] = mapped_column(ForeignKey("sucursal.id", ondelete="RESTRICT"))
    id_plato: Mapped[int] = mapped_column(ForeignKey("plato.id", ondelete="RESTRICT"))

class Sucursal_horario(Base):
    __tablename__ = "sucursal_horario"
    __table_args__ = (
        UniqueConstraint('id_sucursal', 'id_horario', name='uq_sucursal_horario'),
    )

    id_sucursal: Mapped[int] = mapped_column(ForeignKey("sucursal.id", ondelete="RESTRICT"))
    id_horario: Mapped[int] = mapped_column(ForeignKey("horario.id", ondelete="RESTRICT"))