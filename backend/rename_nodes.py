import asyncio
from sqlalchemy import update, select
from app.database import AsyncSessionLocal
from app.models.node import Node

async def rename_nodes():
    async with AsyncSessionLocal() as session:
        # 1. Rename old Judge Node
        await session.execute(
            update(Node)
            .where(Node.name == "00 - Judge View Node")
            .values(name="01 - Judge View Node (Sim)")
        )
        
        # 2. Rename physical Node 30
        await session.execute(
            update(Node)
            .where(Node.id == 30)
            .values(name="00 - AI Edge Test Node")
        )
        
        await session.commit()
        print("Database node names updated successfully!")

if __name__ == "__main__":
    asyncio.run(rename_nodes())
