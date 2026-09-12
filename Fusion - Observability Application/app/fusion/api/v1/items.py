import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import cache
from ...core.metrics import BUSINESS_OPS, ITEMS_STORED
from ...models import Item
from ...schemas import ItemCreate, ItemRead
from ..deps import current_user, db_session

router = APIRouter(prefix="/items", tags=["items"])


async def _sync_gauge(db: AsyncSession):
    total = (await db.execute(select(func.count()).select_from(Item))).scalar_one()
    ITEMS_STORED.set(total)


@router.get("", response_model=list[ItemRead])
async def list_items(limit: int = 50, db: AsyncSession = Depends(db_session),
                     _u: dict = Depends(current_user)):
    limit = max(1, min(limit, 200))
    rows = (await db.execute(
        select(Item).order_by(Item.id.desc()).limit(limit))).scalars().all()
    return list(rows)


@router.get("/{item_id}", response_model=ItemRead)
async def get_item(item_id: int, db: AsyncSession = Depends(db_session),
                   _u: dict = Depends(current_user)):
    cached = await cache.get_cached(f"item:{item_id}", name="items")
    if cached:
        return ItemRead(**json.loads(cached))
    row = (await db.execute(select(Item).where(Item.id == item_id))).scalar_one_or_none()
    if row is None:
        BUSINESS_OPS.labels(operation="get_item", status="not_found").inc()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")
    await cache.set_cached(f"item:{item_id}", json.dumps({
        "id": row.id, "name": row.name, "value": row.value,
        "created_at": row.created_at.isoformat()}), ttl=30)
    BUSINESS_OPS.labels(operation="get_item", status="success").inc()
    return row


@router.post("", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
async def create_item(body: ItemCreate, db: AsyncSession = Depends(db_session),
                      _u: dict = Depends(current_user)):
    row = Item(name=body.name, value=body.value)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await _sync_gauge(db)
    BUSINESS_OPS.labels(operation="create_item", status="success").inc()
    return row


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: int, db: AsyncSession = Depends(db_session),
                      _u: dict = Depends(current_user)):
    row = (await db.execute(select(Item).where(Item.id == item_id))).scalar_one_or_none()
    if row is None:
        BUSINESS_OPS.labels(operation="delete_item", status="not_found").inc()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")
    await db.delete(row)
    await db.commit()
    await cache.client().delete(f"item:{item_id}")
    await _sync_gauge(db)
    BUSINESS_OPS.labels(operation="delete_item", status="success").inc()
