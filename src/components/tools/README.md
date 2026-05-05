# 🧰 Carpeta Centralizada de Herramientas

Esta carpeta contiene todas las herramientas reutilizables de la aplicación.

## ¿Por qué centralizar?

- **Evita duplicación**: Las mismas herramientas se usan en Admin2, Usuario y Editor
- **Mantenimiento**: Cambios en un solo lugar, se reflejan en todos lados
- **Consistencia**: Mismo diseño y comportamiento en toda la app

## 📁 Estructura

```
tools/
├── index.js              # Exporta todas las herramientas
├── GeneradorQR.jsx       # Genera códigos QR
├── HerramientasExternas.jsx  # Links a utilidades web
├── CalculadoraEdad.jsx   # Calcula edad exacta
├── ConversorUnidades.jsx # Convierte unidades
├── GeneradorContraseña.jsx # Genera passwords seguras
├── NotasRapidas.jsx      # Bloc de notas temporal
└── README.md             # Esta documentación
```

## 🚀 Cómo usar

### 1. Importar herramientas en un componente

```jsx
import { 
  GeneradorQR, 
  CalculadoraEdad, 
  NotasRapidas 
} from '../tools';

function MiComponente() {
  return (
    <div>
      <GeneradorQR />
      <CalculadoraEdad />
    </div>
  );
}
```

### 2. Agregar una nueva herramienta

1. Crear archivo `.jsx` con la herramienta
2. Exportar en `index.js`:
   ```js
   export { default as MiNuevaHerramienta } from './MiNuevaHerramienta';
   ```
3. Agregar a `TOOLS_LIST` para documentación
4. Importar en `UtilidadesSection.jsx` donde se necesite

## 🔧 Herramientas disponibles

| Herramienta | Descripción | Roles |
|-------------|-------------|-------|
| `GeneradorQR` | Códigos QR desde texto/URL | Todos |
| `HerramientasExternas` | Links a iLovePDF, Canva, etc. | Todos |
| `CalculadoraEdad` | Calcula edad exacta | Todos |
| `ConversorUnidades` | Longitud, peso, temperatura | Todos |
| `GeneradorContraseña` | Passwords seguras | Admin, Admin2 |
| `NotasRapidas` | Notas temporales (sessionStorage) | Todos |

## 📝 Notas

- Las herramientas usan diseño consistente con la app (colores RBG)
- Cada herramienta es autónoma (sin dependencias externas)
- Se guardan en `sessionStorage` si es necesario persistir temporalmente
