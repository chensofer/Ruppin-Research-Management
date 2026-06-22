DB_CONFIG = {
    "server": "media.ruppin.ac.il",
    "database": "bgroup11_test2",
    "username": "bgroup11",
    "password": "bgroup11_79466",
    "driver": "{ODBC Driver 17 for SQL Server}",
}


def get_connection_string() -> str:
    return (
        f"DRIVER={DB_CONFIG['driver']};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        f"Encrypt=yes;TrustServerCertificate=yes;"
    )
