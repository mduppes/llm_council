"""Usage statistics router for tracking API costs and token usage."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session_maker
from app.db.models import Message
from app.services.llm_service import llm_service

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("")
async def get_usage_stats(
    period: str = Query("day", description="Time period: 'day', 'week', 'month', 'all'"),
):
    """
    Get aggregated usage statistics for all models.
    
    Returns token counts and estimated costs per model for the specified period.
    """
    async with async_session_maker() as session:
        # Calculate the date filter based on period
        now = datetime.utcnow()
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(weeks=1)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:  # all
            start_date = None
        
        # Build query for aggregated stats per model using select()
        stmt = (
            select(
                Message.model_id,
                Message.model_name,
                func.sum(Message.tokens_input).label("total_input_tokens"),
                func.sum(Message.tokens_output).label("total_output_tokens"),
                func.count(Message.id).label("request_count"),
                func.sum(Message.latency_ms).label("total_latency_ms"),
            )
            .where(Message.role == "assistant")
            .where(Message.model_id.isnot(None))
        )
        
        if start_date:
            stmt = stmt.where(Message.created_at >= start_date)
        
        stmt = stmt.group_by(Message.model_id, Message.model_name)
        
        result = await session.execute(stmt)
        rows = result.fetchall()
        
        # Get cost info for each model
        model_stats = []
        total_cost = 0.0
        total_input_tokens = 0
        total_output_tokens = 0
        
        for row in rows:
            model_id = row.model_id
            model_name = row.model_name
            input_tokens = row.total_input_tokens or 0
            output_tokens = row.total_output_tokens or 0
            request_count = row.request_count or 0
            total_latency = row.total_latency_ms or 0
            
            # Get pricing info
            cost_info = llm_service.get_model_cost(model_id)
            input_cost_per_m = cost_info.get("input_cost_per_million") or 0
            output_cost_per_m = cost_info.get("output_cost_per_million") or 0
            
            # Calculate estimated cost
            input_cost = (input_tokens / 1_000_000) * input_cost_per_m
            output_cost = (output_tokens / 1_000_000) * output_cost_per_m
            estimated_cost = input_cost + output_cost
            
            total_cost += estimated_cost
            total_input_tokens += input_tokens
            total_output_tokens += output_tokens
            
            model_stats.append({
                "model_id": model_id,
                "model_name": model_name,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "request_count": request_count,
                "avg_latency_ms": total_latency // request_count if request_count > 0 else 0,
                "estimated_cost": round(estimated_cost, 6),
                "input_cost_per_million": input_cost_per_m,
                "output_cost_per_million": output_cost_per_m,
            })
        
        # Sort by total tokens descending
        model_stats.sort(key=lambda x: x["total_tokens"], reverse=True)
        
        return {
            "period": period,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": now.isoformat(),
            "summary": {
                "total_input_tokens": total_input_tokens,
                "total_output_tokens": total_output_tokens,
                "total_tokens": total_input_tokens + total_output_tokens,
                "total_estimated_cost": round(total_cost, 6),
                "model_count": len(model_stats),
            },
            "models": model_stats,
        }


@router.get("/daily")
async def get_daily_usage(days: int = Query(7, ge=1, le=90)):
    """
    Get daily usage breakdown for the last N days.
    
    Useful for charting usage trends over time.
    """
    async with async_session_maker() as session:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Query daily aggregates using select()
        stmt = (
            select(
                func.date(Message.created_at).label("date"),
                Message.model_id,
                func.sum(Message.tokens_input).label("input_tokens"),
                func.sum(Message.tokens_output).label("output_tokens"),
                func.count(Message.id).label("request_count"),
            )
            .where(Message.role == "assistant")
            .where(Message.model_id.isnot(None))
            .where(Message.created_at >= start_date)
            .group_by(func.date(Message.created_at), Message.model_id)
            .order_by(func.date(Message.created_at))
        )
        
        result = await session.execute(stmt)
        rows = result.fetchall()
        
        # Organize by date
        daily_data = {}
        for row in rows:
            date_str = str(row.date)
            if date_str not in daily_data:
                daily_data[date_str] = {
                    "date": date_str,
                    "total_tokens": 0,
                    "estimated_cost": 0.0,
                    "models": {},
                }
            
            input_tokens = row.input_tokens or 0
            output_tokens = row.output_tokens or 0
            
            # Get pricing
            cost_info = llm_service.get_model_cost(row.model_id)
            input_cost = (input_tokens / 1_000_000) * (cost_info.get("input_cost_per_million") or 0)
            output_cost = (output_tokens / 1_000_000) * (cost_info.get("output_cost_per_million") or 0)
            
            daily_data[date_str]["total_tokens"] += input_tokens + output_tokens
            daily_data[date_str]["estimated_cost"] += input_cost + output_cost
            daily_data[date_str]["models"][row.model_id] = {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "request_count": row.request_count,
            }
        
        # Round costs
        for day in daily_data.values():
            day["estimated_cost"] = round(day["estimated_cost"], 6)
        
        return {
            "days": days,
            "data": list(daily_data.values()),
        }
