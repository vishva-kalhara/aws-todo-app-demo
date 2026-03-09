from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from .models import Todo
from .serializers import TodoSerializer
from .s3 import get_presigned_upload_url


class TodoViewSet(viewsets.ModelViewSet):
    queryset = Todo.objects.all()
    serializer_class = TodoSerializer

    @action(detail=False, methods=["post"], url_path="upload-url")
    def upload_url(self, request):
        filename = request.data.get("filename")
        if not filename or not isinstance(filename, str):
            return Response(
                {"detail": "filename is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        content_type = request.data.get("content_type", "image/jpeg")
        try:
            result = get_presigned_upload_url(filename=filename.strip(), content_type=content_type)
            return Response(result)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response(
                {"detail": "Failed to generate upload URL"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
