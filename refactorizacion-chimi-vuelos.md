# Guía de Refactorización: Optimización y Escalabilidad (Estilo PHP)

Este documento detalla el patrón de diseño implementado para optimizar la página de `chimi-vuelos`, transformando una carga pesada en el cliente a una arquitectura profesional gestionada por el servidor. Este patrón debe replicarse en otras secciones del sistema (Giros, Encomiendas, etc.) cuando el volumen de datos crezca.

---

## 🚀 1. El Concepto: "PHP-Style" en Next.js

El problema original era que el navegador descargaba **todos** los registros (miles) y luego los filtraba. Esto consume mucha RAM y satura la terminal con peticiones.
La refactorización implementa:

- **Paginación Real**: Solo se descargan 10, 20 o 50 registros por viaje.
- **Filtros en Base de Datos**: El servidor decide qué mostrar, no el navegador.
- **Combos de Datos**: Menos peticiones `POST` agrupando datos estáticos.

---

## 🛠 2. Cambios en las Server Actions (`manage-X.ts`)

### A. Función de Obtención Pagina (Sustituir `getAll`)

En lugar de traer un array simple, la función debe aceptar un objeto `Params` y devolver tanto los datos como el **conteo total**.

```typescript
export async function getItems(params: {
  page: number;
  pageSize: number;
  searchTerm?: string;
  // ... otros filtros
}) {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase.from("mi_tabla").select("*", { count: "exact" });

  if (params.searchTerm) {
    query = query.or(
      `campo.ilike.%${params.searchTerm}%,otro.ilike.%${params.searchTerm}%`,
    );
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  return { items: data, count: count || 0 };
}
```

### B. El "Super-Combo" Inicial

Para limpiar la terminal de peticiones `POST` innecesarias, agrupa todas las tablas auxiliares (clientes, sedes, etc.) en una sola función.

```typescript
export async function getInitialPageData() {
  const [tab1, tab2] = await Promise.all([getTabla1(), getTabla2()]);
  return { tab1, tab2 };
}
```

---

## 🖥 3. Cambios en la Página (`page.tsx`)

### A. Nuevos Estados Obligatorios

```typescript
const [items, setItems] = useState([]);
const [totalItems, setTotalItems] = useState(0); // Para saber el total real en DB
const [isLoading, setIsLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState(""); // El buscador real
```

### B. Implementación del Debounce (Vital para el Servidor)

No debemos preguntar a la DB por cada letra que el usuario escribe. Esperamos 500ms.

```typescript
useEffect(() => {
  const handler = setTimeout(() => {
    setDebouncedSearch(searchTerm);
    setCurrentPage(1); // Siempre volver a pág 1 al buscar
  }, 500);
  return () => clearTimeout(handler);
}, [searchTerm]);
```

### C. Carga de Datos Paralelizada

Usar `Promise.all` dentro de `loadData` para que las peticiones vuelen al mismo tiempo.

```typescript
const loadData = useCallback(async () => {
  setIsLoading(true);
  try {
    const [result, extraInfo] = await Promise.all([
      getItems({
        page: currentPage,
        pageSize: itemsPerPage,
        searchTerm: debouncedSearch,
      }),
      getExtraInfo(),
    ]);
    setItems(result.items);
    setTotalItems(result.count);
  } finally {
    setIsLoading(false);
  }
}, [currentPage, itemsPerPage, debouncedSearch]);
```

---

## ✨ 4. Experiencia de Usuario (UI/UX) Premium

### Indicador de Carga (Píldora Centrada)

Para que no se vea cortado ni rompa la tabla, el cargador debe estar **fuera** de la etiqueta `<table>`.

```tsx
<CardContent className="p-0 relative min-h-[400px]">
  {isLoading && (
    <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] z-40 flex items-center justify-center">
      <div className="bg-white border shadow-lg rounded-full px-5 py-2 flex items-center gap-3">
        <RefreshCw className="h-4 w-4 animate-spin text-chimipink" />
        <span>Actualizando...</span>
      </div>
    </div>
  )}
  <div className="overflow-auto">
    <table>...</table>
  </div>
</CardContent>
```

---

## 📈 5. Beneficios Obtenidos

1. **Escalabilidad**: El sistema funciona igual de rápido con 100 o con 100,000 registros.
2. **Orden**: La terminal de desarrollo ya no se llena de líneas `POST` infinitas.
3. **Control**: Al exportar a Excel o ver el pie de página, manejamos números reales de la base de datos.
