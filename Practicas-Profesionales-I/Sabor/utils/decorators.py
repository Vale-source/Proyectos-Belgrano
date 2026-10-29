from functools import wraps
from flask import session, redirect, url_for
from sqlalchemy import select
from database import SessionLocal
from models.models import Usuario

def login_required(funcion):
    @wraps(funcion)
    def envuelta(*args, **kwargs):
        nick = session.get("usuario")
        if not nick:
            return redirect(url_for("auth.login_form"))
        
        with SessionLocal() as db_session:
            usuario = db_session.scalar(
                select(Usuario).where(Usuario.nick == nick, Usuario.activo == True)
            )
            if not usuario:
                session.clear()
                return redirect(url_for("auth.login_form"))
        
        return funcion(*args, **kwargs)
    return envuelta
