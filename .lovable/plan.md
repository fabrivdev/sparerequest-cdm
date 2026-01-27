

# Plan: Corregir Políticas RLS de Delegación de Facturación

## Problema Identificado
Las políticas RLS en la tabla `invoice_delegates` fueron creadas como **RESTRICTIVE** en lugar de **PERMISSIVE**, lo que causa que las consultas fallen cuando un usuario delegado intenta ver sus asignaciones.

### Comportamiento Actual
- "Usuario de prueba" es delegado de "Fabrizio Vega"
- Cuando "Usuario de prueba" consulta la tabla `invoice_delegates`, las dos políticas se evalúan con AND:
  - `auth.uid() = owner_user_id` → FALSO (no es el dueño)
  - `auth.uid() = delegate_user_id` → VERDADERO (es el delegado)
  - Resultado: FALSO AND VERDADERO = **FALSO** → No puede ver nada

### Comportamiento Esperado
Las políticas deberían combinarse con OR (PERMISSIVE):
- Si eres el owner O el delegate, puedes ver el registro

---

## Solución

### Migración SQL

Eliminar las políticas actuales y recrearlas explícitamente como PERMISSIVE:

```sql
-- Eliminar políticas restrictivas actuales
DROP POLICY IF EXISTS "Users can manage their own delegates" ON public.invoice_delegates;
DROP POLICY IF EXISTS "Delegates can view their assignments" ON public.invoice_delegates;

-- Recrear política para owners (ALL operations) - PERMISSIVE
CREATE POLICY "Users can manage their own delegates"
  ON public.invoice_delegates 
  AS PERMISSIVE
  FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Recrear política para delegates (SELECT only) - PERMISSIVE  
CREATE POLICY "Delegates can view their assignments"
  ON public.invoice_delegates 
  AS PERMISSIVE
  FOR SELECT
  USING (auth.uid() = delegate_user_id);
```

---

## Archivos a Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| Nueva migración SQL | Crear | Corregir políticas RLS de `invoice_delegates` |

---

## Verificación Post-Fix

Una vez aplicada la migración:
1. "Usuario de prueba" inicia sesión
2. Va a la vista "Entregados"
3. En el dropdown debería aparecer "Pedidos Delegados" con "Fabrizio Vega"
4. Al seleccionarlo, debería ver los pedidos entregados de Fabrizio

---

## Impacto
- Sin cambios en el código frontend
- Solo corrección de políticas de base de datos
- No afecta otras funcionalidades existentes

