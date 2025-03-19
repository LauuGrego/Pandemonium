import pyodbc
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configuración de la base de datos con autenticación de Windows
DATABASE_URL = "DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-5B1MMN8;DATABASE=Pandemonium;Trusted_Connection=yes;"

# Create the SQLAlchemy engine
engine = create_engine(f"mssql+pyodbc:///?odbc_connect={DATABASE_URL}")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependencia para obtener la conexión de la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
