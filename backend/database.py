import os
import psycopg

# Use DATABASE_URL environment variable if set, otherwise fallback to local DB for development
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "dbname=emergency_route_ai user=vamsikrishnasinguru"
)

def get_connection():
    return psycopg.connect(DATABASE_URL)

connection = get_connection()
