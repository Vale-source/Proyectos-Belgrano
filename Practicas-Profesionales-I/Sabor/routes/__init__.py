from routes.auth import auth_bp
from routes.sucursales import sucursales_bp
from routes.empleados import empleados_bp
from routes.platos import platos_bp
# Cargo todas las blueprints cuando inicio la aplicacion
all_blueprints = [sucursales_bp, empleados_bp, platos_bp, auth_bp]
