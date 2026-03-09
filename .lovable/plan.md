

## Problema

El código fuente ya tiene `.range(0, 10000)` tanto en el Dashboard como en la edge function `admin-orders`. Sin embargo, el usuario reporta que sigue viendo 1000 pedidos, lo que indica que **la edge function desplegada no coincide con el código fuente actual**. Es necesario forzar un redespliegue.

## Plan

1. **Redesplegar la edge function `admin-orders`** — Forzar el despliegue para que el código con `.range(0, 10000)` esté activo en producción.

2. **Verificar que no haya otros puntos de consulta sin el rango expandido** — Revisar `DeliveredOrdersView.tsx` y cualquier otro componente que consulte orders para asegurar que todos usen `.range(0, 10000)`.

No se requieren cambios de código ya que las modificaciones están en su lugar. El problema es puramente de despliegue de la función backend.

