import { Alert, Keyboard, type AlertButton, type AlertOptions } from 'react-native';

const ALERT_AFTER_KEYBOARD_DISMISS_DELAY_MS = 260;

export function showAlertAfterKeyboardDismiss(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  Keyboard.dismiss();
  setTimeout(() => {
    Alert.alert(title, message, buttons, options);
  }, ALERT_AFTER_KEYBOARD_DISMISS_DELAY_MS);
}
