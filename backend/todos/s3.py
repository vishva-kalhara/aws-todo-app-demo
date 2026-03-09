import os
import uuid
import boto3
from botocore.config import Config


def get_presigned_upload_url(filename: str, content_type: str = "image/jpeg") -> dict:
    bucket = os.environ.get("AWS_STORAGE_BUCKET_NAME")
    region = os.environ.get("AWS_S3_REGION_NAME", "us-east-1")
    custom_domain = os.environ.get("AWS_S3_CUSTOM_DOMAIN")

    if not bucket:
        raise ValueError("AWS_STORAGE_BUCKET_NAME is not set")

    ext = "jpg"
    if "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        ext = "jpg"
    key = f"todos/{uuid.uuid4()}.{ext}"

    config = Config(signature_version="s3v4", region_name=region)
    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        config=config,
    )

    presigned = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=3600,
    )

    if custom_domain:
        object_url = f"https://{custom_domain.rstrip('/')}/{key}"
    else:
        object_url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"

    return {"upload_url": presigned, "object_url": object_url}
