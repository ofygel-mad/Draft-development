from django.urls import path
from .views import DashboardSummaryView

urlpatterns = [
    path('reports/dashboard', DashboardSummaryView.as_view(), name='reports-dashboard'),
]
