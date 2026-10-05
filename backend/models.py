from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    logo_url = Column(String, nullable=True)

    users = relationship("User", back_populates="club")
    matches = relationship("Match", back_populates="club")
    players = relationship("Player", back_populates="club") # NUEVA RELACIÓN

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    role = Column(String, default="jugador") 
    
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=True)
    club = relationship("Club", back_populates="users")

class Match(Base):
    __tablename__ = "matches"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    date = Column(String)
    field = Column(String)
    filename = Column(String)
    resumen = Column(JSON)

    club_id = Column(Integer, ForeignKey("clubs.id"))
    club = relationship("Club", back_populates="matches")

# --- NUEVA TABLA: JUGADORES ---
class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    dorsal = Column(String) # Lo dejamos como String por si hay dorsales como "10A"
    name = Column(String)
    photo_url = Column(String, nullable=True) # Aquí irá la URL de la cara del jugador
    position = Column(String, nullable=True) # Ej: "Defensa", "Medio"
    
    club_id = Column(Integer, ForeignKey("clubs.id"))
    club = relationship("Club", back_populates="players")