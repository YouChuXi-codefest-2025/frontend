<template>
  <button
    class="absolute bottom-32 right-4 w-14 h-14 rounded-full bg-white border-none shadow-md cursor-pointer flex items-center justify-center text-[#475259] transition-all duration-200 z-50 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="{ 'bg-[#5AB4C5] text-white': isLocating }"
    :disabled="isLocating"
    @click="$emit('click')"
  >
    <!-- 定位圖示 -->
    <svg v-if="!isLocating" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-locate-fixed-icon lucide-locate-fixed"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>
    <!-- 載入動畫 -->
    <svg
      v-else
      class="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  isLocating?: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>
