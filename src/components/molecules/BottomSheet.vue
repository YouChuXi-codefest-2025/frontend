<template>
  <transition name="bottom-sheet">
    <div
      v-if="isShow"
      class="fixed z-50 top-0 left-0 w-full h-full bg-black/50 flex items-end transition-opacity duration-300"
      @click="handleMaskClick"
    >
      <div
        class="w-full bg-white rounded-t-[20px] shadow-[0_-2px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 max-h-[85vh] flex flex-col"
        @click.stop
      >
        <div class="py-3 flex justify-center items-center">
          <div class="w-10 h-1 bg-gray-300 rounded-sm"></div>
        </div>
        <div class="px-6 pb-8 overflow-y-auto">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
const props = defineProps({
  isShow: {
    type: Boolean,
    default: false
  },
  closeOnMaskClick: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:isShow', 'close'])

const handleMaskClick = () => {
  if (props.closeOnMaskClick) {
    emit('update:isShow', false)
    emit('close')
  }
}
</script>

<style scoped>
/* Transition animations */
.bottom-sheet-enter-active,
.bottom-sheet-leave-active {
  transition: opacity 0.3s ease;
}

.bottom-sheet-enter-from,
.bottom-sheet-leave-to {
  opacity: 0;
}

.bottom-sheet-enter-active > div {
  transition: transform 0.3s ease;
}

.bottom-sheet-enter-from > div {
  transform: translateY(100%);
}

.bottom-sheet-leave-to > div {
  transform: translateY(100%);
}
</style>
