from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

    def connect(self):
        self.client = AsyncIOMotorClient(settings.MONGO_URI)
        # Extract database name from URI or default to 'lucius-ai' if simple connection string
        # For simplicity, we can let Motor handle the default db if specified in URI, 
        # or explicitly pick one.
        # Here we'll just use the default get_default_database() if available, 
        # or parse it. Motor doesn't have get_default_database easily without io loop sometimes in older versions, 
        # but modern motor is fine.
        try:
            self.db = self.client.get_default_database()
        except Exception:
            # Fallback if no DB in URI
            self.db = self.client["lucius-ai"]
        print(f"Connected to MongoDB: {settings.MONGO_URI}")

    def close(self):
        if self.client:
            self.client.close()
            print("Disconnected from MongoDB")

db = Database()

async def get_database():
    return db.db
