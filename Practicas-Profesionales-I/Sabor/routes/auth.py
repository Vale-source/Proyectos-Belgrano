from flask import Blueprint, render_template, request, redirect, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models.models import Usuario
from utils.extensions import limiter, bitacora_accesos

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.get("/login")
def login_form():
    return render_template("login/login.html")

@auth_bp.post("/login")
@limiter.limit("5 per minute")
def login():
    alias = request.form.get("username")
    clave = request.form.get("password")

    with SessionLocal() as db_session:
        usuario = db_session.scalar(
            select(Usuario).where(Usuario.nick == alias, Usuario.activo == True)
        )
        if usuario and check_password_hash(usuario.pwd_hash, clave):
            session.clear()
            session["usuario"] = usuario.nick
            bitacora_accesos.info("login exitoso usuario=%s ip=%s", alias, request.remote_addr)
            return redirect(url_for("sucursales.index"))
        else:
            bitacora_accesos.warning("login erróneo usuario=%s ip=%s", alias, request.remote_addr)
            return render_template("login/login.html", error="Credenciales inválidas."), 401

@auth_bp.get("/signup")
def signup_form():
    return render_template("login/signup.html")

@auth_bp.post("/signup")
@limiter.limit("5 per hour")  # contra bot de registro
def signup():
    usuario = request.form.get("username")
    clave = request.form.get("password")

    if not usuario or not clave:
        return render_template("login/signup.html", error="Debes completar todos los campos."), 400

    hashed_password = generate_password_hash(clave)

    try:
        with SessionLocal() as db_session:
            nuevo_usuario = Usuario(nick=usuario, pwd_hash=hashed_password)
            db_session.add(nuevo_usuario)
            db_session.commit()

        bitacora_accesos.info("signup exitoso usuario=%s ip=%s", usuario, request.remote_addr)
        # Si ya había sesión iniciada, volvemos al dashboard
        if session.get("usuario"):
            return redirect(url_for("sucursales.index"))
        return redirect(url_for("auth.login_form"))
    
    except IntegrityError:
        bitacora_accesos.warning("signup erróneo usuario=%s ip=%s", usuario, request.remote_addr)
        return render_template("login/signup.html", error="Usuario ya existente."), 409
    
    except Exception as e:
        bitacora_accesos.warning("signup erróneo usuario=%s ip=%s error=%s", usuario, request.remote_addr, str(e))
        return render_template("login/signup.html", error="Error de sistema al registrar usuario."), 500

@auth_bp.route("/logout", methods=["GET", "POST"])
def cerrar_sesion():
    session.clear()
    return redirect(url_for("auth.login_form"))
