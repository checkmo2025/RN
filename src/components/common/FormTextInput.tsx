import { forwardRef, useCallback, useEffect, useRef } from 'react';
import {
  TextInput,
  type KeyboardTypeOptions,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  type TextInputProps,
} from 'react-native';

import { showToast } from '../../utils/toast';
import { useLanguage } from '../../contexts/LanguageContext';

type FieldType =
  | 'text'
  | 'identifier'
  | 'nickname'
  | 'name'
  | 'email'
  | 'phone'
  | 'number'
  | 'password'
  | 'url'
  | 'search';

type FieldTypeOptions = {
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
};

const FIELD_TYPE_OPTIONS: Record<FieldType, FieldTypeOptions> = {
  text: {},
  identifier: {
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  nickname: {
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  name: {
    autoCapitalize: 'words',
    autoCorrect: false,
  },
  email: {
    autoCapitalize: 'none',
    autoCorrect: false,
    keyboardType: 'email-address',
  },
  phone: {
    keyboardType: 'phone-pad',
  },
  number: {
    keyboardType: 'number-pad',
  },
  password: {
    autoCapitalize: 'none',
    autoCorrect: false,
    secureTextEntry: true,
  },
  url: {
    autoCapitalize: 'none',
    autoCorrect: false,
    keyboardType: 'url',
  },
  search: {
    autoCapitalize: 'none',
    autoCorrect: false,
  },
};

type Props = Omit<TextInputProps, 'onChangeText' | 'maxLength'> & {
  onChangeText: (text: string) => void;
  maxLength?: number;
  fieldType?: FieldType;
  enforceMaxLength?: boolean;
  overLimitMessage?: string;
};

export const FormTextInput = forwardRef<TextInput, Props>(function FormTextInput(
  {
    fieldType = 'text',
    maxLength,
    enforceMaxLength = true,
    overLimitMessage,
    onChangeText,
    onKeyPress,
    value,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    secureTextEntry,
    multiline,
    scrollEnabled,
    textAlignVertical,
    placeholder,
    ...rest
  },
  ref,
) {
  const { l } = useLanguage();
  const exceededNotifiedRef = useRef(false);
  const typeOptions = FIELD_TYPE_OPTIONS[fieldType];
  const resolvedOverLimitMessage = overLimitMessage ?? l('입력 가능한 길이를 초과했습니다.');

  const notifyOverLimit = useCallback(() => {
    if (exceededNotifiedRef.current) return;
    showToast(resolvedOverLimitMessage);
    exceededNotifiedRef.current = true;
  }, [resolvedOverLimitMessage]);

  useEffect(() => {
    if (
      enforceMaxLength &&
      typeof maxLength === 'number' &&
      maxLength >= 0 &&
      typeof value === 'string' &&
      value.length < maxLength
    ) {
      exceededNotifiedRef.current = false;
    }
  }, [enforceMaxLength, maxLength, value]);

  const handleChangeText = useCallback(
    (nextText: string) => {
      if (
        enforceMaxLength &&
        typeof maxLength === 'number' &&
        maxLength >= 0 &&
        nextText.length > maxLength
      ) {
        const clampedText = nextText.slice(0, maxLength);
        notifyOverLimit();
        onChangeText(clampedText);
        return;
      }

      exceededNotifiedRef.current = false;
      onChangeText(nextText);
    },
    [enforceMaxLength, maxLength, notifyOverLimit, onChangeText],
  );

  const handleKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      onKeyPress?.(event);
      if (
        !enforceMaxLength ||
        typeof maxLength !== 'number' ||
        maxLength < 0 ||
        typeof value !== 'string' ||
        value.length < maxLength ||
        event.nativeEvent.key === 'Backspace'
      ) {
        return;
      }
      notifyOverLimit();
    },
    [enforceMaxLength, maxLength, notifyOverLimit, onKeyPress, value],
  );

  return (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={handleChangeText}
      onKeyPress={handleKeyPress}
      keyboardType={keyboardType ?? typeOptions.keyboardType}
      autoCapitalize={autoCapitalize ?? typeOptions.autoCapitalize}
      autoCorrect={autoCorrect ?? typeOptions.autoCorrect}
      secureTextEntry={secureTextEntry ?? typeOptions.secureTextEntry}
      multiline={multiline}
      scrollEnabled={scrollEnabled ?? (multiline ? true : undefined)}
      textAlignVertical={textAlignVertical ?? (multiline ? 'top' : undefined)}
      placeholder={placeholder ? l(placeholder) : placeholder}
      {...rest}
    />
  );
});
