// src/services/analyticsService.js
const analyticsRepository = require('../repositories/analyticsRepository');

class AnalyticsService {
  async getDashboardMetrics(localId, fechaInicio, fechaFin) {
    // Definir rango por defecto: últimos 30 días si no se especifican
    const hasta = fechaFin ? new Date(fechaFin) : new Date();
    const desde = fechaInicio ? new Date(fechaInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [resumen, pagos, productosTop, tiempos] = await Promise.all([
      analyticsRepository.getSalesSummary(localId, desde, hasta),
      analyticsRepository.getPaymentMethodBreakdown(localId, desde, hasta),
      analyticsRepository.getTopProducts(localId, desde, hasta),
      analyticsRepository.getOperationalTimes(localId, desde, hasta)
    ]);

    return {
      rangoFechas: { desde, hasta },
      resumenVentas: {
        totalPedidos: Number(resumen.total_pedidos),
        ingresosTotales: Number(resumen.ingresos_totales),
        ticketPromedio: Number(Number(resumen.ticket_promedio).toFixed(2))
      },
      desglosePagos: pagos.map(p => ({
        metodo: p.metodo_pago,
        cantidad: Number(p.cantidad_transacciones),
        montoTotal: Number(p.total_monto)
      })),
      productosMasVendidos: productosTop.map(prod => ({
        productoId: prod.producto_id,
        nombre: prod.nombre,
        unidadesVendidas: Number(prod.total_unidades_vendidas),
        totalRecaudado: Number(prod.total_recaudado)
      })),
      tiemposOperativos: {
        tiempoPromedioEntregaMinutos: Number(tiempos.tiempo_promedio_total_minutos || 0)
      }
    };
  }
}

module.exports = new AnalyticsService();