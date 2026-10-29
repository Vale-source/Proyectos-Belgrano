from flask import Blueprint, request, jsonify
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from models.models import Sucursal
from models import models
from database import SessionLocal

empleados_bp = Blueprint('empleados', __name__)

@empleados_bp.route("/<int:sucursal_id>/post_empleado", methods=["POST"])
def post_empleado(sucursal_id):
    try:
        # Con esta forma verifico si la informacion viene como un formData (es decir, un formulario), 
        # en caso de no ser asi, simplemente obtengo el json
        data = request.form if request.form else (request.get_json() or {})

        param_nombre = data["nombre"]
        param_apellido = data["apellido"]
        param_num_telefono = data["numero_telefono"]
        param_puesto_id = int(data["puesto"])

        with SessionLocal() as session:
            sucursal = session.get(Sucursal, sucursal_id)
            if not sucursal:
                return jsonify({"error": "Sucursal no encontrada"}), 404

            nuevo = models.Empleado(
                nombre=param_nombre,
                apellido=param_apellido,
                num_telefono=param_num_telefono,
                id_puesto=param_puesto_id,
                id_sucursal=sucursal.id,
                activo=True
            )
            session.add(nuevo)
            session.commit()

            return jsonify({
                "success": True,
                "message": "Empleado creado",
                "empleado": {
                    "id": nuevo.id,
                    "nombre": nuevo.nombre,
                    "apellido": nuevo.apellido,
                    "numero_telefono": nuevo.num_telefono,
                    "id_puesto": nuevo.id_puesto,
                    "puesto": nuevo.puesto.nombre if nuevo.puesto else None,
                    "activo": nuevo.activo
                }
            }), 201
    except IntegrityError:
        return jsonify({"error": "El empleado ya existe"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@empleados_bp.route("/<int:sucursal_id>/<int:empleado_id>/edit_empleado", methods=["GET", "PUT"])
def edit_empleado(sucursal_id, empleado_id):
    try:
        with SessionLocal() as session:
            stmt = select(models.Empleado).where(
                models.Empleado.id == empleado_id,
                models.Empleado.id_sucursal == sucursal_id
            )
            empleado = session.scalar(stmt)

            if not empleado:
                return jsonify({"error": "Empleado no encontrado"}), 404

            # En caso de que el metodo sea GET, obtengo la informacion y la devuelvo
            if request.method == "GET":
                return jsonify({
                    "id": empleado.id,
                    "nombre": empleado.nombre,
                    "apellido": empleado.apellido,
                    "numero_telefono": empleado.num_telefono,
                    "puesto": empleado.id_puesto,
                    "activo": empleado.activo
                }), 200

            data = request.form if request.form else (request.get_json() or {})

            # En caso de que el metodo sea PUT, sigue la ejecucion del codigo para editar la informacion
            if "nombre" in data:
                empleado.nombre = data["nombre"]
            if "apellido" in data:
                empleado.apellido = data["apellido"]
            if "numero_telefono" in data:
                empleado.num_telefono = data["numero_telefono"]
            if "puesto" in data:
                empleado.id_puesto = int(data["puesto"])
            if "activo" in data:
                empleado.activo = data["activo"] in ("true", "1", "on", True)

            session.commit()
            return jsonify({"success": True, "message": "Empleado actualizado correctamente"}), 200

    except IntegrityError:
        return jsonify({"error": "Ya existe otro empleado con ese nombre y apellido en esta sucursal"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 400
