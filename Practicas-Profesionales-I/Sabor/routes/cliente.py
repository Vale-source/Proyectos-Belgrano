from flask import render_template
from flask import Blueprint

cliente_bp = Blueprint('cliente', __name__)

@cliente_bp.route("/landing")
def mostrar_landing():
    return render_template("cliente/landing.html")

@cliente_bp.route("/sucursales-cliente")
def mostrar_sucursales_cliente():
    return render_template("cliente/sucursales.html")

@cliente_bp.route("/catalogo")
def mostrar_catalogo():
    return render_template("cliente/catalogo.html")