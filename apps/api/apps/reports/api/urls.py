from django.urls import path
from .views import DashboardSummaryView, ReportExportView, ExportCustomersExcelView, ExportDealsExcelView

urlpatterns = [
    path('reports/dashboard',         DashboardSummaryView.as_view(),     name='reports-dashboard'),
    path('reports/summary/',          DashboardSummaryView.as_view(),     name='reports-summary'),
    path('reports/export/',           ReportExportView.as_view(),         name='report-export'),
    path('reports/export/customers/', ExportCustomersExcelView.as_view(), name='export-customers-excel'),
    path('reports/export/deals/',     ExportDealsExcelView.as_view(),     name='export-deals-excel'),
]
