from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel

Base = declarative_base()

class Usuario(Base):
    __tablename__ = 'usuarios'  # Ensure this matches the table name in the database

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    contrasena = Column(String, nullable=False)

    def __repr__(self):
        return f"<Usuario(id={self.id}, nombre={self.nombre}, contrasena={self.contrasena})>"

class UsuarioModel(BaseModel):
    nombre: str
    contrasena: str

    class Config:
        from_attributes = True
