from django.urls import path, include

from . import views

urlpatterns = [
    path('health', views.health),
    path('todos/', include('todos.urls')),
    path('todos', include('todos.urls')),
]
