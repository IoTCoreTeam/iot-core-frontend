<template>
  <section
    :class="[
      'bg-white rounded border border-slate-200 overflow-hidden transition-all duration-200',
      padded ? 'text-xs' : '',
      props.scrollBody ? 'flex flex-col h-full min-h-0' : '',
    ]"
  >
    <header
      v-if="$slots.header"
      class="bg-slate-50 px-2 py-2 border-b border-gray-200 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
    >
      <slot name="header" />
    </header>

    <div
      :class="[
        'overflow-x-auto w-full',
        props.scrollBody ? 'flex-1 overflow-y-auto min-h-0' : '',
      ]"
    >
      <table class="w-full">
        <thead>
          <slot name="head" />
        </thead>

        <tbody>
          <tr v-if="props.isLoading">
            <td :colspan="props.columns" class="text-center py-12">
              <slot name="loading">
                <LoadingState :message="props.loadingText" />
              </slot>
            </td>
          </tr>
          <template v-else>
            <slot v-if="props.hasData" />
            <tr v-else>
              <td :colspan="props.columns" class="py-6 text-center text-gray-400 text-xs">
                <slot name="empty">No data found.</slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div
      v-if="props.pagination"
      class="px-2 py-1 border-t border-gray-200 bg-slate-50 flex items-center justify-between"
    >
      <div class="text-gray-500 text-xs">
        {{ props.pagination.page }}/{{ props.pagination.lastPage }} of
        {{ props.pagination.total }} items
      </div>
      <div class="flex items-center gap-1">
        <select
          class="border border-gray-300 rounded py-0.5 px-0.5 bg-white text-xs"
          :value="selectValue"
          @change="handlePerPageChange"
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="15">15</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="all">All</option>
        </select>

        <button
          class="px-1 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 text-xs"
          :disabled="props.pagination.page <= 1"
          @click="emit('prev-page')"
        >
          <BootstrapIcon name="chevron-left" class="w-3 h-3" />
        </button>

        <button
          class="px-1 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 text-xs"
          :disabled="props.pagination.page >= props.pagination.lastPage"
          @click="emit('next-page')"
        >
          <BootstrapIcon name="chevron-right" class="w-3 h-3" />
        </button>
      </div>
    </div>

    <footer
      v-if="$slots.footer"
      class="px-2 py-1 border-t border-gray-100 text-[11px] text-gray-400 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import LoadingState from "@/components/common/LoadingState.vue";

interface PaginationState {
  page: number;
  perPage: number;
  lastPage: number;
  total: number;
}

const props = withDefaults(
  defineProps<{
    isLoading: boolean;
    pagination?: PaginationState | null;
    hasData?: boolean;
    columns?: number;
    loadingText?: string;
    elevated?: boolean;
    padded?: boolean;
    scrollBody?: boolean;
  }>(),
  {
    hasData: true,
    columns: 1,
    loadingText: "Loading data...",
    elevated: true,
    padded: true,
    scrollBody: false,
  }
);

const emit = defineEmits<{
  (e: "prev-page"): void;
  (e: "next-page"): void;
  (e: "change-per-page", value: number): void;
}>();

const selectValue = computed(() => {
  const pagination = props.pagination;
  if (!pagination) {
    return "5";
  }
  if (pagination.total > 0 && pagination.perPage >= pagination.total) {
    return "all";
  }
  return String(pagination.perPage);
});

function handlePerPageChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const value = target.value;
  if (value === "all") {
    const total = props.pagination?.total ?? 0;
    emit("change-per-page", total > 0 ? total : Number.MAX_SAFE_INTEGER);
    return;
  }
  emit("change-per-page", Number(value));
}
</script>
