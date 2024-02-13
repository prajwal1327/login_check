import requests
from datetime import datetime
from google.cloud import monitoring_v3

def check_status(request):
    url = "YOUR_APPLICATION_URL"
    start_time = datetime.now()
    response = requests.get(url)
    end_time = datetime.now()
    load_time = (end_time - start_time).total_seconds() * 1000  # Convert to milliseconds
    status_code = response.status_code

    # Save results to Cloud Monitoring
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{os.getenv('GCP_PROJECT')}"
    series = client.time_series_path(project_name, "global", "custom.googleapis.com/website_status_code")
    point = {
        "interval": {
            "start_time": {"seconds": int(start_time.timestamp())},
            "end_time": {"seconds": int(end_time.timestamp())}
        },
        "value": {"int64_value": status_code}
    }
    client.create_time_series(request={"name": series, "time_series": [point]})

    series = client.time_series_path(project_name, "global", "custom.googleapis.com/page_load_time")
    point = {
        "interval": {
            "start_time": {"seconds": int(start_time.timestamp())},
            "end_time": {"seconds": int(end_time.timestamp())}
        },
        "value": {"double_value": load_time}
    }
    client.create_time_series(request={"name": series, "time_series": [point]})

    return f"Status code: {status_code}, Page load time: {load_time} ms"

