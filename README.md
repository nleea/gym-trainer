# FitTrainer Pro - Aplicación de Gestión de Entrenamiento Personal

Aplicación web completa desarrollada con **Vue 3**, **TypeScript** y **Pinia** para la gestión integral de entrenadores personales y sus clientes.

## Características Principales

### Para Entrenadores
- **Dashboard completo** con estadísticas de clientes
- **Gestión de clientes** con perfiles detallados
- **Creación de planes de entrenamiento** personalizados con ejercicios, series, repeticiones y notas
- **Planes nutricionales** con objetivos calóricos y macros
- **Reportes y análisis** del progreso de los clientes
- **Visualización de progreso** con gráficos y métricas

### Para Clientes
- **Dashboard personalizado** con resumen diario
- **Visualización de planes** de entrenamiento y nutrición
- **Registro de entrenamientos** con detalles de ejercicios realizados
- **Seguimiento de progreso** con gráficos de peso y estadísticas
- **Registro de comidas** y seguimiento nutricional
- **Historial completo** de entrenamientos

## Tecnologías Utilizadas

- **Vue 3** (Composition API con `<script setup>`)
- **TypeScript** para tipado estático
- **Pinia** para gestión de estado
- **Vue Router** para navegación
- **Vite** como bundler
- **TailwindCSS v4** para estilos
- **Diseño responsive** mobile-first

## Estructura del Proyecto

```
/vue
  /components     # Componentes reutilizables
  /layouts        # Layouts para Auth, Trainer y Client
  /router         # Configuración de rutas
  /stores         # Stores de Pinia (auth, data)
  /types          # Definiciones de tipos TypeScript
  /views          # Vistas organizadas por rol
    /auth         # Login y registro
    /trainer      # Vistas del entrenador
    /client       # Vistas del cliente
  App.vue         # Componente raíz
  main.ts         # Punto de entrada
```

## Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de producción
npm run preview
```

## Rutas Principales

### Autenticación
- `/login` - Inicio de sesión
- `/register` - Registro de usuarios

### Entrenador
- `/trainer/dashboard` - Dashboard principal
- `/trainer/clients` - Lista de clientes
- `/trainer/client/:id` - Perfil del cliente
- `/trainer/create-training-plan/:id` - Crear plan de entrenamiento
- `/trainer/create-nutrition-plan/:id` - Crear plan nutricional
- `/trainer/reports` - Reportes y análisis
- `/trainer/settings` - Configuración

### Cliente
- `/client/dashboard` - Dashboard del cliente
- `/client/training` - Plan de entrenamiento
- `/client/nutrition` - Plan nutricional
- `/client/log-workout` - Registrar entrenamiento
- `/client/progress` - Ver progreso
- `/client/settings` - Configuración

## Características del Código

- **Componentes con TypeScript** para mayor seguridad de tipos
- **Reactive state management** con Pinia
- **Route guards** para protección de rutas
- **Diseño modular** y escalable
- **Datos de ejemplo** para demostración (listos para conectar a backend real)

## Siguiente Paso: Backend

Esta aplicación está lista para conectarse a un backend real. Los stores de Pinia están preparados para realizar llamadas API. Puedes integrar:

- **Supabase** para auth y base de datos
- **Firebase** para realtime updates
- **Custom API** con Node.js/Express o similar

## Diseño

La aplicación utiliza un sistema de diseño moderno con:
- Colores fitness energéticos pero profesionales
- Verde vibrante (#55C57A) como color primario
- Amarillo/naranja (#FFB84D) como acento
- Diseño limpio y espaciado generoso
- Componentes con sombras sutiles y bordes redondeados

## Licencia
