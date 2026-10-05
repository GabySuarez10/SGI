from flask import Blueprint, jsonify, request
from database import db
from models import Traslado

traslados_bp = Blueprint("traslados", __name__, url_prefix="/api/traslados")


@traslados_bp.route("", methods=["GET"])
def get_traslados():
    traslados = Traslado.query.all()
    return jsonify([t.to_dict() for t in traslados]), 200


@traslados_bp.route("/<int:codigo>", methods=["GET"])
def get_traslado(codigo):
    traslado = Traslado.query.get_or_404(codigo, description="Traslado no encontrado")
    return jsonify(traslado.to_dict()), 200


@traslados_bp.route("", methods=["POST"])
def create_traslado():
    data = request.get_json() or {}

    nuevo_traslado = Traslado(
        producto=data.get("producto"),
        cantidad=data.get("cantidad")
    )

    db.session.add(nuevo_traslado)
    db.session.commit()
    db.session.refresh(nuevo_traslado)
    return jsonify(nuevo_traslado.to_dict()), 201


@traslados_bp.route("/<int:codigo>", methods=["PUT"])
def update_traslado(codigo):
    traslado = Traslado.query.get_or_404(codigo, description="Traslado no encontrado")
    data = request.get_json() or {}

    if "producto" in data:
        traslado.producto = data["producto"]
    if "cantidad" in data:
        traslado.cantidad = data["cantidad"]

    db.session.commit()
    db.session.refresh(traslado)
    return jsonify(traslado.to_dict()), 200


@traslados_bp.route("/<int:codigo>", methods=["DELETE"])
def delete_traslado(codigo):
    traslado = Traslado.query.get_or_404(codigo, description="Traslado no encontrado")
    db.session.delete(traslado)
    db.session.commit()
    return jsonify({"message": f"Traslado con código {codigo} eliminado exitosamente"}), 200
