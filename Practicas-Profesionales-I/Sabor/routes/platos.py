from sqlalchemy import select
from flask import Blueprint, request, jsonify
from models.models import Sucursal
from models import models
from database import SessionLocal
from sqlalchemy.exc import IntegrityError

platos_bp = Blueprint('platos', __name__)

@platos_bp.route("/<int:sucursal_id>/post_plato", methods=["POST"])
def post_plato(sucursal_id):
    try:
        # Con esta forma verifico si la informacion viene como un formData (es decir, un formulario), 
        # en caso de no ser asi, simplemente obtengo el json
        data = request.form if request.form else (request.get_json() or {})

        param_nombre = data["nombre_plato"]
        param_precio = float(data["precio"])
        param_descripcion = data["descripcion"]
        # Para evitar bugs en Python con los booleanos, planteo cada posibilidad de true
        param_apto_celiaco = data.get("celiaco") in ("true", "1", "on", True)

        with SessionLocal() as session:
            sucursal = session.get(Sucursal, sucursal_id)
            if not sucursal:
                return jsonify({"error": "Sucursal no encontrada"}), 404

            stmt = select(models.Plato).where(models.Plato.nombre == param_nombre)
            plato = session.scalar(stmt)

            if plato:
                if sucursal in plato.sucursales:
                    return jsonify({"error": "Este plato ya está registrado en esta sucursal"}), 409

                plato.sucursales.append(sucursal)
                session.commit()

                return jsonify({
                    "success": True,
                    "message": "Plato agregado a la carta de esta sucursal",
                    "plato": {
                        "id": plato.id,
                        "nombre": plato.nombre,
                        "precio": float(plato.precio),
                        "descripcion": plato.descripcion,
                        "apto_celiaco": plato.apto_celiaco,
                        "activo": plato.activo
                    }
                }), 201

            nuevo_plato = models.Plato(
                nombre=param_nombre,
                precio=param_precio,
                descripcion=param_descripcion,
                apto_celiaco=param_apto_celiaco,
                sucursales=[sucursal]
            )
            session.add(nuevo_plato)
            session.commit()

            return jsonify({
                "success": True,
                "message": "Plato creado y agregado a la sucursal",
                "plato": {
                    "id": nuevo_plato.id,
                    "nombre": nuevo_plato.nombre,
                    "precio": float(nuevo_plato.precio),
                    "descripcion": nuevo_plato.descripcion,
                    "apto_celiaco": nuevo_plato.apto_celiaco,
                    "activo": nuevo_plato.activo
                }
            }), 201
    except IntegrityError:
        return jsonify({"error": "El plato ya existe"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@platos_bp.route("/<int:sucursal_id>/<int:plato_id>/edit_plato", methods=["GET", "PUT"])
def edit_plato(sucursal_id, plato_id):
    try:
        with SessionLocal() as session:
            stmt = select(models.Plato).where(
                models.Plato.id == plato_id,
                models.Plato.sucursales.any(models.Sucursal.id == sucursal_id)
            )
            plato = session.scalar(stmt)

            if not plato:
                return jsonify({"error": "Plato no encontrado en esta sucursal"}), 404

            # En caso de que el metodo sea GET, obtengo la informacion y la devuelvo
            if request.method == "GET":
                return jsonify({
                    "id": plato.id,
                    "nombre": plato.nombre,
                    "precio": float(plato.precio) if plato.precio is not None else 0.0,
                    "descripcion": plato.descripcion,
                    "apto_celiaco": plato.apto_celiaco,
                    "activo": plato.activo
                }), 200

            data = request.form if request.form else (request.get_json() or {})

            # En caso de que el metodo sea PUT, sigue la ejecucion del codigo para editar la informacion
            if "nombre_plato" in data:
                plato.nombre = data["nombre_plato"]

            if "precio" in data:
                plato.precio = float(data["precio"])

            if "descripcion" in data:
                plato.descripcion = data["descripcion"]

            if "celiaco" in data:
                plato.apto_celiaco = data["celiaco"] in ("true", "1", "on", True)

            if "activo" in data:
                plato.activo = data["activo"] in ("true", "1", "on", True)

            session.commit()
            return jsonify({"success": True, "message": "Plato actualizado correctamente"}), 200

    except IntegrityError:
        return jsonify({"error": "Ya existe otro plato con ese nombre"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 400
