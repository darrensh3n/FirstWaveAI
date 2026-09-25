import os
import urllib.parse
from datetime import datetime, timezone

import boto3

dynamodb = boto3.resource("dynamodb", endpoint_url=os.environ.get("DYNAMODB_ENDPOINT_URL"))
s3 = boto3.client("s3", endpoint_url=os.environ.get("S3_ENDPOINT_URL"))

TABLE_NAME = os.environ.get("TABLE_NAME", "uploads-metadata")


def handler(event, context):
    table = dynamodb.Table(TABLE_NAME)

    for record in event.get("Records", []):
        s3_info = record["s3"]
        bucket = s3_info["bucket"]["name"]
        key = urllib.parse.unquote_plus(s3_info["object"]["key"])
        size_bytes = s3_info["object"].get("size")
        uploaded_at = record.get("eventTime", datetime.now(timezone.utc).isoformat())

        item = {
            "id": key,
            "filename": key,
            "size_bytes": size_bytes,
            "uploaded_at": uploaded_at,
        }

        try:
            head = s3.head_object(Bucket=bucket, Key=key)
            content_type = head.get("ContentType")
            if content_type:
                item["content_type"] = content_type
            if size_bytes is None:
                item["size_bytes"] = head.get("ContentLength")
        except Exception:
            pass

        item = {k: v for k, v in item.items() if v is not None}

        table.put_item(Item=item)

    return {"statusCode": 200}
