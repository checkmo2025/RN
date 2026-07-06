import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { colors, radius, spacing, typography } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

function formatLabel(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function combine(datePart: Date, timePart: Date): Date {
  return new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    timePart.getHours(),
    timePart.getMinutes(),
  );
}

/**
 * 기기 네이티브 날짜/시간 선택기.
 * - iOS: 모달 스피너(datetime) + 취소/완료
 * - Android: 네이티브 날짜 다이얼로그 → 시간 다이얼로그 순차 호출
 * value/onChange 는 기기 로컬 벽시계 기준 Date 를 사용한다.
 */
export function DateTimeField({ value, onChange, placeholder, minimumDate, style, disabled = false }: Props) {
  const { language, l } = useLanguage();
  const [iosVisible, setIosVisible] = useState(false);
  const [iosTemp, setIosTemp] = useState<Date | null>(null);

  const base = value ?? minimumDate ?? new Date();

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: base,
      mode: 'date',
      minimumDate,
      onChange: (event: DateTimePickerEvent, picked?: Date) => {
        if (event.type !== 'set' || !picked) return;
        DateTimePickerAndroid.open({
          value: picked,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent: DateTimePickerEvent, pickedTime?: Date) => {
            if (timeEvent.type !== 'set' || !pickedTime) return;
            onChange(combine(picked, pickedTime));
          },
        });
      },
    });
  };

  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      openAndroid();
      return;
    }
    setIosTemp(base);
    setIosVisible(true);
  };

  const confirmIos = () => {
    onChange(iosTemp ?? base);
    setIosVisible(false);
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.field,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
          style,
        ]}
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text style={value ? styles.valueText : styles.placeholderText} numberOfLines={1}>
          {value ? formatLabel(value) : (placeholder ?? l('날짜 선택'))}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={iosVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIosVisible(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setIosVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setIosVisible(false)} hitSlop={8}>
                <Text style={styles.headerCancel}>{l('취소')}</Text>
              </Pressable>
              <Pressable onPress={confirmIos} hitSlop={8}>
                <Text style={styles.headerDone}>{l('완료')}</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={iosTemp ?? base}
              mode="datetime"
              display="spinner"
              minimumDate={minimumDate}
              locale={language === 'en' ? 'en-US' : 'ko-KR'}
              themeVariant="light"
              textColor={colors.gray6}
              onChange={(_event: DateTimePickerEvent, picked?: Date) => {
                if (picked) setIosTemp(picked);
              }}
              style={styles.picker}
            />
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  valueText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  placeholderText: {
    ...typography.body1_3,
    color: colors.gray3,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
  },
  headerCancel: {
    ...typography.body1_2,
    color: colors.gray5,
  },
  headerDone: {
    ...typography.subhead3,
    color: colors.primary1,
  },
  picker: {
    height: 216,
    alignSelf: 'stretch',
    backgroundColor: colors.white,
  },
});
