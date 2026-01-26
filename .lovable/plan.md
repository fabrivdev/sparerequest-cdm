
# Plan: Delegación de Facturación y Vista Global de Pedidos

## Resumen
Implementar dos funcionalidades principales:
1. **Delegación de Facturación**: Un usuario puede asignar a otro usuario para que edite/facture sus pedidos entregados
2. **Vista Global de Pedidos**: Todos los usuarios pueden ver pedidos de todas las sucursales, con filtro predeterminado a su propia sucursal

---

## Parte 1: Delegación de Facturación

### Concepto
Un usuario puede delegar la gestión de facturación de sus pedidos entregados a otro usuario. Esto aparecerá como una opción adicional en la vista "Entregados".

### Base de Datos

**Nueva tabla: `invoice_delegates`**
```sql
CREATE TABLE public.invoice_delegates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,        -- Usuario que delega
  delegate_user_id UUID NOT NULL,     -- Usuario delegado
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(owner_user_id, delegate_user_id)
);

-- RLS Policies
ALTER TABLE invoice_delegates ENABLE ROW LEVEL SECURITY;

-- El dueño puede ver/crear/eliminar sus delegaciones
CREATE POLICY "Users can manage their own delegates"
  ON invoice_delegates FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- El delegado puede ver las delegaciones donde está asignado
CREATE POLICY "Delegates can view their assignments"
  ON invoice_delegates FOR SELECT
  USING (auth.uid() = delegate_user_id);
```

### Flujo de Delegación

```text
Vista Entregados
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Mis Entregados ▼]  [Gestionar Delegados]                │
│                                                             │
│  Opciones del dropdown:                                     │
│  ├── Mis Entregados (predeterminado)                       │
│  ├── ────────────────                                       │
│  ├── Ver: Juan Pérez (delegado)                            │
│  └── Ver: María García (delegado)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Interfaz de Gestión de Delegados

Un modal donde el usuario puede:
- Ver lista de usuarios delegados actuales
- Agregar nuevo delegado (seleccionando de una lista de usuarios)
- Eliminar delegado existente

---

## Parte 2: Vista Global de Pedidos con Filtro de Sucursal

### Concepto
Actualmente los usuarios solo ven pedidos de su sucursal. Ahora podrán ver pedidos de TODAS las sucursales, pero con su sucursal como filtro predeterminado.

### Cambios en RLS
La política actual ya permite ver pedidos de la sucursal del usuario. Necesitamos agregar una política que permita ver TODOS los pedidos a usuarios autenticados:

```sql
-- Actualizar política de SELECT en orders
CREATE POLICY "Users can view all orders"
  ON orders FOR SELECT
  USING (true);  -- Cualquier usuario autenticado puede ver todos los pedidos

-- Mantener políticas existentes para INSERT, UPDATE, DELETE
-- (solo pueden modificar sus propios pedidos)
```

### Cambios en la UI

**ViewToggle actualizado:**
```text
┌──────────────────────────────────────────────────────────────┐
│ [Mis Pedidos] [Pedidos Sucursal ▼] [Entregados]             │
│                   └── Dropdown con todas las sucursales     │
│                       ✓ SANTA RITA (mi sucursal)            │
│                         CAMPO 9                              │
│                         ITAPUA                               │
│                         KATUETE                              │
│                         ...                                  │
│                         TODAS LAS SUCURSALES                 │
└──────────────────────────────────────────────────────────────┘
```

### Cambios en Dashboard

1. El estado `view` ahora incluirá la sucursal seleccionada cuando es `branch-orders`
2. Nuevo estado para `selectedBranch` (predeterminado: sucursal del usuario)
3. Fetch de pedidos ahora puede traer por cualquier sucursal o todas

---

## Archivos a Modificar/Crear

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| **Migración SQL** | Crear | Nueva tabla `invoice_delegates` + actualizar RLS de `orders` |
| `src/components/ViewToggle.tsx` | Modificar | Agregar dropdown de sucursales en "Pedidos Sucursal" |
| `src/pages/Dashboard.tsx` | Modificar | Lógica para fetch de pedidos por sucursal variable |
| `src/components/DeliveredOrdersView.tsx` | Modificar | Agregar selector de delegados y vista de pedidos delegados |
| `src/components/DelegateManager.tsx` | **Nuevo** | Modal para gestionar delegados |
| `src/components/DelegateSelector.tsx` | **Nuevo** | Dropdown para seleccionar vista de entregados |

---

## Detalles Técnicos

### Estructura de Datos para Delegación

```typescript
interface InvoiceDelegate {
  id: string;
  owner_user_id: string;
  delegate_user_id: string;
  created_at: string;
  is_active: boolean;
}

// Con información del usuario para mostrar
interface DelegateWithProfile extends InvoiceDelegate {
  owner_name?: string;
  delegate_name?: string;
}
```

### Lógica de Vista Entregados con Delegación

```typescript
// Estados nuevos en DeliveredOrdersView
const [viewMode, setViewMode] = useState<'own' | 'delegated'>('own');
const [selectedDelegator, setSelectedDelegator] = useState<string | null>(null);
const [delegators, setDelegators] = useState<DelegateWithProfile[]>([]);

// Fetch de pedidos según modo
const fetchDeliveredOrders = async () => {
  if (viewMode === 'own') {
    // Fetch pedidos del usuario actual
    return orders.filter(o => o.status === 'entregado');
  } else if (selectedDelegator) {
    // Fetch pedidos del usuario que delegó
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', selectedDelegator)
      .eq('status', 'entregado');
    return data;
  }
};
```

### ViewToggle con Selector de Sucursal

```typescript
interface ViewToggleProps {
  view: 'my-orders' | 'branch-orders' | 'delivered';
  onViewChange: (view: 'my-orders' | 'branch-orders' | 'delivered') => void;
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  userBranch: string;
  branches: { name: string; is_active: boolean }[];
}
```

---

## Flujo de Usuario

### Delegación de Facturación
1. Usuario A va a "Entregados"
2. Click en "Gestionar Delegados"
3. Selecciona Usuario B de la lista
4. Usuario B ahora ve en su dropdown de Entregados la opción "Ver: Usuario A"
5. Usuario B puede ver y facturar los pedidos entregados de Usuario A

### Vista de Todas las Sucursales
1. Usuario entra al dashboard
2. Por defecto ve "Pedidos Sucursal" con su sucursal filtrada
3. Puede hacer click en el dropdown y seleccionar otra sucursal
4. O seleccionar "Todas" para ver pedidos de todas las sucursales
5. Los pedidos de otras sucursales son de solo lectura

---

## Consideraciones de Seguridad

1. **RLS para delegación**: Solo el dueño puede crear/eliminar delegados
2. **RLS para orders**: Al actualizar RLS, mantener que UPDATE/DELETE solo funcione para pedidos propios
3. **Validación en UI**: Si está viendo pedidos delegados, puede facturar pero no otras acciones

