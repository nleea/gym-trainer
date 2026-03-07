<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-background flex">
    <!-- Left Panel - Branding -->
    <div class="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground flex-col justify-between p-12">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="text-2xl font-bold">FitCoach</span>
        </div>
      </div>
      
      <div class="space-y-6">
        <h1 class="text-4xl font-bold leading-tight text-balance">
          Tu plataforma para gestionar entrenamientos y clientes
        </h1>
        <p class="text-sidebar-foreground/70 text-lg">
          Controla asistencia, planes de entrenamiento, nutrición y progreso de tus clientes en un solo lugar.
        </p>
      </div>
      
      <div class="flex items-center gap-8">
        <div>
          <div class="text-3xl font-bold text-primary">500+</div>
          <div class="text-sidebar-foreground/60 text-sm">Entrenadores activos</div>
        </div>
        <div>
          <div class="text-3xl font-bold text-primary">10k+</div>
          <div class="text-sidebar-foreground/60 text-sm">Clientes gestionados</div>
        </div>
        <div>
          <div class="text-3xl font-bold text-primary">98%</div>
          <div class="text-sidebar-foreground/60 text-sm">Satisfacción</div>
        </div>
      </div>
    </div>
    
    <!-- Right Panel - Form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
      <div class="w-[90%] max-w-md">
        <!-- Mobile Logo -->
        <div class="lg:hidden flex items-center gap-3 mb-8 justify-center">
          <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="text-2xl font-bold text-foreground">FitCoach</span>
        </div>
        
        <RouterView />
      </div>
    </div>
  </div>
</template>
