import { forwardRef, useCallback, useRef } from 'react';
import {
  TextInput,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { showToast } from '../../utils/toast';

type FieldType =
  | 'text'
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
    overLimitMessage = '입력 가능한 길이를 초과했습니다.',
    onChangeText,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    secureTextEntry,
    ...rest
  },
  ref,
) {
  const exceededNotifiedRef = useRef(false);
  const typeOptions = FIELD_TYPE_OPTIONS[fieldType];

  const handleChangeText = useCallback(
    (nextText: string) => {
      if (
        enforceMaxLength &&
        typeof maxLength === 'number' &&
        maxLength >= 0 &&
        nextText.length > maxLength
      ) {
        const clampedText = nextText.slice(0, maxLength);
        if (!exceededNotifiedRef.current) {
          showToast(overLimitMessage);
          exceededNotifiedRef.current = true;
        }
        onChangeText(clampedText);
        return;
      }

      exceededNotifiedRef.current = false;
      onChangeText(nextText);
    },
    [enforceMaxLength, maxLength, onChangeText, overLimitMessage],
  );

  return (
    <TextInput
      ref={ref}
      onChangeText={handleChangeText}
      keyboardType={keyboardType ?? typeOptions.keyboardType}
      autoCapitalize={autoCapitalize ?? typeOptions.autoCapitalize}
      autoCorrect={autoCorrect ?? typeOptions.autoCorrect}
      secureTextEntry={secureTextEntry ?? typeOptions.secureTextEntry}
      {...rest}
    />
  );
});

