from flask import Blueprint, render_template, request, jsonify
from models.models import Sucursal
from models import models
from database import SessionLocal
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import time

sucursales_bp = Blueprint('sucursales', __name__)

@sucursales_bp.route("/", methods=["GET"])
def index():
    with SessionLocal() as session:
        sucursales = session.scalars(select(models.Sucursal)).all()
        puestos = session.scalars(select(models.Puesto)).all()
        return render_template("index.html", sucursales=sucursales, puestos=puestos)

@sucursales_bp.route("/<int:sucursal_id>", methods=["GET"])
def get_sucursal_by_id(sucursal_id):
    try:
        with SessionLocal() as session:
            # Busco la sucursal
            sucursal = session.get(Sucursal, sucursal_id)
            if not sucursal:
                return jsonify({"error": "Sucursal no encontrada"}), 404

            # Hago una lista con los trabajadores para poder renderizar la sucursal
            trabajadores = [
                {
                    "id": emp.id,
                    "nombre": emp.nombre,
                    "apellido": emp.apellido,
                    "numero_telefono": emp.num_telefono,
                    "id_puesto": emp.id_puesto,
                    "puesto": emp.puesto.nombre if emp.puesto else None,
                    "activo": emp.activo
                }
                for emp in sucursal.trabajadores
            ]

            # Hago lo mismo con los platos
            platos = [
                {
                    "id": plato.id,
                    "nombre": plato.nombre,
                    "precio": float(plato.precio) if plato.precio is not None else 0.0,
                    "descripcion": plato.descripcion,
                    "apto_celiaco": plato.apto_celiaco,
                    "activo": plato.activo
                }
                for plato in sucursal.platos
            ]
            
            # Obtengo los horarios de la sucursal y los ordeno de lunes a domingo
            orden_dias = list(models.DiaSemana)
            horarios_sorted = sorted(
                sucursal.horarios,
                key=lambda h: orden_dias.index(h.dia)
            )

            # Aca hago un sistema de etiquetas para agrupar los dias y hacer franjas horarias, por ejemplo de Lunes a Miercoles
            grupos = []
            for h in horarios_sorted:
                # Le doy un formato
                franja = f"{h.hora_apertura.strftime('%H:%M')} – {h.hora_cierre.strftime('%H:%M')}"
                # Comparo el horario del ultimo grupo con el del actual
                # Si tiene el mismo horario que el último grupo y es el día siguiente, lo extiendo 
                # (Ej: ¿Mi horario es Lunes de 12 a 15, y el dia siguiente tiene el mismo horario y es Martes? Se agrega)
                if grupos and grupos[-1]["franja"] == franja and orden_dias.index(h.dia) == grupos[-1]["idx_fin"] + 1:
                    grupos[-1]["dia_fin"] = h.dia.value
                    grupos[-1]["idx_fin"] = orden_dias.index(h.dia)
                else:
                    # si no, creo un grupo nuevo (así un día cerrado en el medio corta el rango)
                    grupos.append({
                        "dia_inicio": h.dia.value,
                        "dia_fin": h.dia.value,
                        "idx_fin": orden_dias.index(h.dia),
                        "franja": franja
                    })

            horarios = []
            for g in grupos:
                if g["dia_inicio"] == g["dia_fin"]:
                    # Si el grupo resulta ser un solo dia, se muestra sin "a", franja seria la franja horaria
                    horarios.append(f"{g['dia_inicio']} · {g['franja']}")
                else:
                    horarios.append(f"{g['dia_inicio']} a {g['dia_fin']} · {g['franja']}")

            return jsonify({
                "id": sucursal.id,
                "nombre": sucursal.nombre,
                "direccion": sucursal.direccion,
                "num_telefono": sucursal.num_telefono,
                "horarios": horarios,
                "trabajadores": trabajadores,
                "platos": platos
            }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@sucursales_bp.route("/post_sucursal", methods=["POST"])
def post_sucursal():
    try:
        # Con esta forma verifico si la informacion viene como un formData (es decir, un formulario), 
        # en caso de no ser asi, simplemente obtengo el json
        data = request.form if request.form else (request.get_json() or {})

        # Obtengo la informacion de los formularios
        h_apertura = time.fromisoformat(data["hora_apertura"])
        h_cierre = time.fromisoformat(data["hora_cierre"])

        dia_desde = models.DiaSemana(data["dia_desde"])
        dia_hasta = models.DiaSemana(data["dia_hasta"])

        orden_dias = list(models.DiaSemana)
        idx_desde = orden_dias.index(dia_desde)
        idx_hasta = orden_dias.index(dia_hasta)

        # Verifico que no se generen errores como "Desde Martes a Lunes"
        if idx_hasta < idx_desde:
            return jsonify({"error": "El día 'Hasta' debe ser igual o posterior al día 'Desde'"}), 400

        dias_rango = orden_dias[idx_desde:idx_hasta + 1]

        with SessionLocal() as session:
            horarios = []
            for dia in dias_rango:
                # Verifico que los horarios que se van a utilizar no existan
                # Asi no se me generan los mismos dias con los mismos horarios en la base de datos
                stmt = select(models.Horario).where(
                    models.Horario.dia == dia,
                    models.Horario.hora_apertura == h_apertura,
                    models.Horario.hora_cierre == h_cierre,
                )
                horario = session.scalar(stmt)

                # Caso contrario, se crea
                if not horario:
                    horario = models.Horario(
                        dia=dia,
                        hora_apertura=h_apertura,
                        hora_cierre=h_cierre
                    )

                horarios.append(horario)

            # Creo la nueva sucursal
            new_sucursal = models.Sucursal(
                nombre=data["nombre"],
                direccion=data["direccion"],
                num_telefono=data["telefono"],
                horarios=horarios,
                activo=True
            )

            session.add(new_sucursal)
            session.commit()
            
            return jsonify({
                "success": True,
                "message": "Sucursal creada",
                "sucursal": {
                    "id": new_sucursal.id,
                    "nombre": new_sucursal.nombre,
                    "direccion": new_sucursal.direccion,
                    "num_telefono": new_sucursal.num_telefono,
                    "activo": new_sucursal.activo
                }
            }), 201
    except IntegrityError:
        return jsonify({"error": "La sucursal ya existe"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@sucursales_bp.route("/<int:sucursal_id>/toggle_activo", methods=["PUT"])
# Toggle para cambiar una sucursal de activo a inactivo
def toggle_activo_sucursal(sucursal_id):
    try:
        with SessionLocal() as session:
            sucursal = session.get(Sucursal, sucursal_id)
            if not sucursal:
                return jsonify({"error": "Sucursal no encontrada"}), 404

            data = request.form if request.form else (request.get_json() or {})
            # Considero cualquier forma de un valor true
            sucursal.activo = data.get("activo") in ("true", "1", "on", True)

            session.commit()
            return jsonify({"success": True, "activo": sucursal.activo}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
