<template>
  <div class="project-markdown-preview" v-html="renderedHtml" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import MarkdownIt from "markdown-it";

const props = defineProps<{
    content: string;
}>();

const markdown = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: false,
});

const renderedHtml = computed(() => markdown.render(props.content ?? ""));
</script>

<style scoped>
.project-markdown-preview {
  color: inherit;
  line-height: 1.72;
  word-break: break-word;
  font-size: 0.98rem;
}

.project-markdown-preview :deep(h1),
.project-markdown-preview :deep(h2),
.project-markdown-preview :deep(h3),
.project-markdown-preview :deep(h4) {
  margin: 0 0 12px;
  line-height: 1.35;
  font-weight: 700;
}

.project-markdown-preview :deep(p) {
  margin: 0 0 12px;
}

.project-markdown-preview :deep(ul),
.project-markdown-preview :deep(ol) {
  margin: 0 0 12px;
  padding-left: 22px;
}

.project-markdown-preview :deep(blockquote) {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-left: 3px solid color-mix(in srgb, var(--color-accent) 35%, white);
  border-radius: 0 12px 12px 0;
  background: #f7f8fa;
  color: #5b616d;
}

.project-markdown-preview :deep(code) {
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.06);
  font-size: 0.92em;
  font-family: "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
}

.project-markdown-preview :deep(pre) {
  margin: 0 0 12px;
  padding: 14px 16px;
  overflow: auto;
  border-radius: 14px;
  background: #1f2430;
  color: #eef2f7;
}

.project-markdown-preview :deep(pre code) {
  padding: 0;
  background: transparent;
}

.project-markdown-preview :deep(a) {
  color: var(--color-accent);
  text-decoration: none;
}

.project-markdown-preview :deep(a:hover) {
  text-decoration: underline;
}
</style>
