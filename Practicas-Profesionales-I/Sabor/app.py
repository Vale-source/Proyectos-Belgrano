import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from flask import Flask, request, session, redirect, url_for, jsonify
from flask.logging import default_handler
from sqlalchemy import select

from database import SessionLocal
from models.models import Usuario
from routes import all_blueprints
from utils.extensions import bitacora_accesos, cors, csrf, limiter


def create_app():
    base_dir = Path(__file__).resolve().parent

    app = Flask(
        "servidor seguro",
        static_folder=base_dir / "static",
        template_folder=base_dir / "templates",
    )

    app.config.update(
        SECRET_KEY="6C5a+8##4Url?Js12_l",
        SESSION_COOKIE_HTTPONLY=True,  # contra ataque XSS
        SESSION_COOKIE_SAMESITE="Lax",  # contra ataque CSRF
        SESSION_COOKIE_SECURE=False,  # False = HTTP, True = HTTPS
    )

    @app.before_request
    def requerir_login():
        # Recursos estáticos
        if request.endpoint == "static":
            return None

        # Permito que los logins siempre esten disponibles
        if request.endpoint in ("auth.login_form", "auth.login"):
            return None

        # Registro un administrador: se permite si no hay ningún usuario creado (primer admin) o si ya estás logueado
        if request.endpoint in ("auth.signup_form", "auth.signup"):
            with SessionLocal() as db_session:
                hay_usuarios = db_session.scalar(select(Usuario.id).limit(1)) is not None
            if not hay_usuarios or session.get("usuario"):
                return None
            return redirect(url_for("auth.login_form"))

        # Cualquier otra ruta requiere iniciar sesion
        if not session.get("usuario"):
            if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({"error": "No autorizado"}), 401
            return redirect(url_for("auth.login_form"))

    @app.after_request
    def agregar_cabeceras_seguridad(response):
        response.headers["X-Frame-Options"] = "DENY"  # contra secuestro de clic
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        bitacora_accesos.info(
            "%s %s %s %s",
            request.remote_addr or "-",
            request.method,
            request.path,
            response.status_code,
        )
        return response

    csrf.init_app(app)  # contra ataque CSRF
    limiter.init_app(app)  # contra ataque fuerza bruta
    cors.init_app(app)  # soporte para peticiones de orígenes cruzados (CORS)

    logs_dir = base_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    controlador_archivo = RotatingFileHandler(
        logs_dir / "access.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    controlador_archivo.setFormatter(default_handler.formatter)
    controlador_archivo.setLevel(logging.INFO)
    bitacora_accesos.addHandler(controlador_archivo)
    bitacora_accesos.setLevel(logging.INFO)

    for bp in all_blueprints:
        app.register_blueprint(bp)

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", debug=True)
