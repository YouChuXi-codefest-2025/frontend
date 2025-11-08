<script setup lang="ts">
import type { FilterType, FilterButton } from '@/types/mapData'

interface Props {
  filters: FilterButton[]
  activeFilter: FilterType | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectFilter: [filter: FilterType]
}>()

const handleFilterClick = (filterId: FilterType) => {
  emit('selectFilter', filterId)
}
</script>

<template>
  <!-- 以絕對定位放在左上，right-20 預留右上圖層按鈕空間。z-50 與其他抽屜/按鈕一致方便管理層級 -->
  <div class="absolute top-4 left-4 right-20 z-40 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="group" aria-label="資料篩選">
    <button
      v-for="filter in filters"
      :key="filter.id"
      class="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5AB4C5]/50"
      :class="[
        props.activeFilter === filter.id
          ? 'bg-[#5AB4C5] text-white shadow-md'
          : 'bg-white text-[#475259] border border-[#E3E7E9] hover:border-[#5AB4C5] hover:text-[#5AB4C5]'
      ]"
      :aria-pressed="props.activeFilter === filter.id"
      type="button"
      @click="handleFilterClick(filter.id)"
    >
      {{ filter.label }}
    </button>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>

