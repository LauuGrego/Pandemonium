from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
import datetime

Base = declarative_base()

class Archivo(Base):
    __tablename__ = 'archivos'  # Ensure this matches the table name in the database

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    ruta = Column(String, nullable=False)
    tipo = Column(String, nullable=False)
    fecha_de_subida = Column(DateTime, default=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<Archivo(id={self.id}, nombre={self.nombre}, ruta={self.ruta}, tipo={self.tipo}, fecha_de_subida={self.fecha_de_subida})>"

class ArchivoModel(BaseModel):
    id: int
    nombre: str
    ruta: str
    tipo: str
    fecha_de_subida: datetime.datetime

    class Config:
        from_attributes = True
