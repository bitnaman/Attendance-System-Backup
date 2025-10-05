"""
Advanced Monitoring and Analytics System
Real-time metrics, performance tracking, and predictive analytics
"""
import asyncio
import logging
import time
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import numpy as np
import pandas as pd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import redis
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import psutil

logger = logging.getLogger(__name__)

@dataclass
class SystemMetric:
    timestamp: float
    metric_name: str
    value: float
    tags: Dict[str, str] = None

class RealTimeMonitoring:
    """Real-time system monitoring with WebSocket support"""
    
    def __init__(self):
        self.websocket_connections: List[WebSocket] = []
        self.metrics_buffer = []
        self.alert_rules = {}
        self.redis_client = None
        
    async def initialize_redis(self):
        """Initialize Redis for metrics storage"""
        try:
            self.redis_client = redis.Redis(host='localhost', port=6379, db=2)
            await self.redis_client.ping()
            logger.info("✅ Redis monitoring initialized")
        except Exception as e:
            logger.warning(f"Redis monitoring not available: {e}")
    
    async def add_websocket_connection(self, websocket: WebSocket):
        """Add WebSocket connection for real-time updates"""
        await websocket.accept()
        self.websocket_connections.append(websocket)
        logger.info(f"WebSocket connection added. Total: {len(self.websocket_connections)}")
    
    async def remove_websocket_connection(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.websocket_connections:
            self.websocket_connections.remove(websocket)
        logger.info(f"WebSocket connection removed. Total: {len(self.websocket_connections)}")
    
    async def broadcast_metric(self, metric: SystemMetric):
        """Broadcast metric to all connected WebSocket clients"""
        if not self.websocket_connections:
            return
        
        message = {
            'type': 'metric',
            'data': asdict(metric)
        }
        
        # Send to all connected clients
        disconnected = []
        for websocket in self.websocket_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except WebSocketDisconnect:
                disconnected.append(websocket)
        
        # Remove disconnected clients
        for ws in disconnected:
            await self.remove_websocket_connection(ws)
    
    async def collect_system_metrics(self) -> List[SystemMetric]:
        """Collect comprehensive system metrics"""
        metrics = []
        timestamp = time.time()
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        metrics.append(SystemMetric(timestamp, 'cpu_percent', cpu_percent))
        
        # Memory metrics
        memory = psutil.virtual_memory()
        metrics.append(SystemMetric(timestamp, 'memory_percent', memory.percent))
        metrics.append(SystemMetric(timestamp, 'memory_available_gb', memory.available / (1024**3)))
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        metrics.append(SystemMetric(timestamp, 'disk_percent', disk.percent))
        metrics.append(SystemMetric(timestamp, 'disk_free_gb', disk.free / (1024**3)))
        
        # Network metrics
        network = psutil.net_io_counters()
        metrics.append(SystemMetric(timestamp, 'network_bytes_sent', network.bytes_sent))
        metrics.append(SystemMetric(timestamp, 'network_bytes_recv', network.bytes_recv))
        
        # Process metrics
        process = psutil.Process()
        metrics.append(SystemMetric(timestamp, 'process_memory_mb', process.memory_info().rss / (1024**2)))
        metrics.append(SystemMetric(timestamp, 'process_cpu_percent', process.cpu_percent()))
        
        return metrics
    
    async def store_metrics(self, metrics: List[SystemMetric]):
        """Store metrics in Redis for historical analysis"""
        if not self.redis_client:
            return
        
        for metric in metrics:
            key = f"metrics:{metric.metric_name}:{int(metric.timestamp)}"
            await self.redis_client.setex(key, 86400, json.dumps(asdict(metric)))  # 24 hours TTL
    
    async def check_alerts(self, metrics: List[SystemMetric]) -> List[Dict[str, Any]]:
        """Check metrics against alert rules"""
        alerts = []
        
        for metric in metrics:
            if metric.metric_name in self.alert_rules:
                rule = self.alert_rules[metric.metric_name]
                if metric.value > rule.get('threshold', 0):
                    alert = {
                        'timestamp': metric.timestamp,
                        'metric': metric.metric_name,
                        'value': metric.value,
                        'threshold': rule['threshold'],
                        'severity': rule.get('severity', 'warning'),
                        'message': rule.get('message', f'{metric.metric_name} exceeded threshold')
                    }
                    alerts.append(alert)
        
        return alerts

class PerformanceAnalytics:
    """Advanced performance analytics and insights"""
    
    def __init__(self):
        self.performance_data = []
        self.baseline_metrics = {}
        self.anomaly_detector = None
        
    def add_performance_data(self, operation: str, duration: float, 
                           success: bool, metadata: Dict[str, Any] = None):
        """Add performance data point"""
        data_point = {
            'timestamp': time.time(),
            'operation': operation,
            'duration': duration,
            'success': success,
            'metadata': metadata or {}
        }
        self.performance_data.append(data_point)
        
        # Keep only last 10000 data points
        if len(self.performance_data) > 10000:
            self.performance_data = self.performance_data[-10000:]
    
    def calculate_baseline_metrics(self) -> Dict[str, Any]:
        """Calculate baseline performance metrics"""
        if not self.performance_data:
            return {}
        
        df = pd.DataFrame(self.performance_data)
        
        baselines = {}
        for operation in df['operation'].unique():
            op_data = df[df['operation'] == operation]
            baselines[operation] = {
                'avg_duration': op_data['duration'].mean(),
                'p95_duration': op_data['duration'].quantile(0.95),
                'p99_duration': op_data['duration'].quantile(0.99),
                'success_rate': op_data['success'].mean(),
                'total_operations': len(op_data)
            }
        
        self.baseline_metrics = baselines
        return baselines
    
    def detect_performance_anomalies(self) -> List[Dict[str, Any]]:
        """Detect performance anomalies using statistical methods"""
        if not self.performance_data:
            return []
        
        anomalies = []
        df = pd.DataFrame(self.performance_data)
        
        for operation in df['operation'].unique():
            op_data = df[df['operation'] == operation]
            if len(op_data) < 10:  # Need minimum data points
                continue
            
            # Calculate z-scores for duration
            durations = op_data['duration'].values
            mean_duration = np.mean(durations)
            std_duration = np.std(durations)
            
            if std_duration > 0:
                z_scores = np.abs((durations - mean_duration) / std_duration)
                anomaly_indices = np.where(z_scores > 2.5)[0]  # 2.5 sigma threshold
                
                for idx in anomaly_indices:
                    anomaly = {
                        'timestamp': op_data.iloc[idx]['timestamp'],
                        'operation': operation,
                        'duration': durations[idx],
                        'z_score': z_scores[idx],
                        'severity': 'high' if z_scores[idx] > 3 else 'medium'
                    }
                    anomalies.append(anomaly)
        
        return anomalies
    
    def get_performance_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance summary for specified time period"""
        cutoff_time = time.time() - (hours * 3600)
        recent_data = [d for d in self.performance_data if d['timestamp'] > cutoff_time]
        
        if not recent_data:
            return {'status': 'no_data'}
        
        df = pd.DataFrame(recent_data)
        
        summary = {
            'time_period_hours': hours,
            'total_operations': len(df),
            'success_rate': df['success'].mean(),
            'avg_duration': df['duration'].mean(),
            'operations_by_type': df['operation'].value_counts().to_dict(),
            'performance_trends': self._calculate_trends(df)
        }
        
        return summary
    
    def _calculate_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate performance trends over time"""
        if len(df) < 2:
            return {}
        
        # Group by hour and calculate metrics
        df['hour'] = pd.to_datetime(df['timestamp'], unit='s').dt.floor('H')
        hourly_metrics = df.groupby('hour').agg({
            'duration': 'mean',
            'success': 'mean'
        }).reset_index()
        
        if len(hourly_metrics) < 2:
            return {}
        
        # Calculate trends
        duration_trend = np.polyfit(range(len(hourly_metrics)), hourly_metrics['duration'], 1)[0]
        success_trend = np.polyfit(range(len(hourly_metrics)), hourly_metrics['success'], 1)[0]
        
        return {
            'duration_trend': duration_trend,
            'success_rate_trend': success_trend,
            'trend_direction': 'improving' if duration_trend < 0 and success_trend > 0 else 'degrading'
        }

class PredictiveAnalytics:
    """Predictive analytics for system optimization"""
    
    def __init__(self):
        self.models = {}
        self.feature_scaler = StandardScaler()
        self.prediction_history = []
        
    def prepare_training_data(self, metrics_data: List[Dict[str, Any]]) -> np.ndarray:
        """Prepare training data for predictive models"""
        if not metrics_data:
            return np.array([])
        
        # Extract features
        features = []
        for data in metrics_data:
            feature_vector = [
                data.get('cpu_percent', 0),
                data.get('memory_percent', 0),
                data.get('disk_percent', 0),
                data.get('network_usage', 0),
                data.get('active_connections', 0),
                data.get('queue_size', 0)
            ]
            features.append(feature_vector)
        
        return np.array(features)
    
    def train_load_prediction_model(self, historical_data: List[Dict[str, Any]]):
        """Train model to predict system load"""
        if len(historical_data) < 100:
            logger.warning("Insufficient data for training load prediction model")
            return
        
        # Prepare features and targets
        X = self.prepare_training_data(historical_data[:-1])  # Features (previous data)
        y = [d.get('cpu_percent', 0) for d in historical_data[1:]]  # Target (next CPU)
        
        if len(X) == 0 or len(y) == 0:
            return
        
        # Train model
        model = LinearRegression()
        X_scaled = self.feature_scaler.fit_transform(X)
        model.fit(X_scaled, y)
        
        self.models['load_prediction'] = model
        logger.info("Load prediction model trained successfully")
    
    def predict_system_load(self, current_metrics: Dict[str, Any]) -> Dict[str, float]:
        """Predict future system load"""
        if 'load_prediction' not in self.models:
            return {'error': 'Model not trained'}
        
        # Prepare current features
        features = np.array([[
            current_metrics.get('cpu_percent', 0),
            current_metrics.get('memory_percent', 0),
            current_metrics.get('disk_percent', 0),
            current_metrics.get('network_usage', 0),
            current_metrics.get('active_connections', 0),
            current_metrics.get('queue_size', 0)
        ]])
        
        # Scale features
        features_scaled = self.feature_scaler.transform(features)
        
        # Make prediction
        predicted_cpu = self.models['load_prediction'].predict(features_scaled)[0]
        
        # Store prediction for accuracy tracking
        prediction = {
            'timestamp': time.time(),
            'predicted_cpu': predicted_cpu,
            'actual_cpu': current_metrics.get('cpu_percent', 0)
        }
        self.prediction_history.append(prediction)
        
        return {
            'predicted_cpu_percent': predicted_cpu,
            'confidence': 0.8,  # Placeholder - would calculate from model performance
            'recommendation': self._get_scaling_recommendation(predicted_cpu)
        }
    
    def _get_scaling_recommendation(self, predicted_cpu: float) -> str:
        """Get scaling recommendation based on predicted load"""
        if predicted_cpu > 80:
            return "Scale up immediately - high load predicted"
        elif predicted_cpu > 60:
            return "Monitor closely - moderate load predicted"
        else:
            return "System load looks stable"
    
    def calculate_prediction_accuracy(self) -> Dict[str, float]:
        """Calculate accuracy of predictions"""
        if len(self.prediction_history) < 2:
            return {'accuracy': 0, 'mae': 0, 'rmse': 0}
        
        actual_values = [p['actual_cpu'] for p in self.prediction_history]
        predicted_values = [p['predicted_cpu'] for p in self.prediction_history]
        
        # Calculate metrics
        mae = np.mean(np.abs(np.array(actual_values) - np.array(predicted_values)))
        rmse = np.sqrt(np.mean((np.array(actual_values) - np.array(predicted_values)) ** 2))
        accuracy = max(0, 1 - (mae / 100))  # Normalize by max possible error
        
        return {
            'accuracy': accuracy,
            'mae': mae,
            'rmse': rmse,
            'total_predictions': len(self.prediction_history)
        }

class DashboardAnalytics:
    """Analytics for dashboard visualization"""
    
    def __init__(self):
        self.dashboard_data = {}
        
    def generate_dashboard_data(self, db: Session) -> Dict[str, Any]:
        """Generate comprehensive dashboard data"""
        try:
            # Get attendance statistics
            from database import Student, AttendanceSession, AttendanceRecord
            
            total_students = db.query(Student).filter(Student.is_active == True).count()
            total_sessions = db.query(AttendanceSession).count()
            total_records = db.query(AttendanceRecord).count()
            present_records = db.query(AttendanceRecord).filter(AttendanceRecord.is_present == True).count()
            
            # Calculate attendance rate
            attendance_rate = (present_records / max(1, total_records)) * 100 if total_records > 0 else 0
            
            # Get recent activity (last 7 days)
            from datetime import datetime, timedelta
            week_ago = datetime.now() - timedelta(days=7)
            recent_sessions = db.query(AttendanceSession).filter(
                AttendanceSession.created_at >= week_ago
            ).count()
            
            # Get class-wise statistics
            class_stats = []
            classes = db.query(Class).filter(Class.is_active == True).all()
            for class_obj in classes:
                class_students = db.query(Student).filter(
                    Student.class_id == class_obj.id,
                    Student.is_active == True
                ).count()
                
                class_sessions = db.query(AttendanceSession).filter(
                    AttendanceSession.class_id == class_obj.id
                ).count()
                
                class_stats.append({
                    'class_name': f"{class_obj.name} {class_obj.section}",
                    'student_count': class_students,
                    'session_count': class_sessions
                })
            
            dashboard_data = {
                'overview': {
                    'total_students': total_students,
                    'total_sessions': total_sessions,
                    'attendance_rate': round(attendance_rate, 1),
                    'recent_sessions': recent_sessions
                },
                'class_statistics': class_stats,
                'performance_metrics': {
                    'system_uptime': self._calculate_uptime(),
                    'avg_response_time': self._calculate_avg_response_time(),
                    'error_rate': self._calculate_error_rate()
                },
                'trends': {
                    'daily_attendance': self._get_daily_attendance_trend(db),
                    'system_load': self._get_system_load_trend()
                }
            }
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Dashboard data generation failed: {e}")
            return {'error': str(e)}
    
    def _calculate_uptime(self) -> float:
        """Calculate system uptime percentage"""
        # This would be implemented with actual uptime tracking
        return 99.9
    
    def _calculate_avg_response_time(self) -> float:
        """Calculate average response time"""
        # This would be implemented with actual response time tracking
        return 0.5
    
    def _calculate_error_rate(self) -> float:
        """Calculate error rate percentage"""
        # This would be implemented with actual error tracking
        return 0.1
    
    def _get_daily_attendance_trend(self, db: Session) -> List[Dict[str, Any]]:
        """Get daily attendance trend data"""
        # This would query actual attendance data
        return []
    
    def _get_system_load_trend(self) -> List[Dict[str, Any]]:
        """Get system load trend data"""
        # This would query actual system metrics
        return []

# Global instances
real_time_monitoring = RealTimeMonitoring()
performance_analytics = PerformanceAnalytics()
predictive_analytics = PredictiveAnalytics()
dashboard_analytics = DashboardAnalytics()
