import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics } from '@opentelemetry/api';
import type { Meter } from '@opentelemetry/api';

// Configurar Prometheus Exporter
const prometheusExporter = new PrometheusExporter({
  port: 9464,
  endpoint: '/metrics',
});

// Crear SDK con auto-instrumentaciones
const sdk = new NodeSDK({
  metricReader: prometheusExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
  ],
});

// Iniciar SDK
sdk.start();

// Métricas personalizadas RED
const meter = metrics.getMeter('alentapp-api');

export function createREDMetrics(meter: Meter) {
  const requestCounter = meter.createCounter('http.requests.total', {
    description: 'Contador acumulativo de requests HTTP; usado para calcular la tasa (Rate) via rate() en PromQL',
  });
  const errorCounter = meter.createCounter('http.requests.errors', {
    description: 'Total de errores HTTP (4xx/5xx)',
  });
  const requestDuration = meter.createHistogram('http.request.duration', {
    description: 'Duración de requests en ms',
    unit: 'ms',
  });
  return { requestCounter, errorCounter, requestDuration };
}

export { sdk, meter };