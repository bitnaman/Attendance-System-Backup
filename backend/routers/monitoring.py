"""
Advanced Monitoring and Analytics Router
Real-time metrics, performance tracking, and system health monitoring
"""
import asyncio
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import Student, Class, AttendanceSession, AttendanceRecord
from dependencies import get_db
from monitoring.analytics import (
    real_time_monitoring, 
    performance_analytics, 
    dashboard_analytics,
    predictive_analytics
)
from robustness.error_handling import system_monitoring
from scalability.load_balancer import cache_manager, load_balancer

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/monitoring",
    tags=["Monitoring & Analytics"],
)

@router.get("/health")
async def get_system_health():
    """Get comprehensive system health status"""
    try:
        # Collect system metrics
        metrics = await real_time_monitoring.collect_system_metrics()
        
        # Get system health summary
        health_summary = system_monitoring.get_system_health_summary()
        
        # Get performance analytics
        performance_summary = performance_analytics.get_performance_summary(hours=24)
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "system_health": health_summary,
            "performance": performance_summary,
            "metrics": {
                "cpu_percent": metrics[0].value if metrics else 0,
                "memory_percent": metrics[1].value if len(metrics) > 1 else 0,
                "disk_percent": metrics[3].value if len(metrics) > 3 else 0
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/dashboard")
async def get_dashboard_data(db: Session = Depends(get_db)):
    """Get comprehensive dashboard data"""
    try:
        dashboard_data = dashboard_analytics.generate_dashboard_data(db)
        return dashboard_data
    except Exception as e:
        logger.error(f"Dashboard data generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate dashboard data: {str(e)}")

@router.get("/metrics")
async def get_system_metrics():
    """Get current system metrics"""
    try:
        metrics = await real_time_monitoring.collect_system_metrics()
        return {
            "timestamp": datetime.now().isoformat(),
            "metrics": [
                {
                    "name": metric.metric_name,
                    "value": metric.value,
                    "timestamp": metric.timestamp
                }
                for metric in metrics
            ]
        }
    except Exception as e:
        logger.error(f"Failed to collect metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to collect system metrics")

@router.get("/performance")
async def get_performance_analytics(hours: int = 24):
    """Get performance analytics for specified time period"""
    try:
        # Get performance summary
        performance_summary = performance_analytics.get_performance_summary(hours=hours)
        
        # Get baseline metrics
        baseline_metrics = performance_analytics.calculate_baseline_metrics()
        
        # Detect anomalies
        anomalies = performance_analytics.detect_performance_anomalies()
        
        return {
            "time_period_hours": hours,
            "summary": performance_summary,
            "baseline_metrics": baseline_metrics,
            "anomalies": anomalies,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Performance analytics failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get performance analytics")

@router.get("/predictions")
async def get_load_predictions():
    """Get predictive analytics for system load"""
    try:
        # Get current metrics for prediction
        current_metrics = await real_time_monitoring.collect_system_metrics()
        
        if not current_metrics:
            return {"error": "No metrics available for prediction"}
        
        # Prepare metrics for prediction
        metrics_dict = {
            'cpu_percent': current_metrics[0].value if current_metrics else 0,
            'memory_percent': current_metrics[1].value if len(current_metrics) > 1 else 0,
            'disk_percent': current_metrics[3].value if len(current_metrics) > 3 else 0,
            'network_usage': 0,  # Placeholder
            'active_connections': 1,  # Placeholder
            'queue_size': 0  # Placeholder
        }
        
        # Get predictions
        predictions = predictive_analytics.predict_system_load(metrics_dict)
        
        # Get prediction accuracy
        accuracy = predictive_analytics.calculate_prediction_accuracy()
        
        return {
            "predictions": predictions,
            "accuracy": accuracy,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Load prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get load predictions")

@router.get("/alerts")
async def get_system_alerts():
    """Get current system alerts"""
    try:
        # Collect metrics
        metrics = await real_time_monitoring.collect_system_metrics()
        
        # Check for alerts
        alerts = await real_time_monitoring.check_alerts(metrics)
        
        return {
            "alerts": alerts,
            "alert_count": len(alerts),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Alert check failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to check system alerts")

@router.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """WebSocket endpoint for real-time metrics streaming"""
    await real_time_monitoring.add_websocket_connection(websocket)
    
    try:
        while True:
            # Collect and send metrics every 5 seconds
            metrics = await real_time_monitoring.collect_system_metrics()
            
            # Store metrics for historical analysis
            await real_time_monitoring.store_metrics(metrics)
            
            # Send to WebSocket clients
            for metric in metrics:
                await real_time_monitoring.broadcast_metric(metric)
            
            await asyncio.sleep(5)  # Send every 5 seconds
            
    except WebSocketDisconnect:
        await real_time_monitoring.remove_websocket_connection(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await real_time_monitoring.remove_websocket_connection(websocket)

@router.get("/attendance/analytics")
async def get_attendance_analytics(
    days: int = 30,
    class_id: int = None,
    db: Session = Depends(get_db)
):
    """Get advanced attendance analytics"""
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get attendance data
        query = db.query(AttendanceSession).filter(
            AttendanceSession.created_at >= start_date,
            AttendanceSession.created_at <= end_date
        )
        
        if class_id:
            query = query.filter(AttendanceSession.class_id == class_id)
        
        sessions = query.all()
        
        if not sessions:
            return {
                "message": "No attendance data found for the specified period",
                "period_days": days,
                "class_id": class_id
            }
        
        # Calculate analytics
        total_sessions = len(sessions)
        total_attendance = sum(session.total_present for session in sessions)
        avg_attendance_per_session = total_attendance / total_sessions if total_sessions > 0 else 0
        
        # Get class-wise breakdown
        class_breakdown = {}
        for session in sessions:
            class_name = f"{session.class_obj.name} {session.class_obj.section}"
            if class_name not in class_breakdown:
                class_breakdown[class_name] = {
                    "sessions": 0,
                    "total_attendance": 0
                }
            class_breakdown[class_name]["sessions"] += 1
            class_breakdown[class_name]["total_attendance"] += session.total_present
        
        # Calculate trends
        daily_attendance = {}
        for session in sessions:
            date_key = session.created_at.strftime('%Y-%m-%d')
            if date_key not in daily_attendance:
                daily_attendance[date_key] = 0
            daily_attendance[date_key] += session.total_present
        
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            },
            "summary": {
                "total_sessions": total_sessions,
                "total_attendance": total_attendance,
                "avg_attendance_per_session": round(avg_attendance_per_session, 2)
            },
            "class_breakdown": class_breakdown,
            "daily_trends": daily_attendance,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Attendance analytics failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate attendance analytics")

@router.get("/system/status")
async def get_detailed_system_status():
    """Get detailed system status with all components"""
    try:
        # Get system health
        health = system_monitoring.get_system_health_summary()
        
        # Get performance metrics
        performance = performance_analytics.get_performance_summary(hours=1)
        
        # Get cache statistics
        cache_stats = cache_manager.get_cache_stats()
        
        # Get load balancer status
        load_balancer_status = {
            "workers": len(load_balancer.workers),
            "total_capacity": sum(w['capacity'] for w in load_balancer.workers),
            "current_load": sum(w['current_load'] for w in load_balancer.workers)
        }
        
        return {
            "system_health": health,
            "performance": performance,
            "cache": cache_stats,
            "load_balancer": load_balancer_status,
            "timestamp": datetime.now().isoformat(),
            "status": "operational"
        }
        
    except Exception as e:
        logger.error(f"System status check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
