import { message } from "ant-design-vue";

export default defineNuxtPlugin(() => {
  message.config({
    zIndex: 100000,
  });
});
