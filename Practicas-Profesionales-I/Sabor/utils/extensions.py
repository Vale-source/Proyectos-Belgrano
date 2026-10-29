from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf import CSRFProtect
import logging

csrf = CSRFProtect()
limiter = Limiter(get_remote_address, storage_uri="memory://")
bitacora_accesos = logging.getLogger("access_logger")