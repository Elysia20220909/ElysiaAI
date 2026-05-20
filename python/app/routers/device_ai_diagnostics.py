from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix='/ai/devices', tags=['device-ai'])


class DeviceTelemetry(BaseModel):
    name: str
    cpu_temp: float | None = None
    gpu_temp: float | None = None
    disk_free_gb: float | None = None
    disk_total_gb: float | None = None
    memory_usage_percent: float | None = None


@router.post('/diagnose')
def diagnose_device(payload: DeviceTelemetry):
    findings: list[str] = []
    severity = 'nominal'

    if payload.cpu_temp is not None:
        if payload.cpu_temp >= 85:
            severity = 'critical'
            findings.append('CPU temperature exceeds safe operating threshold.')
        elif payload.cpu_temp >= 75:
            severity = 'warning'
            findings.append('CPU temperature is elevated.')

    if (
        payload.disk_free_gb is not None
        and payload.disk_total_gb is not None
        and payload.disk_total_gb > 0
    ):
        free_percent = (payload.disk_free_gb / payload.disk_total_gb) * 100

        if free_percent <= 5:
            severity = 'critical'
            findings.append('SSD free capacity is critically low.')
        elif free_percent <= 12:
            if severity != 'critical':
                severity = 'warning'
            findings.append('SSD free capacity is approaching maintenance threshold.')

    recommendations = {
        'nominal': [
            'Continue passive monitoring.',
            'Generate a daily health snapshot.',
        ],
        'warning': [
            'Schedule maintenance window.',
            'Check airflow and running background processes.',
            'Review storage cleanup candidates.',
        ],
        'critical': [
            'Reduce workload immediately.',
            'Back up critical data.',
            'Inspect cooling and storage health before further operation.',
        ],
    }

    return {
        'device': payload.name,
        'severity': severity,
        'findings': findings,
        'recommendations': recommendations[severity],
        'generated_by': 'ElysiaAI Local Diagnostic Kernel',
    }
