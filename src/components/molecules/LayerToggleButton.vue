<template>
  <button
    class="absolute top-4 right-4 w-12 h-12 rounded-full bg-white border-none shadow-md cursor-pointer flex items-center justify-center text-[#475259] transition-all duration-200 z-50 hover:shadow-lg hover:scale-105"
    :class="{ 'bg-[#5AB4C5] text-white': active }"
    @click="$emit('click')"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  </button>
  
</template>

<script setup lang="ts">
defineProps<{ active?: boolean }>()
defineEmits<{ (e: 'click'): void }>()
</script>
