import Toast, { type ToastShowParams } from "react-native-toast-message";

const DEFAULTS: Pick<ToastShowParams, "position" | "visibilityTime"> &
  Partial<ToastShowParams> = {
  position: "top",
  topOffset: 56,
  visibilityTime: 4000,
};

/** All app toasts use the same placement and timing; pass overrides only when needed. */
export function showAppToast(params: ToastShowParams) {
  Toast.show({ ...DEFAULTS, ...params });
}
